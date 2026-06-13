'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { adminAPI } from '@/lib/api';
import Link from 'next/link';
import {
  Shield, Train, Users, IndianRupee, AlertTriangle, Loader2,
  ToggleLeft, ToggleRight, Plus, Trash2, CheckCircle2, Clock, X,
  BarChart2, MapPin, TrendingUp, Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<any>(null);
  const [trains, setTrains] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [delays, setDelays] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'analytics' | 'trains' | 'bookings' | 'delays'>('overview');

  // Delay form
  const [delayForm, setDelayForm] = useState({ trainId: '', date: new Date().toISOString().split('T')[0], delayMinutes: '', reason: '' });
  const [submittingDelay, setSubmittingDelay] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (!authLoading && user && user.role !== 'admin') { router.push('/dashboard'); return; }
    if (!authLoading && user) loadData();
  }, [user, authLoading]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sRes, tRes, bRes, dRes, aRes] = await Promise.all([
        adminAPI.getDashboard(),
        adminAPI.getTrains(),
        adminAPI.getBookings(),
        adminAPI.getDelays(),
        adminAPI.getRevenueAnalytics().catch(() => ({ data: null }))
      ]);
      setStats(sRes.data);
      setTrains(tRes.data.trains || []);
      setBookings(bRes.data.bookings || []);
      setDelays(dRes.data.delays || []);
      setAnalytics(aRes?.data || null);
    } catch (err: any) {
      toast.error('Failed to load admin data');
    } finally { setLoading(false); }
  };

  const toggleTrain = async (id: string, isActive: boolean) => {
    try {
      await adminAPI.toggleTrain(id, !isActive);
      setTrains(t => t.map(train => train.id === id ? { ...train, isActive: !isActive } : train));
      toast.success(isActive ? 'Train deactivated' : 'Train activated');
    } catch { toast.error('Failed to update train'); }
  };

  const handleSetDelay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delayForm.trainId) return toast.error('Select a train');
    setSubmittingDelay(true);
    try {
      const r = await adminAPI.setDelay({
        trainId: delayForm.trainId,
        date: delayForm.date,
        delayMinutes: Number(delayForm.delayMinutes),
        reason: delayForm.reason,
      });
      
      // Seed notifications trigger
      const selectedTrain = trains.find(t => t.id === delayForm.trainId);
      if (selectedTrain) {
        const localNotifs = localStorage.getItem('rail_notifications');
        const list = localNotifs ? JSON.parse(localNotifs) : [];
        list.unshift({
          id: `n-${Date.now()}`,
          message: `Train ${selectedTrain.trainNumber} delay updated: ${delayForm.delayMinutes} minutes delay today.`,
          type: 'delay',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: false
        });
        localStorage.setItem('rail_notifications', JSON.stringify(list));
        window.dispatchEvent(new Event('notifications-update'));
      }

      toast.success(r.data.message);
      await loadData();
      setDelayForm(f => ({ ...f, delayMinutes: '', reason: '' }));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to set delay');
    } finally { setSubmittingDelay(false); }
  };

  const clearDelay = async (trainId: string, date: string) => {
    try {
      await adminAPI.clearDelay(trainId, date);
      
      const selectedTrain = trains.find(t => t.id === trainId);
      if (selectedTrain) {
        const localNotifs = localStorage.getItem('rail_notifications');
        const list = localNotifs ? JSON.parse(localNotifs) : [];
        list.unshift({
          id: `n-${Date.now()}`,
          message: `Train ${selectedTrain.trainNumber} is now running on-time. Delay cleared.`,
          type: 'delay',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: false
        });
        localStorage.setItem('rail_notifications', JSON.stringify(list));
        window.dispatchEvent(new Event('notifications-update'));
      }

      toast.success('Delay cleared');
      await loadData();
    } catch { toast.error('Failed to clear delay'); }
  };

  if (authLoading || loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
    </div>
  );

  const tabBtns = [
    { key: 'overview', label: 'Overview' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'trains', label: `Trains (${trains.length})` },
    { key: 'bookings', label: `Bookings (${bookings.length})` },
    { key: 'delays', label: `Live Delays (${delays.filter(d => d.delayMinutes > 0).length})` },
  ];

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            <p className="text-slate-400 text-sm font-medium">Manage network schedules, tracking matrices, and delays</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/validator" className="btn-secondary text-xs py-2 px-4 uppercase font-bold tracking-wider rounded-xl">
            Ticket Validator
          </Link>
          <button onClick={loadData} className="btn-secondary p-2.5 rounded-xl">
            <RefreshCw className="w-4.5 h-4.5" style={{ width: '18px', height: '18px' }} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-8 flex-wrap p-1 rounded-2xl bg-slate-900/60 border border-slate-800/40 w-fit">
        {tabBtns.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`text-xs font-bold py-2.5 px-4 rounded-xl transition-all capitalize ${
              tab === t.key 
                ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25' 
                : 'text-slate-500 hover:text-slate-300'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Active Trains', value: stats.totalTrains, icon: <Train className="w-5 h-5 text-indigo-400" />, color: 'text-indigo-400' },
              { label: 'Total Bookings', value: stats.totalBookings, icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />, color: 'text-emerald-400' },
              { label: 'Total Users', value: stats.totalUsers, icon: <Users className="w-5 h-5 text-blue-400" />, color: 'text-blue-400' },
              { label: 'Active Delays', value: stats.activeDelays, icon: <AlertTriangle className="w-5 h-5 text-amber-400" />, color: 'text-amber-400' },
              { label: 'Revenue', value: `₹${Math.round(stats.totalRevenue).toLocaleString()}`, icon: <IndianRupee className="w-5 h-5 text-purple-400" />, color: 'text-purple-400' },
            ].map(s => (
              <div key={s.label} className="glass rounded-2xl p-5 border border-slate-800/60">
                <div className="flex items-center gap-2 mb-2">{s.icon}<span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{s.label}</span></div>
                <div className={`text-2xl font-extrabold tracking-tight ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Recent bookings */}
          <div className="glass rounded-2xl overflow-hidden border border-slate-800/40">
            <div className="px-6 py-4 border-b border-slate-800/60">
              <h2 className="font-extrabold text-white text-sm uppercase tracking-wider">Recent Bookings</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800/60 bg-slate-900/50">
                    <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">PNR</th>
                    <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">User</th>
                    <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Train</th>
                    <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Route</th>
                    <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fare</th>
                    <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.slice(0, 10).map((b, idx) => (
                    <tr key={b.id} className="border-b border-slate-800/30 hover:bg-slate-800/10"
                      style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(13,19,53,0.15)' }}>
                      <td className="px-5 py-3.5 font-mono text-xs text-indigo-400 font-bold">{b.pnr}</td>
                      <td className="px-5 py-3.5 text-slate-300 font-semibold">{b.user?.name}</td>
                      <td className="px-5 py-3.5 text-slate-300 font-medium">{b.train?.name}</td>
                      <td className="px-5 py-3.5 text-slate-400 text-xs">{b.fromStation} → {b.toStation}</td>
                      <td className="px-5 py-3.5 text-slate-400 text-xs font-mono">{b.journeyDate}</td>
                      <td className="px-5 py-3.5 text-white font-extrabold">₹{b.totalFare}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-bold uppercase ${b.status === 'Confirmed' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Analytics Dashboard Tab */}
      {tab === 'analytics' && (
        <div className="space-y-8">
          {analytics ? (
            <>
              {/* Analytics KPI cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { label: 'Gross Sales Revenue', value: `₹${analytics.totalRevenue.toLocaleString()}`, color: '#a855f7' },
                  { label: 'Booking Conversions', value: analytics.bookingsCount, color: '#10b981' },
                  { label: 'Total Passengers Moved', value: analytics.totalPassengers, color: '#6366f1' },
                  { label: 'Average Ticket Value', value: `₹${analytics.aov}`, color: '#f59e0b' }
                ].map((kpi, idx) => (
                  <div key={idx} className="glass rounded-2xl p-5 border border-slate-800/60 relative overflow-hidden">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">{kpi.label}</span>
                    <span className="text-2xl font-extrabold text-white mt-1.5 block tracking-tight" style={{ color: kpi.color }}>
                      {kpi.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* SVG Bar Chart: Class division revenue */}
                <div className="glass rounded-3xl p-6 border border-slate-800/40">
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                    <BarChart2 className="w-4.5 h-4.5 text-indigo-400" />
                    Revenue By Coach Class
                  </h3>
                  
                  <div className="relative py-2">
                    {analytics.classRevenue.length === 0 ? (
                      <div className="text-center text-slate-500 py-10 text-xs">No sales data compiled</div>
                    ) : (
                      <svg width="100%" height="220" viewBox="0 0 420 220" className="overflow-visible">
                        <defs>
                          <linearGradient id="bar-grad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#6366f1" />
                            <stop offset="100%" stopColor="#a855f7" />
                          </linearGradient>
                        </defs>
                        {(() => {
                          const maxVal = Math.max(...analytics.classRevenue.map((c: any) => c.revenue), 1);
                          return analytics.classRevenue.map((c: any, i: number) => {
                            const barWidth = (c.revenue / maxVal) * 240;
                            const y = 20 + i * 36;
                            return (
                              <g key={i}>
                                <text x="10" y={y + 12} fill="#64748b" className="text-[9px] font-bold uppercase">{c.class}</text>
                                <rect x="90" y={y} width={Math.max(5, barWidth)} height="16" rx="4" fill="url(#bar-grad)" />
                                <text x={100 + barWidth} y={y + 12} fill="white" className="text-[10px] font-extrabold">₹{Math.round(c.revenue).toLocaleString()}</text>
                              </g>
                            );
                          });
                        })()}
                      </svg>
                    )}
                  </div>
                </div>

                {/* SVG Area/Line Chart: 7-Day sales trend */}
                <div className="glass rounded-3xl p-6 border border-slate-800/40">
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                    <TrendingUp className="w-4.5 h-4.5 text-emerald-400" />
                    Weekly Sales Revenue Trend
                  </h3>

                  <div className="relative py-2">
                    {analytics.salesTrend.length === 0 ? (
                      <div className="text-center text-slate-500 py-10 text-xs">No daily sales tracked</div>
                    ) : (
                      <svg width="100%" height="220" viewBox="0 0 500 220" className="overflow-visible">
                        <defs>
                          <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {(() => {
                          const maxVal = Math.max(...analytics.salesTrend.map((t: any) => t.revenue), 1);
                          const points = analytics.salesTrend.map((t: any, idx: number) => {
                            const x = 50 + idx * 65;
                            const y = 170 - (t.revenue / maxVal) * 120;
                            return { x, y, date: t.date.substring(5), revenue: t.revenue };
                          });

                          const pathD = `M ${points.map((p: any) => `${p.x},${p.y}`).join(' L ')}`;
                          const areaD = `${pathD} L ${points[points.length - 1].x},170 L ${points[0].x},170 Z`;

                          return (
                            <g>
                              {/* Grid lines */}
                              <line x1="40" y1="170" x2="480" y2="170" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                              <line x1="40" y1="50" x2="480" y2="50" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                              
                              {/* Fill area */}
                              <path d={areaD} fill="url(#area-grad)" />

                              {/* Draw line */}
                              <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="2.5" />

                              {/* Draw dots & labels */}
                              {points.map((p: any, idx: number) => (
                                <g key={idx}>
                                  <circle cx={p.x} cy={p.y} r="4.5" fill="#a855f7" className="cursor-pointer" />
                                  <text x={p.x} y="190" fill="#64748b" textAnchor="middle" className="text-[9px] font-bold">{p.date}</text>
                                  <text x={p.x} y={p.y - 10} fill="white" textAnchor="middle" className="text-[9px] font-extrabold">₹{Math.round(p.revenue)}</text>
                                </g>
                              ))}
                            </g>
                          );
                        })()}
                      </svg>
                    )}
                  </div>
                </div>

              </div>

              {/* Route Occupancy Heatmap */}
              <div className="glass rounded-3xl overflow-hidden border border-slate-800/40">
                <div className="px-6 py-4 border-b border-slate-800/60 flex items-center justify-between">
                  <h3 className="font-extrabold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="w-4.5 h-4.5 text-pink-500" />
                    Route Segment Occupancy Heatmap
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  {analytics.routeHeatmap.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-xs">No active route demands calculated yet</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-800/60 bg-slate-900/50">
                          <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Route Corridor</th>
                          <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Train</th>
                          <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Occupancy Fill Rate</th>
                          <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Demand Level</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.routeHeatmap.map((route: any, idx: number) => {
                          const isHigh = route.demand === 'High Demand';
                          const isMed = route.demand === 'Medium Demand';
                          const demandColor = isHigh 
                            ? 'border-red-950/30 text-red-400 bg-red-950/10' 
                            : isMed 
                            ? 'border-amber-950/30 text-amber-400 bg-amber-950/10' 
                            : 'border-slate-800 text-slate-400 bg-slate-900/20';

                          return (
                            <tr key={idx} className="border-b border-slate-800/30 hover:bg-slate-800/10"
                              style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(13,19,53,0.15)' }}>
                              <td className="px-5 py-4 font-bold text-white text-xs">
                                {route.from} → {route.to}
                              </td>
                              <td className="px-5 py-4 text-slate-400 text-xs">
                                <span className="font-semibold text-slate-300">{route.trainName}</span> ({route.trainNumber})
                              </td>
                              <td className="px-5 py-4 font-mono font-bold text-xs text-indigo-400">
                                {route.occupancy}% Filled
                              </td>
                              <td className="px-5 py-4">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-lg border ${demandColor}`}>
                                  {route.demand}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-slate-500 text-xs">Could not load revenue statistics data.</div>
          )}
        </div>
      )}

      {/* Trains tab */}
      {tab === 'trains' && (
        <div className="glass rounded-2xl overflow-hidden border border-slate-800/40">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800/60 bg-slate-900/50">
                  <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Number</th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Route</th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Stops</th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {trains.map((train, idx) => (
                  <tr key={train.id} className="border-b border-slate-800/30 hover:bg-slate-800/10"
                    style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(13,19,53,0.15)' }}>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-300">{train.trainNumber}</td>
                    <td className="px-5 py-3.5 text-white font-bold">{train.name}</td>
                    <td className="px-5 py-3.5 text-indigo-400 text-xs font-semibold">{train.type}</td>
                    <td className="px-5 py-3.5 text-slate-400 text-xs">{train.fromStation} → {train.toStation}</td>
                    <td className="px-5 py-3.5 text-slate-400 text-sm font-mono">{train.routes?.length}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-bold uppercase ${train.isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                        {train.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => toggleTrain(train.id, train.isActive)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-bold uppercase tracking-wider transition-all ${train.isActive
                          ? 'text-red-400 border-red-400/30 hover:bg-red-400/10'
                          : 'text-emerald-400 border-emerald-400/30 hover:bg-emerald-400/10'
                          }`}>
                        {train.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bookings tab */}
      {tab === 'bookings' && (
        <div className="glass rounded-2xl overflow-hidden border border-slate-800/40">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800/60 bg-slate-900/50">
                  <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">PNR</th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">User</th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Train</th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Class</th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">PAX</th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fare</th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b, idx) => (
                  <tr key={b.id} className="border-b border-slate-800/30 hover:bg-slate-800/10"
                    style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(13,19,53,0.15)' }}>
                    <td className="px-5 py-3.5 font-mono text-xs text-indigo-400 font-bold">{b.pnr}</td>
                    <td className="px-5 py-3.5 text-slate-300">
                      <div className="text-sm font-semibold">{b.user?.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{b.user?.email}</div>
                    </td>
                    <td className="px-5 py-3.5 text-white text-xs">{b.train?.name}</td>
                    <td className="px-5 py-3.5 text-slate-400 text-xs font-mono">{b.journeyDate}</td>
                    <td className="px-5 py-3.5 text-slate-400 text-xs">{b.seatClass}</td>
                    <td className="px-5 py-3.5 text-slate-400 text-center font-mono">{b.totalPassengers}</td>
                    <td className="px-5 py-3.5 text-white font-extrabold">₹{b.totalFare}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-bold uppercase ${b.status === 'Confirmed' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {bookings.length === 0 && <div className="text-center py-10 text-slate-500">No bookings found</div>}
          </div>
        </div>
      )}

      {/* Delays tab */}
      {tab === 'delays' && (
        <div className="space-y-6">
          {/* Set delay form */}
          <div className="glass rounded-2xl p-6 border border-slate-800/40">
            <h2 className="text-sm font-extrabold text-white mb-4 flex items-center gap-2 uppercase tracking-widest">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Set / Update Train Delay
            </h2>
            <form onSubmit={handleSetDelay} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block font-bold uppercase tracking-wider">Train</label>
                <select id="delay-train" className="input-field text-xs" value={delayForm.trainId}
                  onChange={e => setDelayForm(f => ({ ...f, trainId: e.target.value }))}>
                  <option value="">Select Train</option>
                  {trains.filter(t => t.isActive).map(t => (
                    <option key={t.id} value={t.id}>{t.trainNumber} — {t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block font-bold uppercase tracking-wider">Date</label>
                <input type="date" className="input-field text-xs font-mono" value={delayForm.date}
                  onChange={e => setDelayForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block font-bold uppercase tracking-wider">Delay (minutes)</label>
                <input type="number" className="input-field text-xs font-mono" placeholder="e.g. 45" min="0" max="600"
                  value={delayForm.delayMinutes}
                  onChange={e => setDelayForm(f => ({ ...f, delayMinutes: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block font-bold uppercase tracking-wider">Reason</label>
                <input className="input-field text-xs" placeholder="e.g. Track maintenance"
                  value={delayForm.reason}
                  onChange={e => setDelayForm(f => ({ ...f, reason: e.target.value }))} />
              </div>
              <div className="md:col-span-2 lg:col-span-4 pt-2">
                <button type="submit" disabled={submittingDelay} className="btn-primary gap-2 text-xs py-2.5 px-6 font-bold uppercase tracking-wider rounded-xl">
                  {submittingDelay ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Set Delay</>}
                </button>
              </div>
            </form>
          </div>

          {/* Current delays */}
          <div className="glass rounded-2xl overflow-hidden border border-slate-800/40">
            <div className="px-6 py-4 border-b border-slate-800/60">
              <h2 className="font-extrabold text-white text-sm uppercase tracking-wider">Today&apos;s Active Delays</h2>
            </div>
            {delays.filter(d => d.delayMinutes > 0).length === 0 ? (
              <div className="text-center py-10 text-slate-500 flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                All trains are on time today!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800/60 bg-slate-900/50">
                      <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Train</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Delay</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reason</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {delays.filter(d => d.delayMinutes > 0).map((d, idx) => (
                      <tr key={d.id} className="border-b border-slate-800/30"
                        style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(13,19,53,0.15)' }}>
                        <td className="px-5 py-3.5">
                          <div className="text-white font-bold">{d.train?.name}</div>
                          <div className="text-slate-500 text-xs font-mono">{d.train?.trainNumber}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`font-extrabold text-sm ${d.delayMinutes > 30 ? 'text-red-400' : 'text-amber-400'}`}>
                            +{d.delayMinutes} min
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-400 text-sm">{d.reason || '—'}</td>
                        <td className="px-5 py-3.5">
                          <button onClick={() => clearDelay(d.trainId, d.date)}
                            className="text-xs text-red-400 hover:text-red-300 border border-red-400/30 hover:bg-red-400/10 px-3.5 py-1.5 rounded-xl font-bold uppercase tracking-wider transition-all">
                            Clear
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
interface RefreshCwProps extends React.SVGProps<SVGSVGElement> {}
function RefreshCw(props: RefreshCwProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
