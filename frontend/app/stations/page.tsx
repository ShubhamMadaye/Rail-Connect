'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  MapPin, Train, Search, ArrowRight, ChevronRight, 
  Loader2, Info, Clock, ArrowLeft, RefreshCw, Play, Pause, ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';
import { trainsAPI } from '@/lib/api';
import toast from 'react-hot-toast';

const TYPE_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  Rajdhani:  { text: '#FCD34D', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)' },
  Shatabdi:  { text: '#818cf8', bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.25)' },
  Express:   { text: '#60a5fa', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.25)' },
  Superfast: { text: '#c084fc', bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.25)' },
  Duronto:   { text: '#f472b6', bg: 'rgba(236,72,153,0.1)', border: 'rgba(236,72,153,0.25)' },
  Local:     { text: '#34d399', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)' },
};

const getTypeStyle = (type: string) =>
  TYPE_COLORS[type] || { text: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)' };

// Helper to add minutes to HH:MM format
function addMinutesToTime(timeStr: string, minutes: number): string {
  if (!timeStr) return '—';
  const [h, m] = timeStr.split(':').map(Number);
  let totalMins = h * 60 + m + minutes;
  totalMins = (totalMins + 1440) % 1440; // wrap around 24h
  const hrs = Math.floor(totalMins / 60);
  const mns = totalMins % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mns).padStart(2, '0')}`;
}

// Helper to get time difference in minutes from timeA to timeB
function getTimeDifferenceMins(timeA: string, timeB: string): number {
  if (!timeA || !timeB) return 0;
  const [hA, mA] = timeA.split(':').map(Number);
  const [hB, mB] = timeB.split(':').map(Number);
  return (hB * 60 + mB) - (hA * 60 + mA);
}

export default function StationsPage() {
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStation, setSelectedStation] = useState<any>(null);
  
  // Tabs: 'board' (terminal arrival/departure display), 'destinations' (direct bookings)
  const [tab, setTab] = useState<'board' | 'destinations'>('board');
  
  // Live simulated station time
  const [simulatedTime, setSimulatedTime] = useState('08:00');
  const [autoTick, setAutoTick] = useState(false);
  
  // Expanded train for route timeline
  const [expandedTrainId, setExpandedTrainId] = useState<string | null>(null);

  // Initialize clock to current system time
  useEffect(() => {
    const now = new Date();
    setSimulatedTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
  }, []);

  const fetchStations = async () => {
    setLoading(true);
    try {
      const res = await trainsAPI.getStationsWithRoutes();
      setStations(res.data.stations || []);
    } catch {
      toast.error('Failed to load stations data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStations();
  }, []);

  // Clock tick generator (speed multiplier: 1.5s = 1 minute)
  useEffect(() => {
    if (!autoTick) return;
    const interval = setInterval(() => {
      setSimulatedTime(prev => addMinutesToTime(prev, 1));
    }, 1500);
    return () => clearInterval(interval);
  }, [autoTick]);

  const filtered = stations.filter(s => {
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q)
    );
  });

  // Combine train arrivals and departures into a unified terminal display board list
  const getStationBoardData = () => {
    if (!selectedStation) return [];
    
    return selectedStation.routes.map((route: any) => {
      const isArrivalOnly = !route.departureTime;
      const isDepartureOnly = !route.arrivalTime;
      
      const eventType = isArrivalOnly ? 'Arrival' : 'Departure';
      const scheduledTime = isArrivalOnly ? route.arrivalTime : route.departureTime;
      const actualTime = addMinutesToTime(scheduledTime, route.delayMinutes);
      const diffMins = getTimeDifferenceMins(simulatedTime, actualTime);
      
      let statusText = 'Expected';
      let statusColor = 'text-slate-400';
      
      if (diffMins < -5) {
        statusText = eventType === 'Arrival' ? 'Arrived' : 'Departed';
        statusColor = 'text-slate-600';
      } else if (diffMins >= -5 && diffMins < 0) {
        statusText = eventType === 'Arrival' ? 'Halted' : 'Departing';
        statusColor = 'text-amber-500 font-extrabold';
      } else if (diffMins >= 0 && diffMins <= 5) {
        statusText = eventType === 'Arrival' ? 'Arriving' : 'Boarding';
        statusColor = 'text-emerald-400 font-extrabold animate-pulse';
      } else {
        if (route.delayMinutes > 0) {
          statusText = `Delayed - Expected in ${diffMins}m`;
          statusColor = 'text-amber-400 font-semibold';
        } else {
          statusText = `Expected in ${diffMins}m`;
          statusColor = 'text-indigo-400';
        }
      }

      return {
        ...route,
        eventType,
        scheduledTime,
        actualTime,
        statusText,
        statusColor,
        diffMins,
      };
    }).sort((a: any, b: any) => {
      // Sort chronologically by actual time
      return a.actualTime.localeCompare(b.actualTime);
    });
  };

  const boardData = getStationBoardData();

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))', border: '1px solid rgba(99,102,241,0.25)' }}>
              <MapPin className="w-5 h-5 text-indigo-400" />
            </div>
            <h1 className="text-3xl font-extrabold text-white">Stations and Route Explorer</h1>
          </div>
          <p className="text-slate-500 text-sm ml-13">
            Explore active railway stations, live terminal timetables, and remaining train route timelines
          </p>
        </div>
        <button onClick={fetchStations}
          className="btn-secondary gap-2 self-start shrink-0">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Search and Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: List of stations */}
        <div className="lg:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              className="input-field pl-10"
              placeholder="Filter by station name, city, or code..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
              <span className="text-slate-500 text-xs">Loading station listings...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass rounded-3xl p-8 text-center text-slate-500 text-xs border border-slate-800/40">
              No matching stations found.
            </div>
          ) : (
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {filtered.map(s => {
                const isSelected = selectedStation?.code === s.code;
                return (
                  <button
                    key={s.code}
                    onClick={() => { setSelectedStation(s); setTab('board'); setExpandedTrainId(null); }}
                    className="w-full text-left p-4 rounded-2xl transition-all duration-200 border text-xs"
                    style={isSelected 
                      ? { background: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.4)', boxShadow: '0 4px 20px rgba(99,102,241,0.1)' } 
                      : { background: 'rgba(8,13,36,0.6)', borderColor: 'rgba(255,255,255,0.04)' }
                    }
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-white font-extrabold text-sm">{s.name}</h3>
                        <span className="text-slate-500 font-medium">{s.city}</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{s.code}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 font-semibold mt-3">
                      <Train className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{s.passingTrainsCount} active train{s.passingTrainsCount !== 1 ? 's' : ''} passing</span>
                      <ChevronRight className="w-4 h-4 ml-auto text-slate-600" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Route and destination explorer details */}
        <div className="lg:col-span-2">
          {selectedStation ? (
            <div className="glass-elevated rounded-3xl p-6 border border-slate-800/40 min-h-[400px] flex flex-col">
              
              {/* Station Details Header */}
              <div className="flex justify-between items-start border-b border-slate-800/40 pb-5 mb-5">
                <div>
                  <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5">Selected Station</div>
                  <h2 className="text-2xl font-extrabold text-white">{selectedStation.name}</h2>
                  <span className="text-xs text-slate-400 font-semibold">{selectedStation.city} Division</span>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <span className="font-mono text-base font-extrabold text-white bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-xl block">
                    {selectedStation.code}
                  </span>
                </div>
              </div>

              {/* Tab Selector & Terminal Controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-800/20 pb-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => { setTab('board'); setExpandedTrainId(null); }}
                    className="px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200"
                    style={tab === 'board'
                      ? { background: 'rgba(99,102,241,0.18)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.35)' }
                      : { background: 'transparent', color: '#475569', border: '1px solid transparent' }
                    }
                  >
                    Live Station Board
                  </button>
                  <button
                    onClick={() => { setTab('destinations'); setExpandedTrainId(null); }}
                    className="px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200"
                    style={tab === 'destinations'
                      ? { background: 'rgba(99,102,241,0.18)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.35)' }
                      : { background: 'transparent', color: '#475569', border: '1px solid transparent' }
                    }
                  >
                    Direct Destinations ({selectedStation.routes.reduce((sum: number, r: any) => sum + r.destinations.length, 0)})
                  </button>
                </div>

                {/* Simulated Time System */}
                {tab === 'board' && (
                  <div className="flex items-center gap-2.5 bg-slate-950/60 border border-slate-800/60 px-3 py-1.5 rounded-2xl w-fit shrink-0">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-xs font-bold text-slate-300">Station Clock:</span>
                      <span className="font-mono text-sm font-extrabold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {simulatedTime}
                      </span>
                    </div>

                    <div className="h-4 w-px bg-slate-800" />

                    <button
                      onClick={() => setAutoTick(!autoTick)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/40 transition-colors"
                      title={autoTick ? "Pause real-time tick" : "Start real-time tick (1 min interval)"}
                    >
                      {autoTick ? <Pause className="w-3.5 h-3.5 text-amber-500" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                    
                    <button
                      onClick={() => setSimulatedTime(prev => addMinutesToTime(prev, 1))}
                      className="text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-wider bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg"
                    >
                      +1 Min
                    </button>
                  </div>
                )}
              </div>

              {/* Tab Content: Live Terminal Display Board */}
              {tab === 'board' && (
                <div className="space-y-4 flex-1">
                  {boardData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center gap-2 text-slate-600 text-xs">
                      <Train className="w-8 h-8 text-slate-700" />
                      No active departures or arrivals logged.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {boardData.map((route: any) => {
                        const style = getTypeStyle(route.type);
                        const isExpanded = expandedTrainId === route.trainId;
                        
                        return (
                          <div key={route.trainId} className="flex flex-col bg-slate-950/20 border border-slate-800/30 hover:border-slate-800 rounded-3xl transition-all duration-150 overflow-hidden">
                            
                            {/* Primary row info */}
                            <div 
                              onClick={() => setExpandedTrainId(isExpanded ? null : route.trainId)}
                              className="flex flex-col md:flex-row md:items-center justify-between p-4 cursor-pointer gap-4 text-xs"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                  <span className="text-[10px] text-slate-500 font-bold font-mono">{route.trainNumber}</span>
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                                    style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}` }}>
                                    {route.type}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-semibold">Plat {route.platform || '1'}</span>
                                  <span className="text-[10px] text-slate-500">·</span>
                                  <span className="text-[10px] text-slate-500">{route.eventType}</span>
                                </div>
                                <h3 className="text-white text-sm font-extrabold">{route.trainName}</h3>
                              </div>

                              <div className="flex items-center justify-between md:justify-end gap-6">
                                <div className="text-right">
                                  <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider block">Scheduled</span>
                                  <span className="text-slate-300 font-bold font-mono">{route.scheduledTime}</span>
                                </div>

                                {route.delayMinutes > 0 ? (
                                  <div className="text-right">
                                    <span className="text-red-400/80 font-bold uppercase text-[9px] tracking-wider block">Delay</span>
                                    <span className="text-amber-400 font-bold font-mono">+{route.delayMinutes}m</span>
                                  </div>
                                ) : (
                                  <div className="text-right">
                                    <span className="text-emerald-400/80 font-bold uppercase text-[9px] tracking-wider block">Status</span>
                                    <span className="text-emerald-400 font-bold font-mono">On Time</span>
                                  </div>
                                )}

                                <div className="text-right border-l border-slate-800/40 pl-4">
                                  <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider block">Expected</span>
                                  <span className="text-white font-extrabold font-mono text-sm">{route.actualTime}</span>
                                </div>

                                <div className="md:w-36 text-left md:text-right border-l border-slate-800/40 pl-4">
                                  <span className={`text-[11px] font-bold ${route.statusColor} block`}>
                                    {route.statusText}
                                  </span>
                                </div>

                                <div className="text-slate-600 shrink-0 pl-2">
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                              </div>
                            </div>

                            {/* Expanded Route Timeline till Destination */}
                            {isExpanded && (
                              <div className="bg-slate-950/60 border-t border-slate-800/40 p-5 animate-fade-in text-xs">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                                  <Train className="w-3.5 h-3.5 text-indigo-400" /> 
                                  Remaining Route Stops till Destination
                                </h4>
                                
                                {route.destinations.length === 0 ? (
                                  <p className="text-slate-500 text-xs italic">This station is the final destination for this train.</p>
                                ) : (
                                  <div className="relative pl-6 space-y-4">
                                    {/* Timeline line */}
                                    <div className="absolute left-[9px] top-1.5 bottom-1.5 w-0.5 bg-slate-800" />

                                    {route.destinations.map((dest: any, idx: number) => {
                                      // Calculate estimated arrival at each station using overall delay
                                      const estArr = addMinutesToTime(dest.arrivalTime, route.delayMinutes);
                                      const isFinal = idx === route.destinations.length - 1;
                                      
                                      return (
                                        <div key={idx} className="relative flex justify-between items-start">
                                          {/* Timeline node */}
                                          <div className={`absolute -left-6 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[8px] font-extrabold ${isFinal ? 'bg-indigo-500/10 border-indigo-400 text-indigo-300' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>
                                            {route.stopNumber + idx + 1}
                                          </div>

                                          <div>
                                            <h5 className="text-white font-extrabold text-xs flex items-center gap-1.5">
                                              {dest.stationName}
                                              <span className="font-mono text-[9px] text-slate-500">({dest.stationCode})</span>
                                            </h5>
                                            <span className="text-[10px] text-slate-500 font-semibold">{dest.city} division · {dest.distanceKm} km away</span>
                                          </div>

                                          <div className="text-right flex items-center gap-6">
                                            <div>
                                              <span className="text-slate-500 font-bold uppercase text-[9px]">Sched Arrival</span>
                                              <div className="text-slate-400 font-bold font-mono mt-0.5">{dest.arrivalTime}</div>
                                            </div>
                                            <div>
                                              <span className="text-slate-500 font-bold uppercase text-[9px]">Est Arrival</span>
                                              <div className="text-indigo-400 font-bold font-mono mt-0.5">
                                                {estArr} 
                                                {route.delayMinutes > 0 && <span className="text-[9px] text-amber-500 ml-1">(+{route.delayMinutes}m)</span>}
                                              </div>
                                            </div>
                                            <Link
                                              href={`/trains/search?from=${selectedStation.code}&to=${dest.stationCode}`}
                                              className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
                                              title="Book this segment"
                                            >
                                              <ExternalLink className="w-3.5 h-3.5" />
                                            </Link>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab Content: Destinations */}
              {tab === 'destinations' && (
                <div className="space-y-4 flex-1">
                  {selectedStation.routes.reduce((sum: number, r: any) => sum + r.destinations.length, 0) === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center gap-2 text-slate-600 text-xs">
                      <Info className="w-8 h-8 text-slate-700" />
                      No direct outbound destinations from this station.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedStation.routes.flatMap((route: any) => 
                        route.destinations.map((dest: any, idx: number) => ({
                          ...dest,
                          trainId: route.trainId,
                          trainName: route.trainName,
                          trainNumber: route.trainNumber,
                          trainType: route.type,
                          delayMinutes: route.delayMinutes,
                          key: `${route.trainNumber}-${dest.stationCode}-${idx}`
                        }))
                      ).map((dest: any) => {
                        const style = getTypeStyle(dest.trainType);
                        const estArrival = addMinutesToTime(dest.arrivalTime, dest.delayMinutes);
                        return (
                          <div key={dest.key} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-950/40 border border-slate-800/40 rounded-2xl gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1 text-wrap text-xs">
                                <span className="text-white font-extrabold text-sm">{dest.stationName}</span>
                                <span className="font-mono text-[9px] text-slate-500 font-bold">({dest.stationCode})</span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5 flex-wrap">
                                <span>via {dest.trainName}</span>
                                <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold"
                                  style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}` }}>
                                  {dest.trainType}
                                </span>
                                <span>·</span>
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span>Sched Arr: {dest.arrivalTime}</span>
                                {dest.delayMinutes > 0 && (
                                  <span className="text-amber-500 font-bold">(Est: {estArrival})</span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end border-t md:border-t-0 border-slate-800/30 pt-3 md:pt-0">
                              <span className="text-slate-500 font-mono text-xs">{dest.distanceKm} km away</span>
                              <Link
                                href={`/trains/search?from=${selectedStation.code}&to=${dest.stationCode}`}
                                className="btn-primary py-1.5 px-4 text-xs font-bold rounded-lg flex items-center gap-1.5 uppercase tracking-wider"
                                style={{
                                  background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
                                  boxShadow: '0 2px 10px rgba(79,70,229,0.2)'
                                }}
                              >
                                Book Journey <ArrowRight className="w-3 h-3" />
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

            </div>
          ) : (
            <div className="glass rounded-3xl p-16 flex flex-col items-center justify-center text-center gap-4 border border-slate-800/40 min-h-[400px]">
              <div className="w-16 h-16 rounded-3xl flex items-center justify-center animate-pulse" style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.08)' }}>
                <Info className="w-8 h-8 text-slate-700" />
              </div>
              <div>
                <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider">Select a Station</h3>
                <p className="text-slate-600 text-xs mt-2 max-w-[280px] leading-relaxed">
                  Choose a station from the directory on the left to explore live terminal boards, active train route segments, and outbound bookings.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
