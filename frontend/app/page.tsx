'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import {
  Train, Search, Clock, Utensils, MapPin, ArrowRight,
  ChevronRight, Zap, Shield, Smartphone, ArrowUpRight,
  TrendingUp, Users, Star, CheckCircle2, IndianRupee,
  Layers, X, Map, Sparkles
} from 'lucide-react';
import { trainsAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import toast from 'react-hot-toast';
import FoodCartTray from '@/components/FoodCartTray';

// ────── STATIC CONSTANTS ──────────────────────────────────────────

const EXPRESS_ROUTES = [
  { from: 'NDLS', to: 'MMCT', fromCity: 'New Delhi', toCity: 'Mumbai', duration: '~16h', color: '#F59E0B' },
  { from: 'MMCT', to: 'MAS',  fromCity: 'Mumbai',    toCity: 'Chennai', duration: '~21h', color: '#4F46E5' },
  { from: 'NDLS', to: 'HWH',  fromCity: 'New Delhi', toCity: 'Kolkata', duration: '~17h', color: '#7C3AED' },
  { from: 'SBC',  to: 'MAS',  fromCity: 'Bangalore', toCity: 'Chennai', duration: '~6h',  color: '#10B981' },
];

const LOCAL_ROUTES = [
  { from: 'CSTM', to: 'TNA', fromCity: 'CSMT Mumbai', toCity: 'Thane',  duration: '~55m', color: '#10B981' },
  { from: 'CSTM', to: 'DR',  fromCity: 'CSMT Mumbai', toCity: 'Dadar',  duration: '~15m', color: '#06B6D4' },
  { from: 'DR',   to: 'TNA', fromCity: 'Dadar',       toCity: 'Thane',  duration: '~40m', color: '#7C3AED' },
  { from: 'LTT',  to: 'TNA', fromCity: 'LTT Kurla',   toCity: 'Thane',  duration: '~25m', color: '#F59E0B' },
];

const TESTIMONIALS = [
  { name: 'Rohan Deshmukh', role: 'Daily Commuter (Mumbai Local)', rating: 5, content: 'RailConnect has completely changed how I track train delays. The telemetry updates feel real-time and help me avoid crowded stations.', delay: 0.1 },
  { name: 'Anjali Sharma', role: 'Business Traveller', rating: 5, content: 'The AI delay predictor has been shockingly accurate during monsoons. Booking meals straight to my coach seat makes inter-city journeys so comfortable.', delay: 0.2 },
  { name: 'Karthik Rao', role: 'Tech Lead & Explorer', rating: 4, content: 'Extremely clean and premium interface. Managing PNR tickets and viewing coach layouts in 2D is a massive step up from traditional layouts.', delay: 0.3 },
];

// ────── SUBCOMPONENTS ──────────────────────────────────────────────

// 1. Live Operations Telemetry Dashboard
function LiveOperationsDashboard() {
  const [speed, setSpeed] = useState(87);
  const [eta, setEta] = useState(13);

  useEffect(() => {
    const interval = setInterval(() => {
      setSpeed(prev => {
        const delta = Math.floor(Math.random() * 5) - 2;
        const next = prev + delta;
        return next > 95 ? 95 : next < 78 ? 78 : next;
      });
      setEta(prev => {
        if (prev <= 1) return 15;
        return Math.random() > 0.8 ? prev - 1 : prev;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-elevated rounded-3xl p-6 border border-cyan-500/10 relative overflow-hidden h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
            </span>
            <span className="text-xs font-bold tracking-wider text-cyan-400 uppercase">Live Telemetry Dashboard</span>
          </div>
          <div className="text-[10px] font-mono text-slate-600">SYSTEM OK // 120Hz</div>
        </div>

        <div className="relative py-8 px-4 bg-slate-950/40 rounded-2xl border border-slate-900/80 mb-6">
          <div className="flex justify-between items-center relative z-10">
            <div className="text-center">
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 border-2 border-indigo-500 flex items-center justify-center text-[10px] font-bold text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]">
                CSMT
              </div>
              <div className="text-[11px] font-bold text-slate-300 mt-2">Mumbai CSMT</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-400">
                PUNE
              </div>
              <div className="text-[11px] font-bold text-slate-400 mt-2">Pune Jn.</div>
            </div>
          </div>

          <div className="absolute top-[48px] left-[52px] right-[52px] h-[2px] bg-slate-800 rounded-full overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-cyan-400 to-transparent" />
          </div>

          <motion.div
            className="absolute top-[36px] left-[52px] -translate-x-1/2"
            animate={{ x: ["0%", "85%", "0%"] }}
            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white shadow-[0_0_20px_rgba(6,182,212,0.6)] border border-cyan-300/30">
              <Train className="w-4 h-4" />
            </div>
          </motion.div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-950/30 p-3 rounded-xl border border-slate-900">
          <div className="text-slate-500 text-[9px] font-bold uppercase tracking-wider mb-1">Speed</div>
          <div className="text-base font-extrabold text-cyan-400 font-mono">
            {speed} <span className="text-[10px] text-slate-500 font-sans">km/h</span>
          </div>
        </div>
        <div className="bg-slate-950/30 p-3 rounded-xl border border-slate-900">
          <div className="text-slate-500 text-[9px] font-bold uppercase tracking-wider mb-1">ETA</div>
          <div className="text-base font-extrabold text-amber-500 font-mono">
            {eta} <span className="text-[10px] text-slate-500 font-sans">mins</span>
          </div>
        </div>
        <div className="bg-slate-950/30 p-3 rounded-xl border border-slate-900">
          <div className="text-slate-500 text-[9px] font-bold uppercase tracking-wider mb-1">Signal</div>
          <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10B981]" />
            GREEN
          </div>
        </div>
        <div className="bg-slate-950/30 p-3 rounded-xl border border-slate-900">
          <div className="text-slate-500 text-[9px] font-bold uppercase tracking-wider mb-1">Track Status</div>
          <div className="text-xs font-bold text-indigo-400 flex items-center gap-1 mt-0.5">
            <Zap className="w-3.5 h-3.5 text-indigo-400" /> CLEAR
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. Interactive SVG India Network Visualization Map
function RailwayNetworkMap() {
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);

  const cities = [
    { id: 'del', name: 'New Delhi', code: 'NDLS', x: 150, y: 70, depart: 320, color: '#F59E0B' },
    { id: 'mum', name: 'Mumbai CSMT', code: 'CSMT', x: 80, y: 180, depart: 280, color: '#4F46E5' },
    { id: 'kol', name: 'Kolkata', code: 'HWH', x: 260, y: 150, depart: 190, color: '#7C3AED' },
    { id: 'ben', name: 'Bengaluru', code: 'SBC', x: 120, y: 250, depart: 140, color: '#06B6D4' },
    { id: 'che', name: 'Chennai', code: 'MAS', x: 160, y: 260, depart: 160, color: '#10B981' }
  ];

  return (
    <div className="glass rounded-3xl p-6 border border-white/10 relative overflow-hidden h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Map className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">Trunk Route Map</span>
        </div>
        <p className="text-[11px] text-slate-500 mb-6">Interactive view of India&apos;s primary trunk rail corridors. Hover on nodes.</p>
      </div>

      <div className="relative flex justify-center items-center py-4 bg-slate-950/40 rounded-2xl border border-slate-900/60 max-w-[280px] mx-auto w-full">
        <svg width="260" height="280" viewBox="0 0 280 280" className="overflow-visible">
          <path d="M 150 70 L 80 180" stroke="rgba(99, 102, 241, 0.12)" strokeWidth="1.5" className="dash-connection" />
          <path d="M 150 70 L 260 150" stroke="rgba(99, 102, 241, 0.12)" strokeWidth="1.5" className="dash-connection" />
          <path d="M 80 180 L 120 250" stroke="rgba(99, 102, 241, 0.12)" strokeWidth="1.5" className="dash-connection" />
          <path d="M 120 250 L 160 260" stroke="rgba(99, 102, 241, 0.12)" strokeWidth="1.5" className="dash-connection" />
          <path d="M 160 260 L 260 150" stroke="rgba(99, 102, 241, 0.12)" strokeWidth="1.5" className="dash-connection" />
          <path d="M 150 70 L 120 250" stroke="rgba(99, 102, 241, 0.12)" strokeWidth="1.5" className="dash-connection" strokeDasharray="4,4" />
          <path d="M 80 180 L 260 150" stroke="rgba(99, 102, 241, 0.12)" strokeWidth="1.5" className="dash-connection" strokeDasharray="4,4" />

          <path d="M 150 70 Q 115 125 80 180" stroke="url(#indigo-gradient)" strokeWidth="2" fill="none" className="opacity-40" />
          <path d="M 80 180 Q 120 215 160 260" stroke="url(#cyan-gradient)" strokeWidth="2" fill="none" className="opacity-40" />
          <path d="M 150 70 Q 205 110 260 150" stroke="url(#saffron-gradient)" strokeWidth="2" fill="none" className="opacity-40" />

          <defs>
            <linearGradient id="indigo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#4F46E5" />
            </linearGradient>
            <linearGradient id="cyan-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4F46E5" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
            <linearGradient id="saffron-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>
          </defs>

          {cities.map(city => {
            const isHovered = hoveredCity === city.id;
            return (
              <g
                key={city.id}
                onMouseEnter={() => setHoveredCity(city.id)}
                onMouseLeave={() => setHoveredCity(null)}
                className="cursor-pointer"
              >
                <circle
                  cx={city.x}
                  cy={city.y}
                  r={isHovered ? 10 : 6}
                  fill={`${city.color}25`}
                  stroke={city.color}
                  strokeWidth="1.5"
                  className="transition-all duration-300"
                />
                <circle
                  cx={city.x}
                  cy={city.y}
                  r="3"
                  fill={city.color}
                />
                <text
                  x={city.x + 8}
                  y={city.y + 3}
                  fill={isHovered ? '#FFFFFF' : '#94A3B8'}
                  fontSize="8px"
                  fontFamily="monospace"
                  fontWeight={isHovered ? 'bold' : 'normal'}
                  className="transition-all duration-200 pointer-events-none"
                >
                  {city.code}
                </text>
              </g>
            );
          })}
        </svg>

        <AnimatePresence>
          {hoveredCity && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-2 left-2 right-2 bg-slate-950/95 border border-indigo-500/20 rounded-xl p-2.5 flex justify-between items-center backdrop-blur-md z-20"
            >
              {(() => {
                const c = cities.find(city => city.id === hoveredCity)!;
                return (
                  <>
                    <div className="text-left">
                      <h4 className="text-[10px] font-bold text-white leading-tight">{c.name}</h4>
                      <p className="text-[8px] text-slate-500 font-mono mt-0.5">{c.code} Junction</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-extrabold text-cyan-400 font-mono">{c.depart}</span>
                      <p className="text-[7px] text-slate-500 uppercase font-black tracking-widest mt-0.5">Departures/Day</p>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-4 border-t border-slate-900 pt-3 text-center">
        <span className="text-[9px] text-slate-600 font-mono uppercase tracking-widest">Map overlay active</span>
      </div>
    </div>
  );
}

// 3. 2D Seat Layout Preview modal
function CoachLayoutPreview() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);

  const seats = Array.from({ length: 18 }, (_, i) => {
    const seatNum = i + 1;
    let type = 'Lower';
    if (seatNum % 6 === 1 || seatNum % 6 === 4) type = 'Lower';
    else if (seatNum % 6 === 2 || seatNum % 6 === 5) type = 'Middle';
    else if (seatNum % 6 === 3) type = 'Upper';
    else if (seatNum % 6 === 0) type = 'Side Upper';

    let status = 'Available';
    if (seatNum === 3 || seatNum === 11 || seatNum === 14) status = 'Booked';
    else if (seatNum === 7 || seatNum === 18) status = 'RAC';

    return { number: seatNum, type, status };
  });

  return (
    <>
      <div className="glass rounded-3xl p-6 border border-white/10 h-full flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">Coach & Seat Analytics</span>
          </div>
          <p className="text-[11px] text-slate-500 mb-5">Preview seat layouts dynamically before booking tickets to match your configuration.</p>
        </div>

        <div className="bg-slate-950/40 border border-slate-900 p-4 rounded-2xl text-center relative overflow-hidden">
          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">Standard Coach Class</div>
          <div className="text-lg font-black text-white tracking-wide">3-Tier AC (3AC)</div>
          <p className="text-[9px] text-indigo-400 font-bold mt-1">Interactive Seat Layout Grid</p>
        </div>

        <button
          onClick={() => setIsOpen(true)}
          className="mt-6 w-full bg-slate-900 hover:bg-slate-800 text-indigo-300 hover:text-white border border-indigo-500/20 rounded-xl py-2.5 text-xs font-bold transition-all"
        >
          View Coach Seat Map
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-slate-900 border border-indigo-500/20 rounded-3xl p-6 max-w-sm w-full relative shadow-[0_25px_60px_rgba(0,0,0,0.8)]"
            >
              <button
                onClick={() => { setIsOpen(false); setSelectedSeat(null); }}
                className="absolute top-4 right-4 p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-sm font-extrabold text-white mb-0.5">Coach Preview Layout</h3>
              <p className="text-xs text-slate-500 mb-5">Click a slot to view berth type and reservation details.</p>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 max-w-xs mx-auto">
                <div className="text-center text-[8px] font-mono text-slate-600 mb-3 tracking-widest uppercase">◄ ENGINE DIRECTION</div>

                <div className="grid grid-cols-6 gap-1.5">
                  {seats.map(seat => {
                    let btnStyle = 'bg-slate-900 border-slate-800 text-slate-400 hover:border-indigo-500/40';
                    if (seat.status === 'Booked') btnStyle = 'bg-red-500/10 border-red-500/25 text-red-500/80 cursor-not-allowed';
                    else if (seat.status === 'RAC') btnStyle = 'bg-amber-500/15 border-amber-500/25 text-amber-500';
                    else if (selectedSeat === seat.number) btnStyle = 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_8px_rgba(99,102,241,0.5)]';

                    return (
                      <button
                        key={seat.number}
                        disabled={seat.status === 'Booked'}
                        onClick={() => setSelectedSeat(seat.number)}
                        className={`aspect-square rounded-md border text-[10px] font-bold font-mono transition-all flex items-center justify-center ${btnStyle}`}
                      >
                        {seat.number}
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center mt-5 border-t border-slate-900 pt-3">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-slate-900 border border-slate-800" />
                    <span className="text-[8px] text-slate-650 font-bold uppercase">Avail</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-amber-500/20 border border-amber-500/30" />
                    <span className="text-[8px] text-slate-650 font-bold uppercase">RAC</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-red-500/20 border border-red-500/30" />
                    <span className="text-[8px] text-slate-650 font-bold uppercase">Booked</span>
                  </div>
                </div>
              </div>

              <div className="h-12 mt-4 flex items-center justify-center border-t border-slate-800/60 pt-3">
                {selectedSeat ? (() => {
                  const s = seats.find(seat => seat.number === selectedSeat)!;
                  return (
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-slate-300">
                        Berth {s.number}: <span className="text-cyan-400 font-extrabold">{s.type}</span> ({s.status})
                      </p>
                    </div>
                  );
                })() : (
                  <p className="text-[10px] text-slate-500 italic">Select any seat above</p>
                )}
              </div>

              <div className="mt-4 text-center">
                <button
                  onClick={() => { setIsOpen(false); setSelectedSeat(null); }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2 text-xs font-bold transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// 4. 3D PNR Flip Card
function PNRFlipCard() {
  const [pnrInput, setPnrInput] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [passenger, setPassenger] = useState('');
  const [train, setTrain] = useState('');
  const [coachSeat, setCoachSeat] = useState('');

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pnrInput || pnrInput.length < 5) {
      toast.error('Please enter a valid PNR code');
      return;
    }
    const names = ['Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sneha Reddy', 'Vikram Singh'];
    const trainsList = ['12951 - Mumbai Rajdhani', '22436 - Vande Bharat', '12260 - Duronto Express', '12626 - Kerala Express'];
    const coaches = ['A1', 'B2', 'H1', 'C1', 'S3'];

    let hash = 0;
    for (let i = 0; i < pnrInput.length; i++) {
      hash = pnrInput.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash = Math.abs(hash);

    setPassenger(names[hash % names.length]);
    setTrain(trainsList[(hash >> 1) % trainsList.length]);
    setCoachSeat(`${coaches[(hash >> 2) % coaches.length]} / Seat ${10 + (hash % 60)}`);
    setIsFlipped(true);
    toast.success('Pass retrieved. Click card to flip!');
  };

  const loadDemo = () => {
    setPnrInput('4321098765');
    setPassenger('Arjun Mehta');
    setTrain('22436 - Vande Bharat Express');
    setCoachSeat('C2 / Seat 42 (Window)');
    setIsFlipped(true);
    toast.success('Loaded. Click card to flip!');
  };

  return (
    <div className="perspective-1000 w-full max-w-sm mx-auto h-[290px] relative">
      <motion.div
        className="w-full h-full relative transform-style-3d cursor-pointer"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        onClick={() => { if (passenger) setIsFlipped(f => !f); }}
      >
        {/* FRONT */}
        <div className="absolute inset-0 w-full h-full backface-hidden glass rounded-3xl p-5 flex flex-col justify-between border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
          <div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Live PNR Lookup</span>
              <div className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[8px] font-bold tracking-wider">SECURE</div>
            </div>

            <form onSubmit={handleGenerate} onClick={e => e.stopPropagation()} className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Enter 10-Digit PNR</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="e.g. 4321098765"
                    value={pnrInput}
                    onChange={e => setPnrInput(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono tracking-wider"
                  />
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-3 py-1.5 text-[10px] font-bold transition-all">
                    Search
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="flex justify-between items-end border-t border-slate-900 pt-3">
            <button
              onClick={(e) => { e.stopPropagation(); loadDemo(); }}
              className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              ⚡ Fast Demo Pass
            </button>
            <span className="text-[8px] text-slate-650 font-mono">ENCRYPTED TELEMETRY</span>
          </div>
        </div>

        {/* BACK */}
        <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 glass-elevated rounded-3xl p-5 flex flex-col justify-between border border-cyan-500/20 shadow-[0_20px_50px_rgba(79,70,229,0.15)]">
          <div className="flex justify-between items-start">
            <div className="text-left">
              <span className="text-[8px] font-bold text-cyan-400 uppercase tracking-widest">Boarding Pass</span>
              <div className="text-base font-extrabold text-white tracking-wide mt-0.5 font-mono">{pnrInput || '4321098765'}</div>
            </div>
            <div className="bg-white p-1 rounded-lg shrink-0">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5">
                <rect x="2" y="2" width="6" height="6" />
                <rect x="16" y="2" width="6" height="6" />
                <rect x="2" y="16" width="6" height="6" />
                <rect x="16" y="16" width="6" height="6" />
                <path d="M10 4h4v4h-4zM4 10h4v4H4zM10 10h4v4h-4zM16 10h4v4h-4zM10 16h4v4h-4z" />
              </svg>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-y-2 gap-x-3 my-1 border-t border-slate-800/80 pt-2.5">
            <div className="text-left">
              <span className="text-[8px] text-slate-500 uppercase font-bold tracking-wider">Passenger</span>
              <p className="text-[10px] font-bold text-slate-200 truncate">{passenger}</p>
            </div>
            <div className="text-left">
              <span className="text-[8px] text-slate-500 uppercase font-bold tracking-wider">Train</span>
              <p className="text-[10px] font-bold text-slate-200 truncate">{train}</p>
            </div>
            <div className="text-left">
              <span className="text-[8px] text-slate-500 uppercase font-bold tracking-wider">Coach/Berth</span>
              <p className="text-[10px] font-mono font-bold text-cyan-300">{coachSeat}</p>
            </div>
            <div className="text-left">
              <span className="text-[8px] text-slate-500 uppercase font-bold tracking-wider">Boarding Info</span>
              <p className="text-[10px] font-bold text-amber-500">PF 4 // 21:15</p>
            </div>
          </div>

          <div className="flex justify-between items-center border-t border-slate-800/80 pt-2">
            <span className="text-[8px] text-emerald-400 font-bold tracking-wider flex items-center gap-1 uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Confirmed
            </span>
            <span className="text-[8px] text-slate-550 font-bold">CLICK TO FLIP</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// 5. Circular Delay Predictor Gauge
function DelayPredictorGauge() {
  const [selectedTrain, setSelectedTrain] = useState('12951');
  const [prob, setProb] = useState(12);

  const trains = [
    { code: '22436', shortName: 'Vande Bharat', name: 'Vande Bharat Exp', prob: 6, status: 'Near Zero Delay', avgDelay: '2 min', confidence: '99.4%' },
    { code: '12951', shortName: 'Rajdhani', name: 'Mumbai Rajdhani', prob: 12, status: 'Very Low Risk', avgDelay: '8 min', confidence: '98.7%' },
    { code: '12002', shortName: 'Shatabdi', name: 'Bhopal Shatabdi', prob: 28, status: 'Low Delay Risk', avgDelay: '18 min', confidence: '97.2%' },
    { code: '12260', shortName: 'Duronto', name: 'Hwh Duronto', prob: 54, status: 'Moderate Risk', avgDelay: '42 min', confidence: '92.5%' },
  ];

  useEffect(() => {
    const t = trains.find(tr => tr.code === selectedTrain);
    if (t) setProb(t.prob);
  }, [selectedTrain]);

  const current = trains.find(tr => tr.code === selectedTrain) || trains[0];
  const radius = 48;
  const circ = 2 * Math.PI * radius;
  const strokeDashoffset = circ - (prob / 100) * circ;

  const getColor = (p: number) => {
    if (p < 15) return '#10B981'; // Emerald
    if (p < 35) return '#06B6D4'; // Cyan
    if (p < 60) return '#F59E0B'; // Saffron
    return '#EF4444'; // Red
  };

  return (
    <div className="glass rounded-3xl p-5 flex flex-col justify-between border border-white/10 h-full">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">AI Delay Prediction</span>
        </div>

        {/* Tab selection */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto no-scrollbar pb-1 border-b border-white/5">
          {trains.map(t => (
            <button
              key={t.code}
              onClick={() => setSelectedTrain(t.code)}
              className={`px-2 py-0.5 rounded-lg text-[9px] font-bold transition-all whitespace-nowrap border shrink-0 ${
                selectedTrain === t.code
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                  : 'bg-transparent text-slate-500 border-transparent hover:text-slate-350'
              }`}
            >
              {t.shortName}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center relative my-2">
        <svg className="w-28 h-28 transform -rotate-90 overflow-visible">
          <circle
            cx="56"
            cy="56"
            r={radius}
            fill="transparent"
            stroke="rgba(255,255,255,0.03)"
            strokeWidth="7"
          />
          <motion.circle
            cx="56"
            cy="56"
            r={radius}
            fill="transparent"
            stroke={getColor(prob)}
            strokeWidth="7"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 5px ${getColor(prob)}40)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-xl font-extrabold text-white font-mono leading-none"
            animate={{ color: getColor(prob) }}
          >
            {prob}%
          </motion.span>
          <span className="text-[8px] font-bold text-slate-500 uppercase mt-0.5 tracking-wider">Delay Risk</span>
        </div>
      </div>

      <div className="text-center mt-3">
        <div
          className="inline-block px-3 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase border transition-all"
          style={{
            backgroundColor: `${getColor(prob)}12`,
            color: getColor(prob),
            borderColor: `${getColor(prob)}30`
          }}
        >
          {current.status}
        </div>
      </div>

      {/* Extra stats */}
      <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-900/60 text-left">
        <div>
          <span className="text-[7px] text-slate-500 uppercase font-bold tracking-wider block">Avg Delay</span>
          <span className="text-[10px] font-bold text-white font-mono">{current.avgDelay}</span>
        </div>
        <div>
          <span className="text-[7px] text-slate-500 uppercase font-bold tracking-wider block">AI Confidence</span>
          <span className="text-[10px] font-bold text-slate-300 font-mono">{current.confidence}</span>
        </div>
      </div>
    </div>
  );
}

// 6. Food Cart Tray selector (Imported from components/FoodCartTray)

// 7. Scroll-Driven Journey Timeline
function JourneyTimeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"]
  });

  const yProgress = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  const milestones = [
    { title: 'Search Route', desc: 'Query 7000+ railway stations instantly with smart suggestions.', city: 'Start' },
    { title: 'Check AI Delay Risk', desc: 'Deep learning telemetry calculates delay risk and weather metrics.', city: 'Mumbai' },
    { title: 'Instant 3D Boarding', desc: 'Secure tickets in seconds with verified instant PNR codes.', city: 'Pune' },
    { title: 'Order Meals On Board', desc: 'Contactless fresh food delivered straight to your specific coach berth.', city: 'Solapur' },
    { title: 'Arrive Safely', desc: 'Real-time telemetry coordinates prompt arrival tracking.', city: 'Destination' },
  ];

  return (
    <div ref={containerRef} style={{ position: 'relative' }} className="max-w-lg mx-auto py-12 px-4">
      <div className="absolute left-6 md:left-1/2 top-4 bottom-4 w-[2px] bg-slate-900 -translate-x-1/2 rounded-full overflow-hidden">
        <motion.div
          className="absolute top-0 w-full bg-gradient-to-b from-indigo-500 via-cyan-400 to-accent rounded-full"
          style={{ height: yProgress }}
        />
      </div>

      <motion.div
        className="absolute left-6 md:left-1/2 -translate-y-1/2 -translate-x-1/2 z-10 w-6 h-6 rounded-full bg-cyan-500 border-2 border-cyan-300/30 flex items-center justify-center text-white shadow-[0_0_15px_#06B6D4]"
        style={{ top: useTransform(scrollYProgress, [0, 1], ["12px", "calc(100% - 12px)"]) }}
      >
        <Train className="w-3 h-3" />
      </motion.div>

      <div className="space-y-10">
        {milestones.map((m, idx) => {
          const isEven = idx % 2 === 0;
          return (
            <motion.div
              key={m.title}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              className={`flex flex-col md:flex-row items-start relative ${isEven ? 'md:flex-row-reverse' : ''}`}
            >
              <div className="w-full md:w-1/2 pl-12 md:pl-0 md:px-6">
                <div className="glass hover:border-indigo-500/20 transition-all p-4 rounded-2xl relative shadow-md">
                  <span className="absolute top-4 right-4 text-[8px] font-mono text-slate-655 font-bold uppercase tracking-wider">{m.city}</span>
                  <h4 className="text-xs font-bold text-white mb-1">
                    <span className="text-cyan-400 font-mono">0{idx + 1}.</span> {m.title}
                  </h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed">{m.desc}</p>
                </div>
              </div>
              <div className="w-full md:w-1/2 hidden md:block" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// 8. Interactive Testimonial Glass Card
function TestimonialCard({ name, role, content, rating, delay }: { name: string, role: string, content: string, rating: number, delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay }}
      whileHover={{
        y: -4,
        rotateX: 1,
        rotateY: -1,
        boxShadow: "0 20px 40px rgba(79, 70, 229, 0.12), 0 0 0 1px rgba(99, 102, 241, 0.2)"
      }}
      className="glass rounded-2xl p-5 border border-white/5 transition-all duration-300 relative overflow-hidden flex flex-col justify-between group cursor-default h-full"
      style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div>
        <div className="flex gap-0.5 mb-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={`w-3 h-3 ${i < rating ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`} />
          ))}
        </div>
        <p className="text-[11px] text-slate-450 leading-relaxed mb-4 italic">
          &ldquo;{content}&rdquo;
        </p>
      </div>

      <div className="flex items-center gap-2.5 border-t border-slate-900/60 pt-3 mt-auto">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-accent flex items-center justify-center text-[10px] font-bold text-white uppercase shrink-0">
          {name[0]}
        </div>
        <div className="truncate">
          <div className="text-[11px] font-bold text-white truncate">{name}</div>
          <div className="text-[9px] text-slate-550 truncate">{role}</div>
        </div>
      </div>
    </motion.div>
  );
}

// 9. FAQ Section with Accordions & Filter
function FAQSection() {
  const [search, setSearch] = useState('');
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const faqs = [
    { q: 'How do I search for train availability?', a: 'Input origin and destination station names or code triggers in the Hero form. Choose date and click Search to query our live routes databases.' },
    { q: 'What is the dynamic PNR ticket generator?', a: 'Type any 10-digit number inside our live PNR Card. Clicking search triggers a 3D flipped boarding pass layout displaying passenger, platform, berth class, and seat details.' },
    { q: 'How does food delivery on trains work?', a: 'We coordinate with IRCTC-certified caterers at major junctions. Select meals from the interactive tray; dishes are cooked fresh and delivered straight to your specific berth.' },
    { q: 'How does AI Delay Prediction calculate risk?', a: 'Our server analyzes weather forecasting indexes, route congestion schedules, and historic logs to compute an accurate circular gauge delay risk rating.' },
    { q: 'Can I preview my coach seating map?', a: 'Yes! Click Coach Seat Map on our preview card. An overlay modal exposes a detailed 2D coach berths layout, including status indicators (Available, RAC, Booked).' }
  ];

  const filtered = faqs.filter(f =>
    f.q.toLowerCase().includes(search.toLowerCase()) ||
    f.a.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
        <input
          type="text"
          placeholder="Search FAQs (e.g. food, delay, PNR)..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-slate-900/60 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all font-medium"
        />
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-center text-[10px] text-slate-500 italic py-4">No matching FAQs found</p>
        ) : (
          filtered.map((faq, idx) => {
            const isOpen = activeIdx === idx;
            return (
              <div
                key={idx}
                className="glass rounded-xl overflow-hidden border border-white/5 transition-all duration-300"
                style={{ borderColor: isOpen ? 'rgba(79,70,229,0.2)' : 'rgba(255,255,255,0.05)' }}
              >
                <button
                  onClick={() => setActiveIdx(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-3.5 text-left font-bold text-[11px] text-slate-300 hover:text-white transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronRight className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isOpen ? 'rotate-90 text-indigo-400' : ''}`} />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                    >
                      <div className="px-3.5 pb-3.5 text-[10px] text-slate-450 leading-relaxed border-t border-slate-900/80 pt-2.5">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// 10. Floating Phone App Preview mockup
function MobileAppPreview() {
  return (
    <div className="relative max-w-[240px] mx-auto p-2">
      <div
        className="relative bg-slate-950 rounded-[36px] border-4 border-slate-800 p-2 shadow-[0_25px_60px_rgba(0,0,0,0.8),_inset_0_0_10px_rgba(255,255,255,0.03)] aspect-[9/18.5] w-[210px] mx-auto overflow-hidden"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-800 rounded-b-lg z-20" />

        <div className="w-full h-full rounded-[28px] overflow-hidden bg-[#03061A] p-2.5 text-left relative text-white flex flex-col justify-between">
          <div className="pt-4">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-gradient-to-r from-indigo-500 to-cyan-500 flex items-center justify-center">
                  <Train className="w-2.5 h-2.5 text-white" />
                </div>
                <span className="text-[9px] font-black tracking-tight">RailConnect</span>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            </div>

            <div className="bg-slate-900/80 rounded-lg p-2 border border-white/5 mb-2.5">
              <span className="text-[7px] text-slate-500 uppercase font-black tracking-widest block mb-1">QUICK BOOKING</span>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded border border-slate-850">
                  <MapPin className="w-2.5 h-2.5 text-indigo-400" />
                  <span className="text-[8px] font-medium text-slate-300">Mumbai CSMT</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded border border-slate-850">
                  <MapPin className="w-2.5 h-2.5 text-amber-500" />
                  <span className="text-[8px] font-medium text-slate-300">New Delhi</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-emerald-500/10 to-transparent rounded-lg p-2 border border-emerald-500/20 mb-2">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                <span className="text-[8px] font-bold text-emerald-400">12951 On Time</span>
              </div>
              <p className="text-[7px] text-slate-500 mt-0.5">AI prediction model verified schedule reliability.</p>
            </div>

            <div className="bg-slate-900/60 rounded-lg p-2 border border-white/5">
              <span className="text-[7px] text-slate-500 uppercase font-black tracking-widest block mb-0.5">Meal Selected</span>
              <div className="flex justify-between items-center">
                <span className="text-[8px] font-bold text-slate-300">Biryani & Coffee</span>
                <span className="text-[8px] font-mono text-cyan-400 font-bold">₹175</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-900 pt-1.5 text-center text-[6px] text-slate-650 font-mono">
            SECURED RAIL CONNECT DEV
          </div>
        </div>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-indigo-500/5 blur-3xl -z-10" />
    </div>
  );
}

// ────── MAIN COMPONENT ─────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput]     = useState('');
  const [fromCode, setFromCode]   = useState('');
  const [toCode, setToCode]       = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [stations, setStations]           = useState<any[]>([]);
  const [fromSuggestions, setFromSuggestions] = useState<any[]>([]);
  const [toSuggestions, setToSuggestions]     = useState<any[]>([]);
  const [routeTab, setRouteTab] = useState<'express' | 'local'>('express');

  useEffect(() => {
    setMounted(true);
    trainsAPI.getStations().then(r => setStations(r.data.stations)).catch(() => {});
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#03061A] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const filterStations = (q: string) =>
    stations.filter(s =>
      s.name.toLowerCase().includes(q.toLowerCase()) ||
      s.code.toLowerCase().includes(q.toLowerCase()) ||
      s.city.toLowerCase().includes(q.toLowerCase())
    ).slice(0, 5);

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
    <div className="min-h-screen grid-bg relative overflow-x-hidden">

      {/* ── SECTION 1: HERO ────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-28 pb-32">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1541818270560-60b61dc77a63?q=80&w=2670&auto=format&fit=crop"
            alt="Indian railway line"
            className="w-full h-full object-cover"
            style={{ opacity: 0.12, filter: 'saturate(0.5) contrast(1.1)' }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(3,6,26,0.5) 0%, rgba(3,6,26,0.92) 70%, #03061A 100%)' }} />
        </div>

        <div className="absolute top-20 left-1/4 w-[35rem] h-[35rem] rounded-full pointer-events-none -z-10"
          style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.08) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div className="absolute top-40 right-1/4 w-[28rem] h-[28rem] rounded-full pointer-events-none -z-10"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)', filter: 'blur(50px)' }} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full mb-5 bg-indigo-500/10 border border-indigo-500/25"
            >
              <Zap className="w-3 h-3 text-indigo-400" />
              <span className="text-indigo-300 text-[10px] font-bold tracking-widest uppercase">India&apos;s Premium Smart Rail App</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl md:text-6xl font-extrabold mb-5 leading-[1.1] tracking-tight text-white"
            >
              Journey Made <br />
              <span style={{
                background: 'linear-gradient(135deg, #818CF8 0%, #A78BFA 40%, #F59E0B 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>Effortless.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-slate-450 text-sm md:text-base max-w-xl mx-auto leading-relaxed"
            >
              Book tickets, track real-time telemetry, preview coach layouts, and order catering on board inside a unified premium interface.
            </motion.p>
          </div>

          {/* Search Card */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="max-w-xl mx-auto"
          >
            <div className="glass-elevated rounded-3xl p-6 border border-white/10 relative overflow-visible">
              <div className="flex items-center gap-2 mb-4">
                <Search className="w-4 h-4 text-indigo-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">Quick Search</h2>
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="live-dot" />
                  <span className="text-[10px] text-emerald-400 font-bold uppercase">Ready</span>
                </div>
              </div>

              <form onSubmit={handleSearch}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {/* From */}
                  <div className="relative">
                    <label className="input-label">From</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 pointer-events-none" />
                      <input
                        id="search-from"
                        className="input-field pl-9 text-xs"
                        placeholder="Origin station name/code..."
                        value={fromInput}
                        onChange={e => {
                          const val = e.target.value;
                          setFromInput(val);
                          if (!val) setFromCode('');
                          const exact = stations.find(s => s.code.toUpperCase() === val.trim().toUpperCase() || s.name.toLowerCase() === val.trim().toLowerCase());
                          if (exact) setFromCode(exact.code);
                          setFromSuggestions(filterStations(val));
                        }}
                        onBlur={() => setTimeout(() => setFromSuggestions([]), 200)}
                        autoComplete="off"
                      />
                    </div>
                    {fromSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl overflow-hidden shadow-2xl bg-[#080D24] border border-indigo-500/20">
                        {fromSuggestions.map(s => (
                          <button key={s.id} type="button"
                            onClick={() => { setFromInput(`${s.name} (${s.code})`); setFromCode(s.code); setFromSuggestions([]); }}
                            className="w-full text-left px-3.5 py-2 hover:bg-slate-800 flex items-center gap-2 text-xs transition-colors">
                            <MapPin className="w-3 h-3 text-indigo-400 shrink-0" />
                            <span className="text-slate-205 font-medium">{s.name}</span>
                            <span className="text-slate-500 text-[10px] ml-auto font-mono">{s.code}</span>
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
                        className="input-field pl-9 text-xs"
                        placeholder="Destination station name/code..."
                        value={toInput}
                        onChange={e => {
                          const val = e.target.value;
                          setToInput(val);
                          if (!val) setToCode('');
                          const exact = stations.find(s => s.code.toUpperCase() === val.trim().toUpperCase() || s.name.toLowerCase() === val.trim().toLowerCase());
                          if (exact) setToCode(exact.code);
                          setToSuggestions(filterStations(val));
                        }}
                        onBlur={() => setTimeout(() => setToSuggestions([]), 200)}
                        autoComplete="off"
                      />
                    </div>
                    {toSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl overflow-hidden shadow-2xl bg-[#080D24] border border-indigo-500/20">
                        {toSuggestions.map(s => (
                          <button key={s.id} type="button"
                            onClick={() => { setToInput(`${s.name} (${s.code})`); setToCode(s.code); setToSuggestions([]); }}
                            className="w-full text-left px-3.5 py-2 hover:bg-slate-800 flex items-center gap-2 text-xs transition-colors">
                            <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="text-slate-205 font-medium">{s.name}</span>
                            <span className="text-slate-500 text-[10px] ml-auto font-mono">{s.code}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="input-label">Travel Date</label>
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="input-field text-xs text-slate-300 font-mono"
                    />
                  </div>
                  <div className="flex items-end">
                    <button type="submit" className="btn-primary w-full justify-center py-3 text-xs rounded-xl h-12"
                      style={{ borderRadius: '0.75rem' }}>
                      <Search className="w-4 h-4" />
                      Search Availability
                      <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── SECTION 2: LIVE STATS & TELEMETRY ─────────────────────── */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Operations Telemetry Dashboard */}
          <div className="md:col-span-7">
            <LiveOperationsDashboard />
          </div>

          {/* Quick Stats Grid */}
          <div className="md:col-span-5 flex flex-col justify-between gap-4">
            <div className="grid grid-cols-2 gap-4 h-full">
              {[
                { label: 'Daily Trains', val: '2,500+', icon: <Train className="w-4 h-4 text-indigo-400" /> },
                { label: 'Annual Traffic', val: '14M+', icon: <Users className="w-4 h-4 text-cyan-400" /> },
                { label: 'Junction Stations', val: '7,000+', icon: <MapPin className="w-4 h-4 text-amber-400" /> },
                { label: 'AI Accuracy', val: '99.7%', icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" /> }
              ].map((stat, i) => (
                <div key={stat.label} className="glass rounded-2xl p-4 border border-white/5 flex flex-col justify-between">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
                    {stat.icon}
                  </div>
                  <div className="mt-4">
                    <div className="text-xl font-black text-white font-mono">{stat.val}</div>
                    <div className="text-[9px] text-slate-500 font-bold uppercase mt-1 tracking-wider leading-none">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: NETWORK MAP & COACH VISUALIZER ────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Map corridors */}
          <div className="md:col-span-6">
            <RailwayNetworkMap />
          </div>

          {/* Coach predictor preview */}
          <div className="md:col-span-6">
            <CoachLayoutPreview />
          </div>
        </div>
      </section>

      {/* ── SECTION 4: BENTO GRID INTERACTIVES (PNR, DELAY, FOOD) ──── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full mb-3 bg-indigo-500/10 border border-indigo-500/20">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">Interactive Bento Grid</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-2 tracking-tight">Experience Core Platform Features</h2>
          <p className="text-slate-500 text-xs md:text-sm">Polished live components matching our backend ticketing databases.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* PNR Status */}
          <div className="md:col-span-4">
            <PNRFlipCard />
          </div>

          {/* Delay predictor circular gauge */}
          <div className="md:col-span-4">
            <DelayPredictorGauge />
          </div>

          {/* Meal on board builder */}
          <div className="md:col-span-4">
            <FoodCartTray />
          </div>
        </div>
      </section>

      {/* ── SECTION 5: EXPLORE SERVICES QUICK LAUNCH ───────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-24 text-center">
        <div className="mb-10">
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Explore Core Services</h2>
          <p className="text-slate-500 text-xs mt-1">Quickly access booking tools, live operations directories, or trigger our assistant.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              title: 'Book Train Tickets',
              desc: 'Find trains in seconds with smart availability lists.',
              href: '/trains/search',
              icon: <Train className="w-5 h-5 text-indigo-400" />,
              badge: 'POPULAR'
            },
            {
              title: 'Check PNR Status',
              desc: 'Generate 3D digital boarding tickets instantly.',
              href: '/dashboard',
              icon: <Layers className="w-5 h-5 text-cyan-400" />
            },
            {
              title: 'Live Train Status',
              desc: 'Track delays and schedules before you travel.',
              href: '/timetable',
              icon: <Clock className="w-5 h-5 text-amber-500" />,
              badge: 'LIVE DATA'
            },
            {
              title: 'Order In-Train Meals',
              desc: 'Hot food delivered straight to your coach berth.',
              href: '/food',
              icon: <Utensils className="w-5 h-5 text-emerald-400" />,
              badge: 'HOT MEALS'
            },
            {
              title: 'Station Directory',
              desc: 'Explore station routes, platforms, and connections.',
              href: '/stations',
              icon: <MapPin className="w-5 h-5 text-cyan-400" />
            },
            {
              title: 'AI Travel Assistant',
              desc: 'Query schedules, delay alerts, and guides instantly.',
              action: () => {
                window.dispatchEvent(new CustomEvent('ai-assistant:open'));
                toast.success('AI Travel Assistant Opened! Check bottom-right corner.');
              },
              icon: <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />,
              badge: 'CO-PILOT'
            }
          ].map((service, idx) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
            >
              {service.href ? (
                <Link
                  href={service.href}
                  className="glass hover:border-indigo-500/20 transition-all rounded-2xl p-5 text-left flex flex-col justify-between h-[130px] group relative card-hover"
                >
                  <div className="absolute top-4 right-4 flex items-center gap-1">
                    {service.badge && (
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-white/5 text-[7px] font-bold text-indigo-400 tracking-wider">
                        {service.badge}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="w-9 h-9 rounded-xl bg-slate-950 flex items-center justify-center mb-3">
                      {service.icon}
                    </div>
                    <h3 className="text-xs font-black text-white leading-tight group-hover:text-indigo-400 transition-colors">
                      {service.title}
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                      {service.desc}
                    </p>
                  </div>
                </Link>
              ) : (
                <button
                  onClick={service.action}
                  className="w-full glass hover:border-indigo-500/20 transition-all rounded-2xl p-5 text-left flex flex-col justify-between h-[130px] group relative card-hover"
                >
                  <div className="absolute top-4 right-4 flex items-center gap-1">
                    {service.badge && (
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-white/5 text-[7px] font-bold text-indigo-400 tracking-wider">
                        {service.badge}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="w-9 h-9 rounded-xl bg-slate-950 flex items-center justify-center mb-3">
                      {service.icon}
                    </div>
                    <h3 className="text-xs font-black text-white leading-tight group-hover:text-indigo-400 transition-colors">
                      {service.title}
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                      {service.desc}
                    </p>
                  </div>
                </button>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── SECTION 6: PHONE PREVIEW & MOBILE APP ──────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
        <div className="glass-elevated rounded-3xl p-8 border border-white/5 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none -z-10"
            style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.06) 0%, transparent 70%)', transform: 'translate(20%, -20%)' }} />

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-7 space-y-5 text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Smartphone className="w-3.5 h-3.5" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Mobile Companion</span>
              </div>
              <h3 className="text-2xl md:text-4xl font-extrabold text-white leading-tight">
                RailConnect App is Coming Soon
              </h3>
              <p className="text-slate-400 text-xs md:text-sm leading-relaxed">
                Stay updated with lockscreen ticket widgets, offline route timetables, automatic notification predictions, and lightning-fast UPI cancellations directly on iOS and Android.
              </p>
              <div className="flex flex-wrap gap-3">
                <span className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-white/5 text-[10px] font-bold text-slate-400">
                  App Store // Closed Beta
                </span>
                <span className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-white/5 text-[10px] font-bold text-slate-400">
                  Google Play // Coming Soon
                </span>
              </div>
            </div>

            <div className="md:col-span-5">
              <MobileAppPreview />
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 7: POPULAR ROUTES ──────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Popular Corridors</h2>
          <div className="flex gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-white/5">
            <button
              onClick={() => setRouteTab('express')}
              className="text-[10px] px-3.5 py-1 rounded-lg font-bold transition-all"
              style={routeTab === 'express'
                ? { background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: 'white' }
                : { color: '#64748B' }}>
              Express
            </button>
            <button
              onClick={() => setRouteTab('local')}
              className="text-[10px] px-3.5 py-1 rounded-lg font-bold transition-all"
              style={routeTab === 'local'
                ? { background: 'linear-gradient(135deg, #10B981, #06B6D4)', color: 'white' }
                : { color: '#64748B' }}>
              Mumbai Local
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {routes.map(route => (
            <Link
              key={`${route.from}-${route.to}`}
              href={`/trains/search?from=${route.from}&to=${route.to}`}
              className="glass rounded-2xl p-4 card-hover group overflow-hidden relative"
              style={{ borderLeft: `3px solid ${route.color}` }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ background: `radial-gradient(ellipse at bottom left, ${route.color}10 0%, transparent 70%)` }} />

              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[10px] font-mono text-slate-500 font-bold">{route.from}</div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:translate-x-0.5 transition-transform" style={{ color: route.color }} />
                  <div className="text-[10px] font-mono text-slate-500 font-bold">{route.to}</div>
                </div>
                <div className="text-left">
                  <div className="text-xs font-extrabold text-white leading-tight">{route.fromCity}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{route.toCity}</div>
                </div>
                <div className="mt-3 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" style={{ color: route.color }} />
                  <span className="text-[10px] font-bold" style={{ color: route.color }}>{route.duration}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── SECTION 8: TESTIMONIALS ───────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Loved by Passengers</h2>
          <p className="text-slate-500 text-xs mt-1">Real commuters rely on RailConnect schedules daily.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, idx) => (
            <TestimonialCard
              key={idx}
              name={t.name}
              role={t.role}
              rating={t.rating}
              content={t.content}
              delay={t.delay}
            />
          ))}
        </div>
      </section>

      {/* ── SECTION 9: SEARCHABLE FAQS ────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
          <p className="text-slate-500 text-xs mt-1">Everything you need to know about the platform.</p>
        </div>

        <FAQSection />
      </section>

      {/* ── SECTION 10: CTA BANNER ─────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
        <div className="relative rounded-3xl overflow-hidden" style={{
          background: 'linear-gradient(135deg, rgba(79,70,229,0.1) 0%, rgba(124,58,237,0.06) 50%, rgba(6,182,212,0.05) 100%)',
          border: '1px solid rgba(79,70,229,0.15)',
        }}>
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
          <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }} />

          <div className="absolute bottom-0 left-0 right-0 h-1 track-dots opacity-25" />

          <div className="relative px-6 md:px-12 py-12 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-4 bg-amber-500/10 border border-amber-500/25">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-300 text-[9px] font-bold uppercase tracking-wider">No hidden convenience fees</span>
            </div>

            <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-3 tracking-tight">
              Ready to Travel{' '}
              <span style={{
                background: 'linear-gradient(135deg, #818CF8, #06B6D4)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>Smarter?</span>
            </h2>

            <p className="text-slate-450 mb-6 max-w-sm mx-auto text-xs md:text-sm">
              Join millions of Indian railway passengers who manage bookings with RailConnect.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {!user ? (
                <Link href="/register" className="btn-primary py-3 px-8 text-xs rounded-xl" style={{ borderRadius: '0.75rem' }}>
                  Register Free Account <ChevronRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link href={user.role === 'admin' ? '/admin' : '/dashboard'} className="btn-primary py-3 px-8 text-xs rounded-xl" style={{ borderRadius: '0.75rem' }}>
                  Open Passenger Dashboard <ChevronRight className="w-4 h-4" />
                </Link>
              )}
              <Link href="/timetable" className="btn-secondary py-3 px-8 text-xs rounded-xl" style={{ borderRadius: '0.75rem' }}>
                View Timetables
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
