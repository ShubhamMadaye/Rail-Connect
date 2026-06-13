'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Train, Clock, MapPin, IndianRupee, Loader2, ArrowRight, ArrowUpRight } from 'lucide-react';
import { trainsAPI } from '@/lib/api';
import DelayBadge from '@/components/DelayBadge';
import toast from 'react-hot-toast';

const TRAIN_TYPES = ['', 'Rajdhani', 'Shatabdi', 'Express', 'Superfast', 'Local', 'Duronto'];
const CLASSES = ['General', 'Sleeper', '3AC', '2AC', '1AC', 'First Class', 'Second Class'];

const TYPE_META: Record<string, { color: string; bg: string; border: string; ribbon: string }> = {
  Rajdhani:  { color: '#FCD34D', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)',  ribbon: '#F59E0B' },
  Shatabdi:  { color: '#818cf8', bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.25)',  ribbon: '#6366f1' },
  Duronto:   { color: '#f472b6', bg: 'rgba(236,72,153,0.1)', border: 'rgba(236,72,153,0.25)',  ribbon: '#ec4899' },
  Express:   { color: '#60a5fa', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.25)',  ribbon: '#3b82f6' },
  Superfast: { color: '#c084fc', bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.25)', ribbon: '#a855f7' },
  Local:     { color: '#34d399', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)', ribbon: '#10b981' },
};

const getTypeMeta = (type: string) =>
  TYPE_META[type] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)', ribbon: '#475569' };

