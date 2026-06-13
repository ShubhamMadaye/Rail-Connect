'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Train, Search, Clock, Utensils, MapPin, ArrowRight,
  ChevronRight, Zap, Shield, Smartphone, ArrowUpRight,
  TrendingUp, Users, Star, CheckCircle2, IndianRupee,
} from 'lucide-react';
import { trainsAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import toast from 'react-hot-toast';

const EXPRESS_ROUTES = [
  { from: 'NDLS', to: 'MMCT', fromCity: 'New Delhi', toCity: 'Mumbai', duration: '~16h', color: '#F59E0B' },
  { from: 'MMCT', to: 'MAS',  fromCity: 'Mumbai',    toCity: 'Chennai', duration: '~21h', color: '#6366f1' },
  { from: 'NDLS', to: 'HWH',  fromCity: 'New Delhi', toCity: 'Kolkata', duration: '~17h', color: '#ec4899' },
  { from: 'SBC',  to: 'MAS',  fromCity: 'Bangalore', toCity: 'Chennai', duration: '~6h',  color: '#10b981' },
];

const LOCAL_ROUTES = [
  { from: 'CSTM', to: 'TNA', fromCity: 'CSMT Mumbai', toCity: 'Thane',  duration: '~55m', color: '#10b981' },
  { from: 'CSTM', to: 'DR',  fromCity: 'CSMT Mumbai', toCity: 'Dadar',  duration: '~15m', color: '#3b82f6' },
  { from: 'DR',   to: 'TNA', fromCity: 'Dadar',       toCity: 'Thane',  duration: '~40m', color: '#a855f7' },
  { from: 'LTT',  to: 'TNA', fromCity: 'LTT Kurla',   toCity: 'Thane',  duration: '~25m', color: '#f97316' },
];

const STATS = [
  { label: 'Trains Tracked',  value: '200+',    icon: <Train className="w-4 h-4" />,        color: '#6366f1' },
  { label: 'Daily Bookings',  value: '50,000+', icon: <TrendingUp className="w-4 h-4" />,   color: '#F59E0B' },
  { label: 'Happy Travellers',value: '2M+',     icon: <Users className="w-4 h-4" />,        color: '#10b981' },
  { label: 'Cities Connected', value: '500+',   icon: <MapPin className="w-4 h-4" />,       color: '#ec4899' },
];

const FEATURES = [
  {
    icon: <Train className="w-6 h-6" />,
    title: 'Smart Booking',
    desc: 'Book any class — General, Sleeper, 3AC, 2AC, or 1AC. Get your PNR instantly.',
    color: '#6366f1',
    href: '/trains/search',
    size: 'large',
  },
  {
    icon: <Clock className="w-6 h-6" />,
    title: 'Live Delays',
    desc: 'Real-time delay tracking — green, yellow, or red at a glance.',
    color: '#F59E0B',
    href: '/timetable',
    size: 'small',
  },
  {
    icon: <Utensils className="w-6 h-6" />,
    title: 'In-Train Food',
    desc: 'Order from station vendors to your seat. Real-time tracking.',
    color: '#10b981',
    href: '/dashboard',
    size: 'small',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Secure Payments',
    desc: 'Your data & payments are protected. Instant e-ticket confirmation.',
    color: '#a855f7',
    href: '/trains/search',
    size: 'small',
  },
  {
    icon: <MapPin className="w-6 h-6" />,
    title: 'Full Timetable',
    desc: 'Browse all trains with live status. Filter, sort, plan your trip.',
    color: '#ec4899',
    href: '/timetable',
    size: 'small',
  },
  {
    icon: <Smartphone className="w-6 h-6" />,
    title: 'PNR Lookup',
    desc: 'Check any booking by PNR — passengers, seats, food orders.',
    color: '#3b82f6',
    href: '/dashboard',
    size: 'large',
  },
];

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput]     = useState('');
  const [fromCode, setFromCode]   = useState('');
  const [toCode, setToCode]       = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [stations, setStations]           = useState<any[]>([]);
  const [fromSuggestions, setFromSuggestions] = useState<any[]>([]);
  const [toSuggestions, setToSuggestions]     = useState<any[]>([]);
  const [routeTab, setRouteTab] = useState<'express' | 'local'>('express');

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    trainsAPI.getStations().then(r => setStations(r.data.stations)).catch(() => {});
  }, []);

  const filterStations = (q: string) =>
    stations.filter(s =>
      s.name.toLowerCase().includes(q.toLowerCase()) ||
      s.code.toLowerCase().includes(q.toLowerCase()) ||
      s.city.toLowerCase().includes(q.toLowerCase())
    ).slice(0, 6);

  const handleSearch = (e: React.FormEvent) => {
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

    const params = new URLSearchParams({ from: resolvedFrom, to: resolvedTo });
    if (date) params.set('date', date);
    router.push(`/trains/search?${params}`);
  };

  const routes = routeTab === 'express' ? EXPRESS_ROUTES : LOCAL_ROUTES;

  return (
    <div className="min-h-screen">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-28 pb-44">

        {/* Background layers */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1541818270560-60b61dc77a63?q=80&w=2670&auto=format&fit=crop"
            alt="Indian railway"
            className="w-full h-full object-cover"
            style={{ opacity: 0.18, filter: 'saturate(0.6)' }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(3,6,26,0.6) 0%, rgba(3,6,26,0.9) 60%, #03061A 100%)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(3,6,26,0.8) 0%, transparent 40%, transparent 60%, rgba(3,6,26,0.8) 100%)' }} />
        </div>

        {/* Ambient orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="absolute top-40 right-1/4 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)', filter: 'blur(40px)' }} />

        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <div key={i} className="absolute rounded-full pointer-events-none animate-float"
            style={{
              width: `${4 + (i % 3) * 3}px`,
              height: `${4 + (i % 3) * 3}px`,
              background: i % 2 === 0 ? 'rgba(99,102,241,0.4)' : 'rgba(245,158,11,0.35)',
              left: `${10 + i * 14}%`,
              top: `${15 + (i % 4) * 15}%`,
              animationDelay: `${i * 0.7}s`,
              animationDuration: `${3 + i * 0.5}s`,
            }}
          />
        ))}

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 animate-fade-in-up"
              style={{
                background: 'rgba(99,102,241,0.1)',
                border: '1px solid rgba(99,102,241,0.25)',
              }}>
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-indigo-300 text-xs font-semibold tracking-wide uppercase">India&apos;s Smartest Railway Platform</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-[1.08] tracking-tight animate-fade-in-up delay-100">
              <span style={{
                background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 40%, #fcd34d 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>Journey Made</span>
              <br />
              <span className="text-white">Effortless.</span>
            </h1>

            <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed animate-fade-in-up delay-200">
              Book tickets, track trains live, order food on board —<br className="hidden md:block" />
              all in one premium platform.
            </p>
          </div>

          {/* Search Card */}
          <div className="max-w-3xl mx-auto animate-fade-in-up delay-300">
            <div className="glass-elevated rounded-3xl p-7">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
                  <Search className="w-3.5 h-3.5 text-white" />
                </div>
                <h2 className="text-base font-bold text-white">Find Your Train</h2>
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="live-dot" />
                  <span className="text-xs text-emerald-400 font-semibold">Live tracking active</span>
                </div>
              </div>

              <form onSubmit={handleSearch}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {/* From */}
                  <div className="relative">
                    <label className="input-label">From</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 pointer-events-none" />
                      <input
                        id="search-from"
                        className="input-field pl-10"
                        placeholder="Select origin station..."
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
                    </div>
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
                  <div className="relative">
                    <label className="input-label">To</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400 pointer-events-none" />
                      <input
                        id="search-to"
                        className="input-field pl-10"
                        placeholder="Select destination station..."
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
                    </div>
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
                </div>

                <button type="submit" className="btn-primary w-full justify-center py-3.5 text-base rounded-xl"
                  style={{ borderRadius: '0.875rem' }}>
                  <Search className="w-5 h-5" />
                  Search Trains
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ── LIVE STATS STRIP ─────────────────────────────────── */}
      <section className="relative -mt-8 z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STATS.map((stat, i) => (
            <div key={stat.label}
              className={`glass rounded-2xl p-4 text-center card-hover animate-fade-in-up delay-${(i + 1) * 100}`}>
              <div className="flex items-center justify-center gap-1.5 mb-1.5">
                <div className="w-5 h-5" style={{ color: stat.color }}>{stat.icon}</div>
              </div>
              <div className="text-2xl font-extrabold text-white mb-0.5" style={{ color: stat.color }}>
                {stat.value}
              </div>
              <div className="text-xs text-slate-500 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── POPULAR ROUTES ────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Popular Routes</h2>
          </div>
          <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'rgba(8,13,36,0.8)', border: '1px solid rgba(99,102,241,0.15)' }}>
            <button
              onClick={() => setRouteTab('express')}
              className="text-xs px-4 py-1.5 rounded-lg font-bold transition-all duration-200"
              style={routeTab === 'express'
                ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white' }
                : { color: '#64748b' }}>
              Express
            </button>
            <button
              onClick={() => setRouteTab('local')}
              className="text-xs px-4 py-1.5 rounded-lg font-bold transition-all duration-200"
              style={routeTab === 'local'
                ? { background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white' }
                : { color: '#64748b' }}>
              Mumbai Local
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {routes.map(route => (
            <Link
              key={`${route.from}-${route.to}`}
              href={`/trains/search?from=${route.from}&to=${route.to}`}
              className="glass rounded-2xl p-4 card-hover group overflow-hidden relative"
              style={{ borderLeft: `3px solid ${route.color}` }}>
              {/* Background glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ background: `radial-gradient(ellipse at bottom left, ${route.color}10 0%, transparent 70%)` }} />

              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-mono text-slate-500">{route.from}</div>
                  <ArrowRight className="w-3 h-3 text-slate-600 group-hover:translate-x-0.5 transition-transform" style={{ color: route.color }} />
                  <div className="text-xs font-mono text-slate-500">{route.to}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-white leading-tight">{route.fromCity}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{route.toCity}</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" style={{ color: route.color }} />
                  <span className="text-xs font-bold" style={{ color: route.color }}>{route.duration}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── FEATURES BENTO GRID ─────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
            <Star className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-widest">Platform Features</span>
          </div>
          <h2 className="text-4xl font-extrabold text-white mb-3 tracking-tight">Everything You Need</h2>
          <p className="text-slate-500 text-lg">One platform. Complete railway journey experience.</p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Large card left */}
          <Link href="/trains/search"
            className="md:col-span-5 glass rounded-3xl p-7 card-hover group relative overflow-hidden"
            style={{ border: `1px solid rgba(99,102,241,0.15)` }}>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at top left, rgba(99,102,241,0.1) 0%, transparent 65%)' }} />
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110 duration-300"
                style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
                <Train className="w-7 h-7" style={{ color: '#818cf8' }} />
              </div>
              <h3 className="text-xl font-extrabold text-white mb-2">Smart Booking</h3>
              <p className="text-slate-400 leading-relaxed text-sm mb-5">
                Book any class — General, Sleeper, 3AC, 2AC, or 1AC. Get your PNR instantly and manage all bookings from one dashboard.
              </p>
              <div className="flex items-center gap-2 text-indigo-400 text-sm font-bold group-hover:gap-3 transition-all duration-200">
                Book a ticket <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
          </Link>

          {/* Small cards top right */}
          <div className="md:col-span-7 grid grid-cols-2 gap-4">
            {[
              { icon: <Clock className="w-5 h-5" />, title: 'Live Delays', desc: 'Real-time delay tracking — green, yellow, or red at a glance.', color: '#F59E0B', href: '/timetable' },
              { icon: <Utensils className="w-5 h-5" />, title: 'In-Train Food', desc: 'Order from station vendors directly to your seat.', color: '#10b981', href: '/dashboard' },
              { icon: <Shield className="w-5 h-5" />, title: 'Secure Payments', desc: 'Instant e-ticket confirmation. Easy cancellation.', color: '#a855f7', href: '/trains/search' },
              { icon: <MapPin className="w-5 h-5" />, title: 'Full Timetable', desc: 'All trains across India with live status filters.', color: '#ec4899', href: '/timetable' },
            ].map(f => (
              <Link key={f.title} href={f.href}
                className="glass rounded-2xl p-5 card-hover group relative overflow-hidden"
                style={{ border: `1px solid ${f.color}18` }}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ background: `radial-gradient(ellipse at top left, ${f.color}12 0%, transparent 70%)` }} />
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110 duration-200"
                    style={{ background: `${f.color}18`, border: `1px solid ${f.color}30` }}>
                    <div style={{ color: f.color }}>{f.icon}</div>
                  </div>
                  <h3 className="text-sm font-extrabold text-white mb-1.5">{f.title}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">{f.desc}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Wide bottom card */}
          <Link href="/dashboard"
            className="md:col-span-12 glass rounded-3xl p-7 card-hover group relative overflow-hidden"
            style={{ border: '1px solid rgba(59,130,246,0.15)' }}>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at bottom right, rgba(59,130,246,0.08) 0%, transparent 60%)' }} />
            <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)' }}>
                <Smartphone className="w-7 h-7 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-extrabold text-white mb-1.5">PNR Lookup & Journey Management</h3>
                <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
                  Check any booking by PNR — passenger details, seat numbers, journey status, and food orders. All in one unified dashboard.
                </p>
              </div>
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm shrink-0 group-hover:gap-3 transition-all duration-200">
                Open Dashboard <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
        <div className="relative rounded-3xl overflow-hidden" style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.1) 50%, rgba(245,158,11,0.08) 100%)',
          border: '1px solid rgba(99,102,241,0.2)',
        }}>
          {/* Decorative orb */}
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
          <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }} />

          {/* Track decoration */}
          <div className="absolute bottom-0 left-0 right-0 h-1 track-dots opacity-30" />

          <div className="relative px-8 md:px-16 py-14 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5"
              style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-300 text-xs font-bold uppercase tracking-widest">Free Registration · No Hidden Fees</span>
            </div>

            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
              Ready to Travel{' '}
              <span style={{
                background: 'linear-gradient(135deg, #818cf8, #fcd34d)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>Smarter?</span>
            </h2>

            <p className="text-slate-400 mb-8 max-w-lg mx-auto text-lg">
              Join 2M+ passengers who book their rail journey with RailConnect every day.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!user ? (
                <Link href="/register" className="btn-primary py-3.5 px-10 text-base rounded-xl" style={{ borderRadius: '0.875rem' }}>
                  Create Free Account <ChevronRight className="w-5 h-5" />
                </Link>
              ) : (
                <Link href={user.role === 'admin' ? '/admin' : '/dashboard'} className="btn-primary py-3.5 px-10 text-base rounded-xl" style={{ borderRadius: '0.875rem' }}>
                  Go to Dashboard <ChevronRight className="w-5 h-5" />
                </Link>
              )}
              <Link href="/timetable" className="btn-secondary py-3.5 px-10 text-base rounded-xl" style={{ borderRadius: '0.875rem' }}>
                View Live Timetable
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
