'use client';
import React, { useEffect, useState } from 'react';
import { timetableAPI, trainsAPI } from '@/lib/api';
import { Train, Search, Loader2, Clock, MapPin, RefreshCw, Radio, AlertTriangle } from 'lucide-react';
import DelayBadge from '@/components/DelayBadge';
import Link from 'next/link';

const TYPES = ['', 'Rajdhani', 'Shatabdi', 'Express', 'Superfast', 'Local', 'Duronto'];

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
  const [trains, setTrains] = useState<any[]>([]);
  const [delays, setDelays] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [expandedTrain, setExpandedTrain] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<any>(null);

  const handleLiveTrack = async (trainNumber: string) => {
    if (expandedTrain === trainNumber) { setExpandedTrain(null); return; }
    setExpandedTrain(trainNumber);
    setLiveStatus({ loading: true });
    try {
      const res = await trainsAPI.getLiveStatus(trainNumber);
      setLiveStatus(res.data);
    } catch { setLiveStatus({ error: 'Live data unavailable' }); }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tRes, dRes] = await Promise.all([timetableAPI.getAll(), timetableAPI.getDelays()]);
      setTrains(tRes.data.timetable || tRes.data.trains || []);
      const dm: Record<string, any> = {};
      (dRes.data.delays || []).forEach((d: any) => { dm[d.trainId] = d; });
      setDelays(dm);
      setLastUpdated(new Date());
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = trains.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      t.name.toLowerCase().includes(q) ||
      t.trainNumber.includes(q) ||
      (t.from || t.fromStation || '').toLowerCase().includes(q) ||
      (t.to   || t.toStation   || '').toLowerCase().includes(q);
    const matchType = !typeFilter || t.type === typeFilter;
    return matchSearch && matchType;
  });

  const delayedCount = Object.values(delays).filter((d: any) => d.delayMinutes > 0).length;

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8 animate-fade-in-up">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))', border: '1px solid rgba(99,102,241,0.25)' }}>
              <Train className="w-5 h-5 text-indigo-400" />
            </div>
            <h1 className="text-3xl font-extrabold text-white">Live Timetable</h1>
          </div>
          <p className="text-slate-500 text-sm ml-13">
            All trains with real-time delay status
            {lastUpdated && (
              <span className="ml-2 text-slate-600">
                · Last updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <button onClick={fetchData}
          className="btn-secondary gap-2 self-start shrink-0">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Delay alert banner */}
      {delayedCount > 0 && (
        <div className="mb-6 p-4 rounded-2xl flex items-center gap-3 animate-fade-in-up"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(245,158,11,0.15)' }}>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-amber-300 text-sm">
            <span className="font-bold">{delayedCount} train{delayedCount > 1 ? 's' : ''}</span> are currently delayed today. Check individual train status for details.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="glass-elevated rounded-3xl p-5 mb-6 animate-fade-in-up delay-100">
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              id="timetable-search"
              className="input-field pl-10"
              placeholder="Search train name, number, or station..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {TYPES.map(t => {
            const style = t ? getTypeStyle(t) : null;
            const isActive = typeFilter === t;
            return (
              <button key={t} onClick={() => setTypeFilter(t)}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200"
                style={isActive && style
                  ? { background: style.bg, color: style.text, border: `1px solid ${style.border}` }
                  : isActive
                  ? { background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }
                  : { background: 'transparent', color: '#64748b', border: '1px solid rgba(100,116,139,0.2)' }
                }>
                {t || 'All'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Count */}
      {!loading && (
        <p className="text-slate-600 text-xs mb-3 font-medium uppercase tracking-widest">
          {filtered.length} trains shown
        </p>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-28 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
          <p className="text-slate-500 text-sm">Loading live timetable...</p>
        </div>
      ) : (
        <div className="glass-elevated rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: 'rgba(8,13,36,0.8)', borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
                  {['Train', 'Type', 'From', 'To', 'Stops', 'Status', ''].map(col => (
                    <th key={col} className="text-left px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((train, idx) => {
                  const delay = delays[train.id];
                  const typeStyle = getTypeStyle(train.type);
                  const isExpanded = expandedTrain === train.trainNumber;

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
                          <div className="text-slate-600 text-xs font-mono mt-0.5">{train.trainNumber}</div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold"
                            style={{ background: typeStyle.bg, color: typeStyle.text, border: `1px solid ${typeStyle.border}` }}>
                            {train.type}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 text-sm text-slate-300">
                            <MapPin className="w-3 h-3 text-indigo-400 shrink-0" />
                            {train.from || train.fromStation}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 text-sm text-slate-300">
                            <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                            {train.to || train.toStation}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-slate-500 text-sm font-medium">
                            {train.totalStops || train._count?.routes || '—'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <DelayBadge delayMinutes={delay?.delayMinutes || 0} reason={delay?.reason} showText />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1.5">
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
                              href={`/trains/search?from=${train.fromCode || train.fromStation}&to=${train.toCode || train.toStation}`}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-center transition-all duration-200 whitespace-nowrap"
                              style={{ background: 'rgba(99,102,241,0.08)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' }}>
                              Book
                            </Link>
                          </div>
                        </td>
                      </tr>

                      {/* Live track expand row */}
                      {isExpanded && (
                        <tr style={{ background: 'rgba(8,13,36,0.97)', borderBottom: '2px solid rgba(16,185,129,0.2)' }}>
                          <td colSpan={7} className="p-0">
                            <div className="animate-fade-in-up">
                              {liveStatus?.loading ? (
                                <div className="flex items-center gap-3 justify-center py-10 text-emerald-400">
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                  <span className="text-sm font-medium">Fetching real-time data...</span>
                                </div>
                              ) : liveStatus?.error ? (
                                <div className="flex items-center gap-2 justify-center py-10 text-red-400 text-sm">
                                  <AlertTriangle className="w-4 h-4" /> {liveStatus.error}
                                </div>
                              ) : (
                                <div className="px-6 py-6 space-y-6">
                                  
                                  {/* Trip status message */}
                                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800/40 pb-4">
                                    <div>
                                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tracking Status</div>
                                      <div className="text-white font-extrabold text-sm mt-0.5">
                                        {liveStatus?.status}
                                      </div>
                                    </div>
                                    <div className="text-left sm:text-right">
                                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Next Station Countdown</div>
                                      <div className="text-emerald-400 font-extrabold text-sm mt-0.5">
                                        Arriving at {liveStatus?.stations[liveStatus?.nextIndex]?.stationName} in {liveStatus?.minutesToNext} mins
                                      </div>
                                    </div>
                                  </div>

                                  {/* Animated Horizontal Progress Track Map */}
                                  <div className="py-6 overflow-x-auto">
                                    <div className="relative min-w-[650px] px-10">
                                      
                                      {/* Grey background line */}
                                      <div className="absolute top-1/2 -translate-y-1/2 left-10 right-10 h-1 bg-slate-800 rounded-full" />
                                      
                                      {/* Colored progress line */}
                                      <div className="absolute top-1/2 -translate-y-1/2 left-10 h-1 bg-emerald-500 rounded-full transition-all duration-500"
                                        style={{
                                          width: `${(liveStatus?.currentIndex / (liveStatus?.stations.length - 1)) * 100}%`,
                                          maxWidth: 'calc(100% - 80px)'
                                        }}
                                      />

                                      {/* Station nodes */}
                                      <div className="relative flex justify-between">
                                        {liveStatus?.stations.map((st: any, idx: number) => {
                                          let dotColor = 'bg-slate-900 border-2 border-slate-700';
                                          if (st.isPassed) dotColor = 'bg-emerald-500';
                                          if (st.isHalted) dotColor = 'bg-emerald-400 ring-4 ring-emerald-400/20 animate-pulse';

                                          return (
                                            <div key={idx} className="flex flex-col items-center relative z-10 w-24">
                                              
                                              {/* Station Name Code */}
                                              <div className="text-center mb-3 h-8 flex flex-col justify-end">
                                                <span className="text-[10px] font-extrabold text-white leading-tight">{st.stationName}</span>
                                                <span className="text-[8px] font-mono text-slate-500">{st.stationCode}</span>
                                              </div>

                                              {/* Node Dot */}
                                              <div className={`w-3.5 h-3.5 rounded-full ${dotColor} transition-all duration-300`} />

                                              {/* Time / Platform info */}
                                              <div className="text-center mt-3 text-[9px] text-slate-500">
                                                <div>{st.arrivalTime || st.departureTime || '—'}</div>
                                                <div className="font-mono text-slate-600 mt-0.5">Platform {st.platform}</div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>

                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && !loading && (
            <div className="text-center py-16 text-slate-500 text-sm">No trains match your filter</div>
          )}
        </div>
      )}
    </div>
  );
}