function addMinutesToTime(timeStr: string, minutes: number): string {
  if (!timeStr || timeStr === '—') return '—';
  const [h, m] = timeStr.split(':').map(Number);
  let totalMins = h * 60 + m + minutes;
  totalMins = (totalMins + 1440) % 1440;
  const hrs = Math.floor(totalMins / 60);
  const mns = totalMins % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mns).padStart(2, '0')}`;
}

function SearchTrainCard({ train, selectedClass, idx }: { train: any; selectedClass: string; idx: number }) {
  const [prediction, setPrediction] = useState<any>(null);
  const [loadingPred, setLoadingPred] = useState(true);
  const [showRoute, setShowRoute] = useState(false);

  useEffect(() => {
    trainsAPI.getDelayPrediction(train.id)
      .then(res => setPrediction(res.data))
      .catch(() => {})
      .finally(() => setLoadingPred(false));
  }, [train.id]);

  const meta = getTypeMeta(train.type);
  const activeClass = train.fares[selectedClass] !== undefined ? selectedClass : Object.keys(train.fares)[0];
  const currentFare = train.fares[activeClass];
  const baseFare = train.baseFares ? train.baseFares[activeClass] : currentFare;
  const seatsLeft = train.seatsLeft ? train.seatsLeft[activeClass] : 5;
  const hasSurcharge = currentFare > baseFare;

  let seatsColor = 'text-emerald-400';
  let seatsLabel = `${seatsLeft} seats left`;
  if (seatsLeft === 0) {
    seatsColor = 'text-amber-500';
    seatsLabel = 'Seats Filled (Waitlist available)';
  } else if (seatsLeft <= 2) {
    seatsColor = 'text-red-400';
    seatsLabel = `Only ${seatsLeft} seats remaining!`;
  }

  return (
    <div
      className="glass rounded-3xl overflow-hidden card-hover animate-fade-in-up"
      style={{
        borderLeft: `4px solid ${meta.ribbon}`,
        animationDelay: `${idx * 60}ms`,
      }}
    >
      <div className="p-5">
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          {/* Train info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-2.5 flex-wrap">
              <span className="text-slate-500 font-mono text-xs">{train.trainNumber}</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
                {train.type}
              </span>
              <DelayBadge delayMinutes={train.delayMinutes} />
              <span className={`text-xs font-bold ${seatsColor}`}>{seatsLabel}</span>
            </div>
            <h3 className="text-lg font-extrabold text-white mb-4">{train.name}</h3>

            {/* Route timeline */}
            <div className="flex items-center justify-between gap-3 min-w-0">
              <div className="min-w-0 flex-1">
                <div className="text-2xl font-extrabold text-white leading-none">{train.departure || '—'}</div>
                <div className="text-xs text-slate-400 flex items-center gap-1 mt-1 truncate" title={train.fromStation.name}>
                  <MapPin className="w-3 h-3 text-indigo-400 shrink-0" />
                  <span className="truncate">{train.fromStation.name}</span>
                </div>
              </div>

              <div className="hidden sm:block flex-1 px-2 shrink-0">
                <div className="relative flex items-center">
                  <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${meta.ribbon}60, ${meta.ribbon}20)` }} />
                  <div className="mx-2 text-center shrink-0">
                    <Clock className="w-3.5 h-3.5 text-slate-600 mx-auto" />
                    <div className="text-xs text-slate-600 mt-0.5 whitespace-nowrap">{train.distanceKm} km</div>
                  </div>
                  <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${meta.ribbon}20, ${meta.ribbon}60)` }} />
                </div>
              </div>

              <div className="text-right min-w-0 flex-1">
                <div className="text-2xl font-extrabold text-white leading-none">{train.arrival || '—'}</div>
                <div className="text-xs text-slate-400 flex items-center gap-1 mt-1 justify-end truncate" title={train.toStation.name}>
                  <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="truncate">{train.toStation.name}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px h-20 self-center"
            style={{ background: 'rgba(99,102,241,0.15)' }} />

          {/* Fare + Book */}
          <div className="flex md:flex-col items-center md:items-end gap-4 md:gap-3 md:min-w-44">
            <div className="text-right">
              <div className="text-xs text-slate-500 mb-0.5 font-medium">{activeClass}</div>
              <div className="text-3xl font-extrabold text-white flex items-center gap-0.5 justify-end">
                {hasSurcharge && (
                  <span className="line-through text-slate-500 mr-2 text-sm font-semibold">₹{baseFare}</span>
                )}
                <IndianRupee className="w-5 h-5" style={{ color: meta.color }} />
                {currentFare || '—'}
              </div>
              {hasSurcharge && (
                <div className="text-[9px] text-amber-500 font-bold uppercase tracking-wider mt-0.5">Surcharge Active</div>
              )}
              <div className="text-xs text-slate-600 mt-0.5">per passenger</div>
            </div>
            <Link
              href={`/booking/${train.id}?from=${train.fromStation.code}&to=${train.toStation.code}&date=${train.journeyDate || ''}&class=${activeClass}`}
              className="btn-primary text-sm py-2.5 px-6 whitespace-nowrap rounded-xl"
              style={{
                background: `linear-gradient(135deg, ${meta.ribbon}, ${meta.ribbon}cc)`,
                boxShadow: `0 4px 15px ${meta.ribbon}40`,
                color: train.type === 'Rajdhani' ? '#0a0a0a' : 'white',
                borderRadius: '0.75rem',
              }}>
              Book Now <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Class fare chips */}
        <div className="mt-4 pt-4 flex gap-2 flex-wrap"
          style={{ borderTop: '1px solid rgba(99,102,241,0.1)' }}>
          {Object.entries(train.fares).map(([cls, fare]: [string, any]) => {
            const clsBase = train.baseFares ? train.baseFares[cls] : fare;
            const isClsSurcharged = fare > clsBase;
            return (
              <div key={cls}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200"
                style={activeClass === cls
                  ? { background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.35)' }
                  : { background: 'rgba(15,23,42,0.5)', color: '#475569', border: '1px solid rgba(71,85,105,0.2)' }
                }>
                {cls}: {isClsSurcharged && <span className="line-through text-slate-600 mr-1">₹{clsBase}</span>}
                <span className="font-extrabold text-white">₹{fare}</span>
              </div>
            );
          })}
        </div>

        {/* Predictive Delay Alert & Route Toggle Row */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
          {!loadingPred && prediction && (
            <div className="p-3 border border-slate-800/40 text-xs font-semibold rounded-2xl flex-1 flex items-center justify-between"
              style={{
                background: prediction.riskFactor === 'High' 
                  ? 'rgba(239,68,68,0.06)' 
                  : prediction.riskFactor === 'Medium' 
                  ? 'rgba(245,158,11,0.06)' 
                  : 'rgba(16,185,129,0.06)',
                borderColor: prediction.riskFactor === 'High' 
                  ? 'rgba(239,68,68,0.15)' 
                  : prediction.riskFactor === 'Medium' 
                  ? 'rgba(245,158,11,0.15)' 
                  : 'rgba(16,185,129,0.15)',
                color: prediction.riskFactor === 'High' 
                  ? '#f87171' 
                  : prediction.riskFactor === 'Medium' 
                  ? '#fbbf24' 
                  : '#34d399'
              }}>
              <span>Predictive Delay Analysis</span>
              <span>
                {prediction.riskFactor} Risk ({prediction.delayProbability}% chance of delay, averaging {prediction.predictedDelayMins} mins)
              </span>
            </div>
          )}
          
          <button
            onClick={() => setShowRoute(!showRoute)}
            className="px-3.5 py-2.5 rounded-2xl text-[10px] font-bold uppercase tracking-wider transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shrink-0"
            style={{
              background: showRoute ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
              color: showRoute ? '#a5b4fc' : '#94a3b8',
              border: showRoute ? '1px solid rgba(99,102,241,0.35)' : '1px solid rgba(255,255,255,0.06)'
            }}
          >
            {showRoute ? 'Hide Route Stops' : 'View Route Stops'}
          </button>
        </div>

        {/* Show collapsible route halts */}
        {showRoute && train.routes && (
          <div className="mt-4 pt-4 border-t border-slate-800/40 animate-fade-in text-xs">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <Train className="w-3.5 h-3.5 text-indigo-400" /> 
              Complete Train Route & Halts
            </h4>
            <div className="relative pl-6 space-y-4 my-2">
              {/* Vertical timeline line */}
              <div className="absolute left-[9px] top-1.5 bottom-1.5 w-0.5 bg-slate-800" />
              
              {train.routes.map((st: any, sIdx: number) => {
                const isLast = sIdx === train.routes.length - 1;
                const isSearchOrigin = st.stationCode === train.fromStation.code;
                const isSearchDest = st.stationCode === train.toStation.code;
                
                const inSegment = st.stopNumber >= train.departureStop && st.stopNumber <= train.alignment;
                
                let dotColor = 'bg-slate-900 border-2 border-slate-700 text-slate-500';
                let textColor = 'text-slate-500';
                let segmentLineHighlight = false;
                
                if (inSegment) {
                  dotColor = 'bg-indigo-500/10 border-2 border-indigo-400 text-indigo-300 ring-2 ring-indigo-500/10';
                  textColor = 'text-white';
                  segmentLineHighlight = true;
                }
                if (isSearchOrigin) {
                  dotColor = 'bg-indigo-500 border-2 border-white text-indigo-100 ring-4 ring-indigo-500/20';
                  textColor = 'text-indigo-300 font-extrabold';
                }
                if (isSearchDest) {
                  dotColor = 'bg-amber-400 border-2 border-white text-amber-955 ring-4 ring-amber-500/20';
                  textColor = 'text-amber-300 font-extrabold';
                }
                
                const timeToShow = st.arrivalTime || st.departureTime || '—';
                const estTime = train.delayMinutes > 0 && timeToShow !== '—'
                  ? addMinutesToTime(timeToShow, train.delayMinutes)
                  : timeToShow;

                return (
                  <div key={st.stopNumber} className="relative flex justify-between items-start">
                    {segmentLineHighlight && !isLast && (
                      <div className="absolute left-[-17px] top-4 h-full w-0.5 bg-indigo-500 z-0" />
                    )}
                    
                    <div className={`absolute -left-6 w-5 h-5 rounded-full z-10 flex items-center justify-center text-[8px] font-extrabold ${dotColor}`}>
                      {st.stopNumber}
                    </div>
                    
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs font-bold ${textColor}`}>
                          {st.stationName}
                        </span>
                        <span className="font-mono text-[9px] text-slate-500">({st.stationCode})</span>
                        {isSearchOrigin && (
                          <span className="px-1.5 py-0.2 rounded text-[7px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wide">Boarding</span>
                        )}
                        {isSearchDest && (
                          <span className="px-1.5 py-0.2 rounded text-[7px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wide">Destination</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                        Platform {st.platform || '1'} · {st.distanceKm} km
                      </div>
                    </div>
                    
                    <div className="text-right flex items-center gap-4 text-[10px] sm:text-xs shrink-0">
                      <div className="text-right">
                        <span className="text-slate-600 font-bold uppercase text-[8px] tracking-wider block">Scheduled</span>
                        <span className="text-slate-400 font-bold font-mono">{timeToShow}</span>
                      </div>
                      {train.delayMinutes > 0 && timeToShow !== '—' && (
                        <div className="text-right">
                          <span className="text-amber-500/80 font-bold uppercase text-[8px] tracking-wider block">Expected</span>
                          <span className="text-amber-400 font-bold font-mono">{estTime}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function SearchResults() {
  const params = useSearchParams();
  const router = useRouter();

  const [trains, setTrains] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [stations, setStations] = useState<any[]>([]);
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const [fromCode, setFromCode] = useState(params.get('from') || '');
  const [toCode, setToCode] = useState(params.get('to') || '');
  const [fromSuggestions, setFromSuggestions] = useState<any[]>([]);
  const [toSuggestions, setToSuggestions] = useState<any[]>([]);
  const [date, setDate] = useState(params.get('date') || new Date().toISOString().split('T')[0]);
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedClass, setSelectedClass] = useState('Sleeper');
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity]     = useState('');

  const today = new Date().toISOString().split('T')[0];

  const filterStations = (q: string) =>
    stations.filter(s =>
      s.name.toLowerCase().includes(q.toLowerCase()) ||
      s.code.toLowerCase().includes(q.toLowerCase()) ||
      s.city.toLowerCase().includes(q.toLowerCase())
    ).slice(0, 6);

  useEffect(() => {
    trainsAPI.getStations().then(res => {
      const list = res.data.stations || [];
      setStations(list);

      // Resolve display name for initial codes
      const initialFrom = params.get('from') || '';
      const initialTo = params.get('to') || '';
      if (initialFrom) {
        const s = list.find((item: any) => item.code.toUpperCase() === initialFrom.toUpperCase());
        if (s) setFromInput(`${s.name} (${s.code})`);
        else setFromInput(initialFrom);
      }
      if (initialTo) {
        const s = list.find((item: any) => item.code.toUpperCase() === initialTo.toUpperCase());
        if (s) setToInput(`${s.name} (${s.code})`);
        else setToInput(initialTo);
      }
    }).catch(() => {});
  }, [params]);

  useEffect(() => {
    if (fromCode && toCode) doSearch(fromCode, toCode);
  }, [fromCode, toCode, date, typeFilter]);

  const doSearch = async (fCode = fromCode, tCode = toCode) => {
    if (!fCode || !tCode) return;
    setLoading(true);
    try {
      const r = await trainsAPI.search(fCode, tCode, date, typeFilter);
      setTrains(r.data.trains);
      setFromCity(r.data.from?.city || fCode);
      setToCity(r.data.to?.city || tCode);
    } catch { setTrains([]); } finally { setLoading(false); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let resolvedFrom = fromCode;
    let resolvedTo = toCode;

    if (!resolvedFrom && fromInput) {
      const match = stations.find(s =>
        s.name.toLowerCase() === fromInput.trim().toLowerCase() ||
        s.code.toUpperCase() === fromInput.trim().toUpperCase() ||
        s.name.toLowerCase().includes(fromInput.trim().toLowerCase())
      );
      if (match) resolvedFrom = match.code;
    }

    if (!resolvedTo && toInput) {
      const match = stations.find(s =>
        s.name.toLowerCase() === toInput.trim().toLowerCase() ||
        s.code.toUpperCase() === toInput.trim().toUpperCase() ||
        s.name.toLowerCase().includes(toInput.trim().toLowerCase())
      );
      if (match) resolvedTo = match.code;
    }

    if (!resolvedFrom || !resolvedTo) {
      toast.error('Please select valid stations');
      return;
    }

    setFromCode(resolvedFrom);
    setToCode(resolvedTo);
    doSearch(resolvedFrom, resolvedTo);

    const p = new URLSearchParams({ from: resolvedFrom, to: resolvedTo });
    if (date) p.set('date', date);
    router.replace(`/trains/search?${p}`, { scroll: false });
  };

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Search bar */}
      <form onSubmit={handleSubmit} className="glass-elevated rounded-3xl p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          {/* From */}
          <div className="flex-1 relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 pointer-events-none" />
            <input className="input-field pl-10" placeholder="Select origin station..."
              value={fromInput}
              onChange={e => {
                const val = e.target.value;
                setFromInput(val);
                if (!val) setFromCode('');
                const exact = stations.find(s => s.code.toUpperCase() === val.trim().toUpperCase() || s.name.toLowerCase() === val.trim().toLowerCase());
                if (exact) setFromCode(exact.code);
                setFromSuggestions(filterStations(val));
              }}
              onBlur={() => setFromSuggestions([])}
              autoComplete="off"
            />
            {fromSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-xl overflow-hidden shadow-2xl"
                style={{ background: 'rgba(8,13,36,0.98)', border: '1px solid rgba(99,102,241,0.2)' }}>
                {fromSuggestions.map(s => (
                  <button key={s.id} type="button"
                    onMouseDown={e => { e.preventDefault(); setFromInput(`${s.name} (${s.code})`); setFromCode(s.code); setFromSuggestions([]); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-800/60 flex items-center gap-2 text-sm transition-colors">
                    <MapPin className="w-3 h-3 text-indigo-400 shrink-0" />
                    <span className="text-slate-200 font-medium">{s.name}</span>
                    <span className="text-slate-500 text-xs ml-auto font-mono">{s.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* To */}
          <div className="flex-1 relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400 pointer-events-none" />
            <input className="input-field pl-10" placeholder="Select destination station..."
              value={toInput}
              onChange={e => {
                const val = e.target.value;
                setToInput(val);
                if (!val) setToCode('');
                const exact = stations.find(s => s.code.toUpperCase() === val.trim().toUpperCase() || s.name.toLowerCase() === val.trim().toLowerCase());
                if (exact) setToCode(exact.code);
                setToSuggestions(filterStations(val));
              }}
              onBlur={() => setToSuggestions([])}
              autoComplete="off"
            />
            {toSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-xl overflow-hidden shadow-2xl"
                style={{ background: 'rgba(8,13,36,0.98)', border: '1px solid rgba(99,102,241,0.2)' }}>
                {toSuggestions.map(s => (
                  <button key={s.id} type="button"
                    onMouseDown={e => { e.preventDefault(); setToInput(`${s.name} (${s.code})`); setToCode(s.code); setToSuggestions([]); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-800/60 flex items-center gap-2 text-sm transition-colors">
                    <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="text-slate-200 font-medium">{s.name}</span>
                    <span className="text-slate-500 text-xs ml-auto font-mono">{s.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="submit" className="btn-primary px-7 shrink-0">
            <Search className="w-4 h-4" /> Search
          </button>
        </div>

        {/* Type filter chips */}
        <div className="flex gap-2 flex-wrap">
          {TRAIN_TYPES.map(t => {
            const meta = t ? getTypeMeta(t) : null;
            const isActive = typeFilter === t;
            return (
              <button key={t} type="button"
                onClick={() => setTypeFilter(t)}
                className="px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200"
                style={isActive && meta
                  ? { background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }
                  : isActive
                  ? { background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }
                  : { background: 'transparent', color: '#64748b', border: '1px solid rgba(100,116,139,0.2)' }
                }>
                {t || 'All Types'}
              </button>
            );
          })}
        </div>
      </form>

      {/* Results header */}
      {(fromCity || fromCode) && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-7">
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
              {fromCity || fromCode}
              <ArrowRight className="w-5 h-5 text-slate-600" />
              {toCity || toCode}
              {date && <span className="text-sm text-slate-500 font-normal">on {date}</span>}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {loading ? 'Searching...' : `${trains.length} train${trains.length !== 1 ? 's' : ''} found`}
            </p>
          </div>
          {/* Class selector */}
          <div className="flex gap-1.5 flex-wrap">
            {CLASSES.map(c => (
              <button key={c} onClick={() => setSelectedClass(c)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200"
                style={selectedClass === c
                  ? { background: 'rgba(99,102,241,0.18)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.4)' }
                  : { background: 'transparent', color: '#475569', border: '1px solid rgba(71,85,105,0.3)' }
                }>
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="relative">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
            <div className="absolute inset-0 animate-spin-slow" style={{
              background: 'conic-gradient(from 0deg, transparent 70%, rgba(99,102,241,0.4))',
              borderRadius: '50%',
            }} />
          </div>
          <p className="text-slate-500 text-sm">Searching all trains...</p>
        </div>
      )}

      {/* No results */}
      {!loading && trains.length === 0 && (fromCode || toCode) && (
        <div className="text-center py-24">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
            <Train className="w-10 h-10 text-slate-600" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-300 mb-2">No trains found</h3>
          <p className="text-slate-500 mb-6">Try searching other stations or browse the full timetable.</p>
          <Link href="/timetable" className="btn-secondary">View Timetable</Link>
        </div>
      )}

      {/* Train cards */}
      <div className="space-y-4">
        {trains.map((train, idx) => (
          <SearchTrainCard key={train.id} train={train} selectedClass={selectedClass} idx={idx} />
        ))}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        <p className="text-slate-500 text-sm">Loading...</p>
      </div>
    }>
      <SearchResults />
    </Suspense>
  );
}
