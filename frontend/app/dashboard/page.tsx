'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { bookingsAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Train, Search, Calendar, Loader2, ChevronRight, IndianRupee,
  CheckCircle2, XCircle, Clock, Utensils, AlertTriangle, Copy,
  TrendingUp, MapPin, Plus, Award, User, RefreshCw, BarChart2, Check
} from 'lucide-react';
import toast from 'react-hot-toast';

interface BookingItem {
  id: string;
  pnr: string;
  userId: string;
  trainId: string;
  journeyDate: string;
  fromStation: string;
  toStation: string;
  seatClass: string;
  totalPassengers: number;
  totalFare: number;
  status: string; // Confirmed | Cancelled | WaitingList
  paymentStatus: string;
  coachNumber: string;
  seatNumbers: string; // JSON array string
  createdAt: string;
  waitlistNumber: number | null;
  train: {
    name: string;
    trainNumber: string;
    type: string;
  };
  passengers?: any[];
  fromStationName?: string;
  toStationName?: string;
}

// Dynamic scannable QR code generator using QRServer API
const QRCodeSVG = ({ pnr, localIp }: { pnr: string; localIp: string }) => {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const targetHost = origin.includes('localhost') && localIp ? `http://${localIp}:3000` : origin;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(targetHost + '/booking/confirm?pnr=' + pnr)}&color=03061a&bgcolor=ffffff`;
  return (
    <div className="flex flex-col items-center gap-2 bg-white p-3.5 rounded-2xl shadow-xl w-fit">
      <img
        src={qrUrl}
        alt={`QR Code for PNR ${pnr}`}
        width="130"
        height="130"
        className="w-[130px] h-[130px] object-contain"
        loading="lazy"
      />
      <span className="font-mono text-[10px] text-slate-500 font-bold uppercase tracking-widest">{pnr}</span>
    </div>
  );
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [pnrInput, setPnrInput] = useState('');
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [selectedTicket, setSelectedTicket] = useState<BookingItem | null>(null);
  const [wlPrediction, setWlPrediction] = useState<{ waitlistNumber: number; probability: number; message: string } | null>(null);
  const [predictingWl, setPredictingWl] = useState(false);
  const [localIp, setLocalIp] = useState('localhost');

  const fetchData = async () => {
    try {
      const r = await bookingsAPI.getMy();
      setBookings(r.data.bookings || []);
    } catch {
      toast.error('Failed to load journeys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    if (!authLoading && user) {
      fetchData();
    }
  }, [user, authLoading]);

  useEffect(() => {
    bookingsAPI.getSystemConfig()
      .then(res => {
        if (res.data?.localIp) setLocalIp(res.data.localIp);
      })
      .catch(() => {});
  }, []);

  // Handler for waitlist confirmation probability
  const handleCheckWlPrediction = async (pnr: string) => {
    setPredictingWl(true);
    setWlPrediction(null);
    try {
      const res = await bookingsAPI.getWaitlistPrediction(pnr);
      setWlPrediction(res.data);
    } catch {
      toast.error('Could not fetch confirmation prediction');
    } finally {
      setPredictingWl(false);
    }
  };

  const handlePNRSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pnrInput.trim()) return;
    router.push(`/booking/confirm?pnr=${pnrInput.trim().toUpperCase()}`);
  };

  const handleCancel = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    setCancelling(bookingId);
    try {
      await bookingsAPI.cancel(bookingId);
      toast.success('Booking cancelled. Refund in 5-7 business days.');
      
      // Dispatch cancellation notification
      const localNotifs = localStorage.getItem('rail_notifications');
      const list = localNotifs ? JSON.parse(localNotifs) : [];
      const cancelledBk = bookings.find(b => b.id === bookingId);
      list.unshift({
        id: `n-${Date.now()}`,
        message: `Booking cancelled for PNR: ${cancelledBk?.pnr || 'N/A'}. Refund is being processed.`,
        type: 'ticket',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false
      });
      localStorage.setItem('rail_notifications', JSON.stringify(list));
      window.dispatchEvent(new Event('notifications-update'));

      setBookings(b => b.map(bk => bk.id === bookingId ? { ...bk, status: 'Cancelled' } : bk));
      setSelectedTicket(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Cancellation failed');
    } finally {
      setCancelling(null);
    }
  };

  if (authLoading || loading) return (
    <div className="flex items-center justify-center min-h-[60vh] gap-4 flex-col">
      <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
      <p className="text-slate-500 text-sm">Loading your passenger dashboard...</p>
    </div>
  );

  const todayStr = new Date().toISOString().split('T')[0];

  const confirmedBookings = bookings.filter(b => b.status === 'Confirmed' || b.status === 'WaitingList');
  const upcoming = bookings.filter(b => b.status !== 'Cancelled' && b.journeyDate >= todayStr);
  const past = bookings.filter(b => b.status !== 'Cancelled' && b.journeyDate < todayStr);
  const cancelled = bookings.filter(b => b.status === 'Cancelled');

  // Interactive metrics calculation
  const totalSpent = confirmedBookings.reduce((sum, b) => sum + b.totalFare, 0);
  const loyaltyPoints = Math.round(totalSpent / 10);
  const completedTrips = past.length;

  // Calculate favorite seat class
  const classCounts: Record<string, number> = {};
  confirmedBookings.forEach(b => {
    classCounts[b.seatClass] = (classCounts[b.seatClass] || 0) + 1;
  });
  let favoriteClass = 'N/A';
  let maxCount = 0;
  Object.entries(classCounts).forEach(([cls, count]) => {
    if (count > maxCount) {
      maxCount = count;
      favoriteClass = cls;
    }
  });

  // Nearest upcoming trip
  const nearestUpcoming = [...upcoming].sort((a, b) => a.journeyDate.localeCompare(b.journeyDate))[0];

  const activeBookings =
    activeTab === 'upcoming' ? upcoming :
    activeTab === 'past' ? past : cancelled;

  return (
    <div className="min-h-screen max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Greeting Banner */}
      <div className="relative rounded-3xl overflow-hidden p-8 mb-8" style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.1) 50%, rgba(3,6,26,0.6) 100%)',
        border: '1px solid rgba(99,102,241,0.2)',
      }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Passenger Profile</span>
            <h1 className="text-3xl font-extrabold text-white mt-1">
              Welcome, {user?.name?.split(' ')[0]}
            </h1>
            <p className="text-slate-400 text-sm mt-1">Account reference: {user?.email}</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link href="/trains/search" className="btn-primary">
              <Plus className="w-4 h-4" /> Book Journey
            </Link>
            <button onClick={fetchData} className="btn-secondary">
              <RefreshCw className="w-4 h-4" /> Sync
            </button>
          </div>
        </div>
      </div>

      {/* Loyalty & Spent Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Completed Trips', value: completedTrips, icon: <Train className="w-5 h-5" />, color: '#6366f1', displayVal: completedTrips },
          { label: 'Total Fare Spend', value: totalSpent, icon: <BarChart2 className="w-5 h-5" />, color: '#10b981', displayVal: `Rs. ${totalSpent}` },
          { label: 'Loyalty Points', value: loyaltyPoints, icon: <Award className="w-5 h-5" />, color: '#f59e0b', displayVal: loyaltyPoints },
          { label: 'Favorite Coach Class', value: favoriteClass, icon: <TrendingUp className="w-5 h-5" />, color: '#ec4899', displayVal: favoriteClass },
        ].map((stat, i) => (
          <div key={i} className="glass rounded-2xl p-5 border border-slate-800/60 relative overflow-hidden card-hover">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{stat.label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}15`, border: `1px solid ${stat.color}30`, color: stat.color }}>
                {stat.icon}
              </div>
            </div>
            <div className="text-2xl font-extrabold text-white tracking-tight">{stat.displayVal}</div>
          </div>
        ))}
      </div>

      {/* Main Grid: Left = Bookings & Search, Right = Upcoming Journey Focus */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Bookings Section */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* PNR Lookup panel */}
          <div className="glass-elevated rounded-3xl p-6 border border-slate-800/40">
            <h2 className="text-xs font-extrabold text-white mb-3 flex items-center gap-2 uppercase tracking-widest">
              <Search className="w-4 h-4 text-indigo-400" />
              PNR Status Checker
            </h2>
            <form onSubmit={handlePNRSearch} className="flex gap-3">
              <input
                id="pnr-lookup"
                className="input-field flex-1 font-mono tracking-widest text-sm"
                placeholder="Enter 10-character PNR code..."
                value={pnrInput}
                onChange={e => setPnrInput(e.target.value.toUpperCase())}
                maxLength={10}
              />
              <button type="submit" className="btn-secondary px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl">Check Status</button>
            </form>
          </div>

          {/* Bookings List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-extrabold text-white uppercase tracking-widest">My Bookings</h2>
              
              {/* Tab Selector */}
              <div className="flex gap-1 p-1 rounded-xl bg-slate-900/60 border border-slate-800/40">
                {(['upcoming', 'past', 'cancelled'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="text-xs px-3 py-1.5 rounded-lg font-bold capitalize transition-all duration-150"
                    style={activeTab === tab
                      ? { background: 'rgba(99,102,241,0.18)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }
                      : { color: '#64748b' }
                    }>
                    {tab === 'past' ? 'Past' : tab}
                  </button>
                ))}
              </div>
            </div>

            {activeBookings.length === 0 ? (
              <div className="glass rounded-3xl p-12 text-center text-slate-500 text-sm border border-slate-800/40">
                No {activeTab} bookings found
              </div>
            ) : (
              <div className="space-y-3.5">
                {activeBookings.map(b => {
                  const isConfirmed = b.status === 'Confirmed';
                  const isCancelled = b.status === 'Cancelled';
                  const isWaitlisted = b.status === 'WaitingList';
                  const accentColor = isConfirmed ? '#10b981' : isCancelled ? '#ef4444' : '#f59e0b';
                  const statusLabel = isWaitlisted ? `WL / ${b.waitlistNumber}` : b.status;

                  return (
                    <div key={b.id} className="glass rounded-2xl overflow-hidden border-l-4 card-hover border-slate-800/60"
                      style={{ borderLeftColor: accentColor }}>
                      <div className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: accentColor }}>
                              {statusLabel}
                            </span>
                            <span className="text-slate-700">•</span>
                            <span className="font-mono text-xs text-slate-500">PNR: {b.pnr}</span>
                          </div>
                          <h3 className="text-white font-extrabold text-sm mb-1">{b.train?.name}</h3>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                            <span>{b.fromStation}</span>
                            <ChevronRight className="w-3 h-3 text-slate-600" />
                            <span>{b.toStation}</span>
                            <span className="text-slate-700">•</span>
                            <span>{b.journeyDate}</span>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-start sm:items-end gap-3 shrink-0 self-stretch sm:self-auto justify-between border-t sm:border-t-0 border-slate-800/40 pt-3 sm:pt-0">
                          <div>
                            <div className="text-sm font-extrabold text-white flex items-center">
                              <IndianRupee className="w-3.5 h-3.5 text-indigo-400" />{b.totalFare}
                            </div>
                          </div>
                          <button onClick={() => { setSelectedTicket(b); if (isWaitlisted) handleCheckWlPrediction(b.pnr); }}
                            className="btn-secondary text-[11px] py-1.5 px-4 font-bold rounded-lg uppercase tracking-wider">
                            View Ticket
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right side: Upcoming Journey Detail Display */}
        <div className="space-y-6">
          <h2 className="text-sm font-extrabold text-white uppercase tracking-widest">Upcoming Journey</h2>
          
          {nearestUpcoming ? (
            <div className="glass-elevated rounded-3xl p-6 border border-slate-800/50 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-mono text-xs text-slate-500 uppercase tracking-widest">Next departure</span>
                  <h3 className="text-white font-extrabold text-lg mt-1">{nearestUpcoming.train?.name}</h3>
                  <span className="font-mono text-xs text-indigo-400">{nearestUpcoming.train?.trainNumber}</span>
                </div>
                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase"
                  style={{
                    background: nearestUpcoming.status === 'Confirmed' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                    color: nearestUpcoming.status === 'Confirmed' ? '#34d399' : '#fbbf24',
                    border: nearestUpcoming.status === 'Confirmed' ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(245,158,11,0.2)'
                  }}>
                  {nearestUpcoming.status === 'WaitingList' ? `Waitlisted: WL-${nearestUpcoming.waitlistNumber}` : nearestUpcoming.status}
                </span>
              </div>

              {/* Progress track */}
              <div className="relative border-l border-slate-800 pl-5 space-y-5">
                <div>
                  <div className="absolute left-0 w-2 h-2 rounded-full -translate-x-1/2 bg-indigo-500 ring-4 ring-indigo-500/10" />
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Origin</div>
                  <div className="text-white font-bold text-sm">{nearestUpcoming.fromStation}</div>
                </div>
                <div>
                  <div className="absolute left-0 w-2 h-2 rounded-full -translate-x-1/2 bg-amber-500 ring-4 ring-amber-500/10" />
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Destination</div>
                  <div className="text-white font-bold text-sm">{nearestUpcoming.toStation}</div>
                </div>
              </div>

              {/* Trip Meta details */}
              <div className="grid grid-cols-2 gap-4 border-t border-slate-800/60 pt-4 text-xs">
                <div>
                  <div className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Journey Date</div>
                  <div className="text-white font-bold mt-0.5">{nearestUpcoming.journeyDate}</div>
                </div>
                <div>
                  <div className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Coach / Seat</div>
                  <div className="text-white font-bold mt-0.5">{nearestUpcoming.coachNumber} / {JSON.parse(nearestUpcoming.seatNumbers)[0]}</div>
                </div>
              </div>

              {/* Status Details */}
              <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/40 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Delay Status</span>
                  <span className="text-emerald-400 font-bold">On Time</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-slate-500 font-medium">Boarding Platform</span>
                  <span className="text-white font-bold">Platform 1</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => { setSelectedTicket(nearestUpcoming); if (nearestUpcoming.status === 'WaitingList') handleCheckWlPrediction(nearestUpcoming.pnr); }}
                  className="btn-primary text-xs py-2.5 px-4 font-bold flex-1 justify-center rounded-xl">
                  Open E-Ticket
                </button>
                <Link href={`/food/${nearestUpcoming.id}`}
                  className="btn-secondary text-xs py-2.5 px-4 font-bold flex items-center justify-center gap-1.5 rounded-xl">
                  <Utensils className="w-3.5 h-3.5" /> Order Meal
                </Link>
              </div>
            </div>
          ) : (
            <div className="glass rounded-3xl p-8 text-center text-slate-500 text-xs border border-slate-800/40">
              No upcoming trips scheduled.
            </div>
          )}
        </div>
      </div>

      {/* Ticket Details Modal with Dynamic QR Code */}
      {selectedTicket && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl relative border border-slate-800/60 flex flex-col max-h-[95vh] sm:max-h-[90vh]"
            style={{ background: 'rgba(8,13,36,0.99)' }}>
            
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-slate-800/60 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-white text-sm sm:text-base font-extrabold uppercase tracking-widest">E-Ticket</h3>
                <span className="text-[10px] font-bold text-indigo-400 font-mono">PNR: {selectedTicket.pnr}</span>
              </div>
              <button onClick={() => { setSelectedTicket(null); setWlPrediction(null); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 flex-1 overflow-y-auto">
              
              {/* Train and journey details */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800/40 pb-4">
                <div>
                  <h4 className="text-white font-extrabold text-sm">{selectedTicket.train?.name}</h4>
                  <span className="text-[10px] text-slate-500 font-mono">Train {selectedTicket.train?.trainNumber} · {selectedTicket.train?.type}</span>
                </div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase inline-block"
                    style={{
                      background: selectedTicket.status === 'Confirmed' ? 'rgba(16,185,129,0.1)' : selectedTicket.status === 'Cancelled' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                      color: selectedTicket.status === 'Confirmed' ? '#34d399' : selectedTicket.status === 'Cancelled' ? '#f87171' : '#fbbf24',
                      border: selectedTicket.status === 'Confirmed' ? '1px solid rgba(16,185,129,0.2)' : selectedTicket.status === 'Cancelled' ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(245,158,11,0.2)'
                    }}>
                    {selectedTicket.status}
                  </span>
                </div>
              </div>

              {/* Station pairs */}
              <div className="flex justify-between items-center bg-slate-950/40 border border-slate-800/40 rounded-2xl p-3 sm:p-4 gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-slate-500 text-[10px] font-bold uppercase">From</div>
                  <div className="text-white text-xs sm:text-sm font-extrabold mt-0.5 truncate" title={selectedTicket.fromStationName || selectedTicket.fromStation}>
                    {selectedTicket.fromStationName || selectedTicket.fromStation}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700 shrink-0" />
                <div className="text-right min-w-0 flex-1">
                  <div className="text-slate-500 text-[10px] font-bold uppercase">To</div>
                  <div className="text-white text-xs sm:text-sm font-extrabold mt-0.5 truncate" title={selectedTicket.toStationName || selectedTicket.toStation}>
                    {selectedTicket.toStationName || selectedTicket.toStation}
                  </div>
                </div>
              </div>

              {/* Passenger list */}
              <div>
                <h5 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 sm:mb-3">Passenger Information</h5>
                <div className="space-y-1.5 sm:space-y-2">
                  {selectedTicket.passengers ? (
                    (selectedTicket as any).passengers.map((p: any, i: number) => (
                      <div key={p.id || i} className="flex justify-between text-xs py-1.5 border-b border-slate-800/20 last:border-b-0">
                        <div className="min-w-0 flex-1 mr-2">
                          <span className="text-white font-bold block sm:inline truncate max-w-[150px] sm:max-w-none">{p.name}</span>
                          <span className="text-slate-500 sm:ml-1.5 text-[10px] sm:text-xs">{p.age} years · {p.gender}</span>
                        </div>
                        <span className="text-indigo-300 font-mono font-bold shrink-0">Seat: {p.seatNumber || 'WaitingList'}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-600 text-xs">No passengers listed</div>
                  )}
                </div>
              </div>

              {/* Waitlist prediction result */}
              {selectedTicket.status === 'WaitingList' && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/30 border border-slate-800/40 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 font-bold">Waitlist Queue Position:</span>
                    <span className="text-amber-400 font-extrabold font-mono">WL {selectedTicket.waitlistNumber}</span>
                  </div>
                  
                  {predictingWl ? (
                    <div className="flex items-center gap-2 text-indigo-400 py-1 font-semibold">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Calculating confirmation probability...
                    </div>
                  ) : wlPrediction ? (
                    <div className="space-y-2 border-t border-slate-800/40 pt-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">Clearance Likelihood:</span>
                        <span className={`font-extrabold ${wlPrediction.probability > 70 ? 'text-emerald-400' : wlPrediction.probability > 40 ? 'text-amber-400' : 'text-red-400'}`}>
                          {wlPrediction.probability}% ({wlPrediction.message})
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${wlPrediction.probability}%`,
                            background: wlPrediction.probability > 70 ? '#10b981' : wlPrediction.probability > 40 ? '#f59e0b' : '#ef4444'
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => handleCheckWlPrediction(selectedTicket.pnr)}
                      className="w-full text-center text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors mt-1">
                      Check Waitlist Confirmation Probability
                    </button>
                  )}
                </div>
              )}

              {/* Ticket Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-slate-800/40 pt-4 text-[11px] text-slate-400">
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider block">Journey Date</span>
                  <div className="text-white font-bold mt-0.5">{selectedTicket.journeyDate}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider block">Coach / Seat</span>
                  <div className="text-white font-bold mt-0.5">{selectedTicket.coachNumber} / {JSON.parse(selectedTicket.seatNumbers)[0]}</div>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider block">Coach Class</span>
                  <div className="text-white font-bold mt-0.5">{selectedTicket.seatClass}</div>
                </div>
              </div>

              {/* SVG QR Code Validation Panel */}
              {selectedTicket.status !== 'Cancelled' && (
                <div className="flex flex-col items-center justify-center py-4 border-t border-slate-800/40 gap-3 shrink-0">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">E-Ticket QR Code Validator</span>
                  <QRCodeSVG pnr={selectedTicket.pnr} localIp={localIp} />
                  <p className="text-[10px] text-slate-600 text-center max-w-[280px]">
                    This QR code contains validation parameters. Scan at ticket checkpoints to verify journey status.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            {selectedTicket.status === 'Confirmed' && (
              <div className="p-4 sm:p-5 bg-slate-900/40 border-t border-slate-800/60 flex gap-3 shrink-0">
                <button onClick={() => handleCancel(selectedTicket.id)} disabled={cancelling === selectedTicket.id}
                  className="w-full btn-danger py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs justify-center">
                  {cancelling === selectedTicket.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancel Booking'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
