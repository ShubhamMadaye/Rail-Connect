'use client';
import React, { useEffect, useState } from 'react';
import { timetableAPI, trainsAPI } from '@/lib/api';
import { 
  Train, 
  Search, 
  Loader2, 
  Clock, 
  MapPin, 
  RefreshCw, 
  Radio, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  Calendar,
  Compass,
  CheckCircle2,
  Utensils
} from 'lucide-react';
import DelayBadge from '@/components/DelayBadge';
import Link from 'next/link';

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

export default function TimetablePage() {
  const now = new Date();
  const getTodayStr = () => now.toISOString().split('T')[0];
  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };
  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const [trains, setTrains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [lifecycleFilter, setLifecycleFilter] = useState<'ALL' | 'RUNNING' | 'UPCOMING' | 'COMPLETED'>('ALL');
  const [localLineFilter, setLocalLineFilter] = useState<'All' | 'Western' | 'Central' | 'Harbour'>('All');
  
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [expandedTrain, setExpandedTrain] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<any>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  const handleLiveTrack = async (trainNumber: string) => {
    if (expandedTrain === trainNumber) {
      setExpandedTrain(null);
      setLiveStatus(null);
      return;
    }
    setExpandedTrain(trainNumber);
    setLiveLoading(true);
    setLiveError(null);
    try {
      const res = await trainsAPI.getLiveStatus(trainNumber);
      setLiveStatus(res.data);
    } catch (err: any) {
      setLiveError('Live tracking calculations currently unavailable for this train.');
      setLiveStatus(null);
    } finally {
      setLiveLoading(false);
    }
  };

  const fetchData = async (dateParam?: string) => {
    setLoading(true);
    const dateToUse = dateParam || selectedDate;
    try {
      const tRes = await timetableAPI.getAll(dateToUse);
      setTrains(tRes.data.timetable || tRes.data.trains || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch timetable', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const handleDateChange = (dateStr: string) => {
    setSelectedDate(dateStr);
    setExpandedTrain(null);
    setLiveStatus(null);
  };

  const isLocalTrain = (t: any) => t.type === 'Local';
  const isExpressTrain = (t: any) => t.type !== 'Local';

  const getLocalLine = (trainName: string, trainNum: string) => {
    const name = trainName.toLowerCase();
    const num = trainNum.toLowerCase();
    if (name.includes('western') || num.includes('wr') || name.includes('churchgate') || name.includes('virar') || name.includes('borivali')) {
      return { name: 'Western Line', color: '#60a5fa', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.25)' };
    }
    if (name.includes('harbour') || num.includes('hr') || name.includes('panvel') || name.includes('vashi')) {
      return { name: 'Harbour Line', color: '#34d399', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)' };
    }
    if (name.includes('central') || num.includes('cr') || name.includes('kalyan') || name.includes('thane') || name.includes('csmt')) {
      return { name: 'Central Line', color: '#fb923c', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.25)' };
    }
    return { name: 'Suburban Line', color: '#c084fc', bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.25)' };
  };

  const getLocalServiceType = (trainName: string) => {
    if (trainName.toLowerCase().includes('fast')) {
      return { label: 'FAST', color: '#f87171', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)' };
    }
    return { label: 'SLOW', color: '#60a5fa', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)' };
  };

  const formatDateLabel = (dateStr: string) => {
    if (dateStr === getTodayStr()) return 'Today (Live)';
    if (dateStr === getYesterdayStr()) return 'Yesterday (Archive)';
    if (dateStr === getTomorrowStr()) return 'Tomorrow (Upcoming)';
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const formatTo12Hr = (timeStr: string | null | undefined): string => {
    if (!timeStr) return '—';
    if (timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('pm')) {
      return timeStr;
    }
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    if (isNaN(hours)) return timeStr;
    
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    
    const hoursStr = hours.toString().padStart(2, '0');
    return `${hoursStr}:${minutes} ${ampm}`;
  };

  const formatUpcomingStatus = (minutes: number) => {
    if (minutes < 60) {
      return `Starts in ${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) {
      return mins > 0 ? `Starts in ${hours}h ${mins}m` : `Starts in ${hours}h`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (days === 1) {
      return remainingHours > 0 ? `1 day ${remainingHours}h to go` : `1 day to go`;
    }
    return remainingHours > 0 ? `${days} days ${remainingHours}h to go` : `${days} days to go`;
  };

  const formatLocalUpcomingStatus = (minutes: number) => {
    if (minutes < 60) {
      return `Departs in ${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) {
      return mins > 0 ? `Departs in ${hours}h ${mins}m` : `Departs in ${hours}h`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (days === 1) {
      return remainingHours > 0 ? `1 day ${remainingHours}h ahead` : `1 day ahead`;
    }
    return remainingHours > 0 ? `${days} days ${remainingHours}h ahead` : `${days} days ahead`;
  };

  const formatCompletedStatus = (dateStr: string) => {
    const today = getTodayStr();
    if (dateStr === today) return 'Completed';
    
    const diffTime = Math.abs(new Date(today).getTime() - new Date(dateStr).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      return 'Completed 1 day ago';
    }
    return `Completed ${diffDays} days ago`;
  };

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatDelayText = (minutes: number) => {
    if (minutes < 60) {
      return `Delayed by ${minutes} Mins`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) {
      return mins > 0 ? `Delayed by ${hours}h ${mins}m` : `Delayed by ${hours}h`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (days === 1) {
      return remainingHours > 0 ? `Delayed by 1 day ${remainingHours}h` : `Delayed by 1 day`;
    }
    return remainingHours > 0 ? `Delayed by ${days} days ${remainingHours}h` : `Delayed by ${days} days`;
  };

  const filteredBase = trains.filter(t => {
    const q = search.toLowerCase();
    return !search ||
      t.name.toLowerCase().includes(q) ||
      t.trainNumber.toLowerCase().includes(q) ||
      t.from.toLowerCase().includes(q) ||
      t.to.toLowerCase().includes(q) ||
      t.fromCode.toLowerCase().includes(q) ||
      t.toCode.toLowerCase().includes(q);
  });

  const expressTrains = filteredBase.filter(isExpressTrain);
  const localTrains = filteredBase.filter(isLocalTrain);

  const expressRunningCount = expressTrains.filter(t => t.journeyState === 'RUNNING').length;
  const expressUpcomingCount = expressTrains.filter(t => t.journeyState === 'UPCOMING').length;

  const localRunningCount = localTrains.filter(t => t.journeyState === 'RUNNING').length;
  const localArrivingSoonCount = localTrains.filter(t => t.journeyState === 'RUNNING' && t.countdownMinutes <= 5).length;
  const localDelayedCount = localTrains.filter(t => t.journeyState === 'RUNNING' && t.delayMinutes > 0).length;

  const filterByState = (list: any[]) => {
    if (lifecycleFilter === 'ALL') return list;
    return list.filter(t => t.journeyState === lifecycleFilter);
  };

  const finalExpressTrains = filterByState(expressTrains);

  const finalLocalTrains = filterByState(localTrains).filter(t => {
    if (localLineFilter === 'All') return true;
    const line = getLocalLine(t.name, t.trainNumber).name;
    return line.startsWith(localLineFilter);
  });

  const renderSchematicMap = (status: any, loadingStatus: boolean, errMessage: string | null) => {
    if (loadingStatus) {
      return (
        <div className="flex items-center gap-3 justify-center py-12 text-emerald-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-semibold tracking-wider font-mono">Connecting Live Tracking Engine...</span>
        </div>
      );
    }
    if (errMessage) {
      return (
        <div className="flex items-center gap-2 justify-center py-12 text-red-400 text-sm font-semibold">
          <AlertTriangle className="w-4 h-4" /> {errMessage}
        </div>
      );
    }
    if (!status) return null;

    const stationsList = status.stations || [];
    if (stationsList.length === 0) {
      return (
        <div className="text-center py-12 text-slate-500 text-sm">
          No route coordinate path available for this service.
        </div>
      );
    }

    const N = stationsList.length;
    const W = 1000;
    const H = 160;
    const padding = 65;

    const lats = stationsList.map((st: any) => st.latitude || 0);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const avgLat = lats.reduce((a: number, b: number) => a + b, 0) / (N || 1);

    const isLocal = status.type === 'Local' || N > 8 || status.trainName.toLowerCase().includes('local') || status.trainNumber.toLowerCase().includes('wr') || status.trainNumber.toLowerCase().includes('cr') || status.trainNumber.toLowerCase().includes('hr');

    // Compute X and Y coordinates for each station (strictly sequential X and alternating Y heights to create a clean schematic winding path)
    const points = stationsList.map((st: any, i: number) => {
      const x = padding + (i / Math.max(1, N - 1)) * (W - 2 * padding);
      const y = i % 2 === 0 ? 110 : 50;
      return { x, y, station: st, idx: i };
    });

    // Calculate train position along the path
    let trainPos = null;
    const isTrainActive = status.journeyState === 'ACTIVE' || status.journeyState === 'RUNNING';

    if (isTrainActive && points.length > 0) {
      const currIdx = status.currentIndex ?? 0;
      const nextIdx = status.nextIndex ?? 0;
      const isHalted = stationsList[currIdx]?.isHalted;

      if (isHalted || currIdx === nextIdx) {
        trainPos = { x: points[currIdx].x, y: points[currIdx].y };
      } else {
        const p1 = points[currIdx];
        const p2 = points[nextIdx];
        if (p1 && p2) {
          // Interpolate 50% along track segment
          trainPos = {
            x: p1.x + 0.5 * (p2.x - p1.x),
            y: p1.y + 0.5 * (p2.y - p1.y)
          };
        }
      }
    }

    // Draw SVG lines (segments)
    const linePath = points.map((p: any, i: number) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return (
      <div className="w-full bg-slate-950/90 rounded-2xl border border-slate-800/80 p-5 sm:p-6 space-y-6 animate-fade-in-up">
        {/* Overview stats bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/60 pb-4">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">Live Tracking Status</span>
            <div className="text-white font-extrabold text-sm flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {status.status}
            </div>
          </div>
          <div className="flex gap-4">
            <div className="text-left sm:text-right">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">Delay Offset</span>
              <div className="mt-0.5 flex items-center gap-1.5 justify-end">
                <span className={`w-1.5 h-1.5 rounded-full ${status.delayMinutes > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                <span className={`text-sm font-bold font-mono ${status.delayMinutes > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {status.delayMinutes > 0 ? `+${status.delayMinutes} Mins` : 'On Time'}
                </span>
              </div>
            </div>
            {status.minutesToNext > 0 && status.journeyState === 'ACTIVE' && (
              <div className="text-left sm:text-right">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">Next Stop ETA</span>
                <div className="text-sm font-bold text-indigo-400 font-mono mt-0.5">
                  {status.minutesToNext} mins
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SVG Map Section */}
        <div className="relative overflow-x-auto scrollbar-thin scrollbar-thumb-slate-800 pb-2">
          <div className="min-w-[950px]">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto overflow-visible select-none">
              <defs>
                <linearGradient id="trackGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#312e81" stopOpacity="0.4" />
                  <stop offset="30%" stopColor="#4f46e5" stopOpacity="0.8" />
                  <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#0f172a" stopOpacity="0.4" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Track Path Line */}
              <path
                d={linePath}
                fill="none"
                stroke="url(#trackGrad)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Render Station Nodes */}
              {points.map((p: any) => {
                const st = p.station;
                const isPassed = st.isPassed;
                const isHalted = st.isHalted;
                const isUpcoming = st.isUpcoming;
                
                let nodeColor = '#334155'; // upcoming
                let ringColor = 'transparent';
                if (isPassed) {
                  nodeColor = '#6366f1'; // passed (indigo)
                }
                if (isHalted) {
                  nodeColor = '#10b981'; // active halt (emerald)
                  ringColor = 'rgba(16,185,129,0.4)';
                } else if (!isPassed && !isUpcoming) {
                  // next arriving stop
                  nodeColor = '#38bdf8'; // arriving (sky)
                  ringColor = 'rgba(56,189,248,0.3)';
                }

                const currIdx = status.currentIndex ?? 0;
                const nextIdx = status.nextIndex ?? 0;

                // Alternate stacking directions: Peak (odd indexes, y=50) label goes ABOVE; Trough (even indexes, y=110) label goes BELOW
                const isGroupAbove = p.idx % 2 === 1;
                const labelY = isGroupAbove ? p.y - 12 : p.y + 16;
                const platformY = isGroupAbove ? p.y - 22 : p.y + 26;

                const timeStr = formatTo12Hr(st.expectedArrivalTime || st.arrivalTime || st.expectedDepartureTime || st.departureTime);
                const isDelayed = (st.expectedArrivalTime && st.expectedArrivalTime !== st.arrivalTime) || 
                                  (st.expectedDepartureTime && st.expectedDepartureTime !== st.departureTime);

                return (
                  <g key={st.stationCode} className="transition-all duration-300">
                    {/* Glowing outer ring for active/halted station */}
                    {ringColor !== 'transparent' && (
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="12"
                        fill="none"
                        stroke={ringColor}
                        strokeWidth="3"
                        className="animate-pulse"
                      />
                    )}

                    {/* Base node circle */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isHalted || (!isPassed && !isUpcoming) ? '6' : '5'}
                      fill={nodeColor}
                      stroke="#020617"
                      strokeWidth="1.5"
                      filter={isHalted ? 'url(#glow)' : undefined}
                    >
                      <title>{st.stationName}</title>
                    </circle>

                    {/* Combined Station Code & Timing Label */}
                    <text
                      x={p.x}
                      y={labelY}
                      textAnchor="middle"
                      className="transition-all duration-300"
                    >
                      <tspan
                        fill={isHalted ? '#10b981' : isPassed ? '#64748b' : '#f8fafc'}
                        className="text-[10px] font-bold font-sans tracking-wide"
                      >
                        {st.stationCode}
                      </tspan>
                      {timeStr && (
                        <tspan
                          dx="4"
                          fill={isPassed ? '#475569' : isDelayed ? '#f59e0b' : '#10b981'}
                          className="text-[9px] font-mono font-bold"
                        >
                          {timeStr}
                        </tspan>
                      )}
                    </text>

                    {/* Platform label */}
                    {st.platform && (
                      <text
                        x={p.x}
                        y={platformY}
                        textAnchor="middle"
                        fill={isPassed ? '#334155' : '#64748b'}
                        className="text-[8px] font-bold font-mono"
                      >
                        PF {st.platform}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Glowing Active Train Marker with pulse animation instead of aggressive ping */}
              {trainPos && (
                <g filter="url(#glow)">
                  <circle
                    cx={trainPos.x}
                    cy={trainPos.y}
                    r="16"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    className="animate-pulse"
                    opacity="0.6"
                  />
                  
                  <circle
                    cx={trainPos.x}
                    cy={trainPos.y}
                    r="9"
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />

                  <circle
                    cx={trainPos.x}
                    cy={trainPos.y}
                    r="4"
                    fill="#ffffff"
                  />
                </g>
              )}
            </svg>
          </div>
        </div>

        {/* Dual-Column Detailed Timeline & Info Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t border-slate-900/60">
          
          {/* Left Column: Delay Metrics & Booking Info */}
          <div className="space-y-4 lg:col-span-1 bg-slate-900/40 p-4 rounded-xl border border-slate-900/50">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Service Overview</h4>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Route Segment</span>
                <span className="text-slate-300 font-bold font-mono">
                  {stationsList[0]?.stationCode} → {stationsList[N - 1]?.stationCode}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Total Distance</span>
                <span className="text-slate-300 font-bold font-mono">
                  {stationsList[N - 1]?.distanceKm || '—'} KM
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Delay Reason</span>
                <span className="text-amber-500 font-bold max-w-[150px] text-right truncate">
                  {status.delayMinutes > 0 ? (status.delayReason || 'Operational Delays') : 'None'}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-800/40">
                <span className="text-slate-500 font-medium">Operational Day</span>
                <span className="text-slate-300 font-bold">{new Date(status.journeyDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              {status.type !== 'Local' ? (
                <>
                  <Link
                    href={`/trains/search?from=${stationsList[0]?.stationCode}&to=${stationsList[N - 1]?.stationCode}&date=${status.journeyDate}`}
                    className="w-full text-center bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white font-bold py-2 rounded-lg text-xs border border-indigo-500/20 transition-all"
                  >
                    Book Tickets for Next Run
                  </Link>
                  <Link
                    href={`/food?trainNumber=${status.trainNumber}`}
                    className="w-full text-center bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-white font-bold py-2 rounded-lg text-xs border border-emerald-500/20 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Utensils className="w-3.5 h-3.5" /> Order Food Onboard
                  </Link>
                </>
              ) : (
                <div className="p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/10 text-emerald-400 text-[11px] font-medium leading-relaxed">
                  📢 Suburban local services do not require pre-booking. Simply purchase a local transit ticket or scan your pass at the station smart gate.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Timeline list */}
          <div className="lg:col-span-2 space-y-3 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 pr-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1">Detailed Station Timeline</h4>
            
            <div className="relative pl-6 space-y-4">
              <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-800" />

              {stationsList.map((st: any, idx: number) => {
                const isTerminus = idx === N - 1;
                const isOrigin = idx === 0;
                const isPassed = st.isPassed;
                const isHalted = st.isHalted;

                let circleStyle = 'bg-slate-800 border-slate-700';
                if (isPassed) circleStyle = 'bg-indigo-500/20 border-indigo-500 text-indigo-300';
                if (isHalted) circleStyle = 'bg-emerald-500/20 border-emerald-400 text-emerald-400 animate-pulse';
                else if (!isPassed && !st.isUpcoming) circleStyle = 'bg-sky-500/20 border-sky-400 text-sky-400';

                return (
                  <div key={st.stationCode} className={`relative flex items-start justify-between text-xs transition-opacity duration-200 ${isPassed ? 'opacity-50' : 'opacity-100'}`}>
                    <div className={`absolute -left-[20px] top-1 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${circleStyle} z-10 bg-slate-950`} />

                    <div className="space-y-0.5">
                      <div className="font-bold text-white flex items-center gap-2">
                        {st.stationName}
                        <span className="text-[10px] text-slate-500 font-mono">({st.stationCode})</span>
                        {isHalted && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono animate-pulse">
                            Halted here
                          </span>
                        )}
                      </div>
                      
                      <div className="text-[10px] text-slate-500 flex gap-3 font-mono">
                        {st.platform && <span>Platform {st.platform}</span>}
                        {st.distanceKm > 0 && <span>{st.distanceKm} km</span>}
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      {isOrigin ? (
                        <div>
                          <span className="text-slate-400 font-semibold">Dep: {formatTo12Hr(st.expectedDepartureTime || st.departureTime)}</span>
                          {st.expectedDepartureTime !== st.departureTime && (
                            <div className="text-[9px] text-amber-500">Sched: {formatTo12Hr(st.departureTime)}</div>
                          )}
                        </div>
                      ) : isTerminus ? (
                        <div>
                          <span className="text-slate-400 font-semibold">Arr: {formatTo12Hr(st.expectedArrivalTime || st.arrivalTime)}</span>
                          {st.expectedArrivalTime !== st.arrivalTime && (
                            <div className="text-[9px] text-amber-500">Sched: {formatTo12Hr(st.arrivalTime)}</div>
                          )}
                          <div className="text-[9px] text-emerald-400 font-bold mt-0.5">Journey Completed</div>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <div className="text-slate-300">
                            Arr: <span className="font-bold">{formatTo12Hr(st.expectedArrivalTime || st.arrivalTime)}</span>
                          </div>
                          <div className="text-slate-400">
                            Dep: {formatTo12Hr(st.expectedDepartureTime || st.departureTime)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 animate-fade-in-up">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center animate-pulse"
              style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))', border: '1px solid rgba(99,102,241,0.25)' }}>
              <Train className="w-5 h-5 text-indigo-400" />
            </div>
            <h1 className="text-3xl font-extrabold text-white">Live Timetable</h1>
          </div>
          <p className="text-slate-500 text-sm ml-13 flex items-center gap-1.5">
            Real-time tracking of Express routes and Mumbai Suburban commuters.
            {lastUpdated && (
              <span className="text-slate-600 font-medium font-mono">
                · Last updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <button onClick={() => fetchData()}
          className="btn-secondary gap-2 self-start shrink-0 font-bold transition-all duration-200">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Status
        </button>
      </div>

      {/* Primary Filters */}
      <div className="glass-elevated rounded-3xl p-5 animate-fade-in-up delay-100 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/40 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Instance Date</span>
          </div>

          <div className="flex gap-2 p-1 rounded-xl w-full sm:w-auto" style={{ background: 'rgba(8,13,36,0.8)', border: '1px solid rgba(99,102,241,0.15)' }}>
            {[getYesterdayStr(), getTodayStr(), getTomorrowStr()].map(dateStr => (
              <button
                key={dateStr}
                onClick={() => handleDateChange(dateStr)}
                className="text-xs px-4 py-2 rounded-lg font-bold flex-1 sm:flex-initial transition-all duration-200"
                style={selectedDate === dateStr
                  ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white' }
                  : { color: '#64748b' }}>
                {formatDateLabel(dateStr)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between pt-2">
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'ALL', label: 'All Services', dot: 'bg-indigo-400' },
              { id: 'RUNNING', label: 'Running Now', dot: 'bg-emerald-400' },
              { id: 'UPCOMING', label: 'Upcoming', dot: 'bg-blue-400' },
              { id: 'COMPLETED', label: 'Completed', dot: 'bg-slate-500' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setLifecycleFilter(tab.id as any)}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-150 flex items-center gap-2"
                style={lifecycleFilter === tab.id
                  ? { background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.35)' }
                  : { background: 'transparent', color: '#64748b', border: '1px solid rgba(100,116,139,0.15)' }
                }>
                <span className={`w-1.5 h-1.5 rounded-full ${tab.dot}`} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              id="timetable-search"
              className="input-field pl-10 py-2.5 text-xs"
              placeholder="Search train name, number, station..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Smart Status Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up delay-150">
        {/* Express Summary Dashboard */}
        <div className="glass rounded-3xl p-5 border border-indigo-500/10 flex items-center justify-between relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(13,19,53,0.4) 100%)' }}>
          <div className="space-y-1 z-10">
            <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <Train className="w-4 h-4" />
              Express & Intercity
            </div>
            <h3 className="text-xl font-extrabold text-white">Summary Metrics</h3>
          </div>
          <div className="flex gap-4 z-10">
            <div className="text-center bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-2xl min-w-[70px]">
              <div className="text-2xl font-extrabold text-emerald-400">{expressRunningCount}</div>
              <div className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">Running</div>
            </div>
            <div className="text-center bg-blue-500/10 border border-blue-500/20 px-4 py-2.5 rounded-2xl min-w-[70px]">
              <div className="text-2xl font-extrabold text-blue-400">{expressUpcomingCount}</div>
              <div className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">Upcoming</div>
            </div>
          </div>
        </div>

        {/* Local Summary Dashboard */}
        <div className="glass rounded-3xl p-5 border border-emerald-500/10 flex items-center justify-between relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(13,19,53,0.4) 100%)' }}>
          <div className="space-y-1 z-10">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <Radio className="w-4 h-4" />
              Mumbai Suburban Local
            </div>
            <h3 className="text-xl font-extrabold text-white">Suburban Commutes</h3>
          </div>
          <div className="flex gap-3 z-10">
            <div className="text-center bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2.5 rounded-2xl min-w-[65px]">
              <div className="text-xl font-extrabold text-emerald-400">{localRunningCount}</div>
              <div className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">Active</div>
            </div>
            <div className="text-center bg-amber-500/10 border border-amber-500/20 px-3.5 py-2.5 rounded-2xl min-w-[65px]">
              <div className="text-xl font-extrabold text-amber-400">{localArrivingSoonCount}</div>
              <div className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">Soon</div>
            </div>
            <div className="text-center bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 rounded-2xl min-w-[65px]">
              <div className="text-xl font-extrabold text-red-400">{localDelayedCount}</div>
              <div className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">Delayed</div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-28 gap-4 animate-fade-in-up">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
          <p className="text-slate-500 text-sm">Synchronizing operational database...</p>
        </div>
      ) : (
        <div className="space-y-10">
          
          {/* Section 1: Express & Intercity */}
          <div className="space-y-4 animate-fade-in-up delay-200">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800/40">
              <span className="w-2.5 h-2.5 rounded-lg bg-indigo-500" />
              <h2 className="text-lg font-bold text-white tracking-wide">Express & Intercity Services</h2>
              <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 font-mono">
                {finalExpressTrains.length} services
              </span>
            </div>

            {finalExpressTrains.length === 0 ? (
              <div className="text-center py-10 bg-slate-900/10 border border-slate-800/30 rounded-2xl text-slate-500 text-sm">
                No active or scheduled Express services match filters
              </div>
            ) : (
              <div className="glass-elevated rounded-3xl overflow-hidden border border-slate-800/50">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: 'rgba(8,13,36,0.8)', borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
                        {['Train Details', 'Origin → Destination', 'Scheduled Dep / Arr', 'Status / Lifecycle', ''].map(col => (
                          <th key={col} className="text-left px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {finalExpressTrains.map((train, idx) => {
                        const isExpanded = expandedTrain === train.trainNumber;
                        const typeStyle = getTypeStyle(train.type);
                        
                        return (
                          <React.Fragment key={train.id}>
                            <tr
                              className="group transition-all duration-150 cursor-default"
                              style={{
                                borderBottom: '1px solid rgba(99,102,241,0.06)',
                                background: idx % 2 === 0 ? 'transparent' : 'rgba(13,19,53,0.3)',
                              }}
                              onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(99,102,241,0.05)'}
                              onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = idx % 2 === 0 ? 'transparent' : 'rgba(13,19,53,0.3)'}
                            >
                              <td className="px-5 py-4">
                                <div className="font-bold text-white text-sm group-hover:text-indigo-200 transition-colors">
                                  {train.name}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-slate-600 text-xs font-mono">{train.trainNumber}</span>
                                  <span className="px-2 py-0.5 rounded text-[9px] font-bold"
                                    style={{ background: typeStyle.bg, color: typeStyle.text, border: `1px solid ${typeStyle.border}` }}>
                                    {train.type}
                                  </span>
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <div className="text-sm font-semibold text-slate-200">
                                  {train.from} → {train.to}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                  Codes: {train.fromCode} → {train.toCode}
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <div className="text-sm font-semibold text-slate-200">
                                  {formatTo12Hr(train.departure)} / {formatTo12Hr(train.arrival)}
                                </div>
                                {train.delayMinutes > 0 && (
                                  <div className="text-[10px] text-amber-500 font-medium mt-0.5 font-mono">
                                    Expected: {formatTo12Hr(train.expectedDeparture)} / {formatTo12Hr(train.expectedArrival)}
                                  </div>
                                )}
                              </td>

                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2">
                                  {train.journeyState === 'RUNNING' && (
                                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[9px] font-bold flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                      Running Now
                                    </span>
                                  )}
                                  {train.journeyState === 'UPCOMING' && (
                                    <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/25 text-blue-400 text-[9px] font-bold flex items-center gap-1">
                                      <Clock className="w-2.5 h-2.5" />
                                      {formatUpcomingStatus(train.countdownMinutes)}
                                    </span>
                                  )}
                                  {train.journeyState === 'COMPLETED' && (
                                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 text-[9px] font-bold">
                                      {formatCompletedStatus(selectedDate)}
                                    </span>
                                  )}
                                  <DelayBadge delayMinutes={train.delayMinutes} reason={train.delayReason} />
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleLiveTrack(train.trainNumber)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 whitespace-nowrap"
                                    style={isExpanded
                                      ? { background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }
                                      : { background: 'rgba(16,185,129,0.08)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.15)' }
                                    }>
                                    <Radio className="w-3 h-3" />
                                    {isExpanded ? 'Hide' : 'Track Live'}
                                  </button>
                                  <Link
                                    href={`/trains/search?from=${train.fromCode}&to=${train.toCode}&date=${selectedDate}`}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-center transition-all duration-200 whitespace-nowrap"
                                    style={{ background: 'rgba(99,102,241,0.08)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' }}>
                                    Book
                                  </Link>
                                </div>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr style={{ background: 'rgba(8,13,36,0.97)' }}>
                                <td colSpan={5} className="p-4">
                                  {renderSchematicMap(liveStatus, liveLoading, liveError)}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Mumbai Suburban Locals */}
          <div className="space-y-4 animate-fade-in-up delay-250">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800/40">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-lg bg-emerald-500 animate-pulse" />
                <h2 className="text-lg font-bold text-white tracking-wide">Mumbai Suburban Locals</h2>
                <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-emerald-400 font-mono">
                  {finalLocalTrains.length} services
                </span>
              </div>
              <div className="flex gap-1.5 p-1 rounded-xl" style={{ background: 'rgba(8,13,36,0.6)', border: '1px solid rgba(16,185,129,0.15)' }}>
                {['All', 'Western', 'Central', 'Harbour'].map(line => (
                  <button
                    key={line}
                    onClick={() => setLocalLineFilter(line as any)}
                    className="text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all"
                    style={localLineFilter === line
                      ? { background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }
                      : { color: '#64748b' }}>
                    {line === 'All' ? 'All Lines' : `${line} Line`}
                  </button>
                ))}
              </div>
            </div>

            {finalLocalTrains.length === 0 ? (
              <div className="text-center py-10 bg-slate-900/10 border border-slate-800/30 rounded-2xl text-slate-500 text-sm">
                No active or scheduled Mumbai Suburban services match filters
              </div>
            ) : (
              <div className="glass-elevated rounded-3xl overflow-hidden border border-emerald-500/10">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: 'rgba(8,13,36,0.8)', borderBottom: '1px solid rgba(16,185,129,0.12)' }}>
                        {['Line / Code', 'Service Details', 'Origin → Destination', 'Scheduled Start / End', 'Live Status', ''].map(col => (
                          <th key={col} className="text-left px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {finalLocalTrains.map((train, idx) => {
                        const isExpanded = expandedTrain === train.trainNumber;
                        const lineInfo = getLocalLine(train.name, train.trainNumber);
                        const serviceType = getLocalServiceType(train.name);
                        
                        return (
                          <React.Fragment key={train.id}>
                            <tr 
                              className="group transition-all duration-150 cursor-default"
                              style={{
                                borderBottom: '1px solid rgba(16,185,129,0.06)',
                                background: idx % 2 === 0 ? 'transparent' : 'rgba(13,19,53,0.3)',
                              }}
                              onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(16,185,129,0.05)'}
                              onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = idx % 2 === 0 ? 'transparent' : 'rgba(13,19,53,0.3)'}
                            >
                              {/* Column 1: Line / Code */}
                              <td className="px-5 py-4">
                                <span className="px-2 py-1 rounded text-[10px] font-extrabold uppercase tracking-wide"
                                  style={{ background: lineInfo.bg, color: lineInfo.color, border: `1px solid ${lineInfo.border}` }}>
                                  {lineInfo.name}
                                </span>
                                <div className="text-slate-500 text-[10px] font-mono mt-1.5 ml-1">{train.trainNumber}</div>
                              </td>

                              {/* Column 2: Service Details */}
                              <td className="px-5 py-4">
                                <div className="font-bold text-white text-sm group-hover:text-emerald-300 transition-colors">
                                  {train.name}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="px-2 py-0.5 rounded text-[9px] font-bold"
                                    style={{ background: serviceType.bg, color: serviceType.color, border: `1px solid ${serviceType.border}` }}>
                                    {serviceType.label}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-mono">Stops: {train.totalStops}</span>
                                </div>
                              </td>

                              {/* Column 3: Origin → Destination */}
                              <td className="px-5 py-4">
                                <div className="text-sm font-semibold text-slate-200">
                                  {train.from} → {train.to}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                  Codes: {train.fromCode} → {train.toCode}
                                </div>
                              </td>

                              {/* Column 4: Scheduled Start / End */}
                              <td className="px-5 py-4">
                                <div className="text-sm font-semibold text-slate-200">
                                  {formatTo12Hr(train.departure)} / {formatTo12Hr(train.arrival)}
                                </div>
                                {train.delayMinutes > 0 && (
                                  <div className="text-[10px] text-amber-500 font-medium mt-0.5 font-mono">
                                    Expected: {formatTo12Hr(train.expectedDeparture)} / {formatTo12Hr(train.expectedArrival)}
                                  </div>
                                )}
                              </td>

                              {/* Column 5: Live Status */}
                              <td className="px-5 py-4">
                                <div className="flex flex-col gap-1 justify-center">
                                  {train.delayMinutes > 0 ? (
                                    <div className="flex flex-col gap-1">
                                      <span className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold flex items-center gap-1.5 self-start">
                                        <span className="flex-shrink-0 text-sm">🟡</span>
                                        {formatDelayText(train.delayMinutes)}
                                      </span>
                                      {train.delayReason && (
                                        <span className="text-[10px] text-slate-500 ml-1 font-mono italic">
                                          Reason: {train.delayReason}
                                        </span>
                                      )}
                                    </div>
                                  ) : train.journeyState === 'UPCOMING' ? (
                                    <span className="px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold flex items-center gap-1.5 self-start">
                                      <span className="flex-shrink-0 text-sm">🟦</span>
                                      {formatLocalUpcomingStatus(train.countdownMinutes)}
                                    </span>
                                  ) : train.journeyState === 'RUNNING' && train.currentBounds ? (
                                    <div className="flex flex-col gap-1">
                                      <span className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 self-start">
                                        <span className="flex-shrink-0 text-sm animate-pulse">🟢</span>
                                        Arriving at {train.currentBounds.nextStationName} in {formatMinutes(train.currentBounds.minutesToNext)}
                                      </span>
                                      {train.currentBounds.platform && (
                                        <span className="text-[10px] text-slate-500 ml-1">
                                          Platform {train.currentBounds.platform} • {train.currentBounds.currentStationCode} → {train.currentBounds.nextStationCode}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-xs font-semibold flex items-center gap-1.5 self-start">
                                      {formatCompletedStatus(selectedDate)}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Column 6: Action */}
                              <td className="px-5 py-4">
                                <div className="flex justify-end">
                                  <button
                                    onClick={() => handleLiveTrack(train.trainNumber)}
                                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 whitespace-nowrap"
                                    style={isExpanded
                                      ? { background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }
                                      : { background: 'rgba(16,185,129,0.08)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.15)' }
                                    }>
                                    <Radio className="w-3.5 h-3.5" />
                                    {isExpanded ? 'Hide Map' : 'Track Live'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr style={{ background: 'rgba(8,13,36,0.97)' }}>
                                <td colSpan={6} className="p-4">
                                  {renderSchematicMap(liveStatus, liveLoading, liveError)}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
