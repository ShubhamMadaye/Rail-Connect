'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { bookingsAPI, foodAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  Utensils, ChefHat, Star, Loader2, ArrowRight,
  CheckCircle2, Search, Train, Clock, Check, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface Vendor {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  isOpen: boolean;
  station?: { name: string };
  menuItems?: any[];
}

export default function FoodPortalPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [pnr, setPnr] = useState('');
  const [searching, setSearching] = useState(false);
  const [inlineError, setInlineError] = useState('');
  
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [apiError, setApiError] = useState(false);

  // User booking records states
  const [latestBooking, setLatestBooking] = useState<any>(null);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [showManualSearch, setShowManualSearch] = useState(false);

  useEffect(() => {
    // Load cached PNR if present
    const cached = localStorage.getItem('rail_last_food_pnr');
    if (cached) setPnr(cached);

    // Fetch active vendors
    foodAPI.getAllVendors()
      .then(res => {
        setVendors(res.data.vendors || []);
        setLoadingVendors(false);
      })
      .catch(err => {
        console.error('Failed to load vendors:', err);
        setLoadingVendors(false);
        setApiError(true);
      });
  }, []);

  // Retrieve user bookings if authenticated
  useEffect(() => {
    if (user) {
      setLoadingBookings(true);
      bookingsAPI.getMy()
        .then(res => {
          const bookings = res.data.bookings || [];
          if (bookings.length > 0) {
            // Sort bookings to select the most recently created upcoming one
            const sorted = [...bookings].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setLatestBooking(sorted[0]);
          }
          setLoadingBookings(false);
        })
        .catch(err => {
          console.error('Failed to fetch user bookings:', err);
          setLoadingBookings(false);
        });
    }
  }, [user]);

  const handlePnrSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pnr.length !== 10) {
      setInlineError('PNR must be exactly 10 digits.');
      return;
    }
    setInlineError('');
    setSearching(true);

    try {
      const res = await bookingsAPI.getByPNR(pnr);
      const booking = res.data.booking;
      if (booking && booking.id) {
        localStorage.setItem('rail_last_food_pnr', pnr);
        toast.success('Booking located! Opening menu...');
        router.push(`/food/${booking.id}`);
      } else {
        setInlineError('No active booking found for this PNR.');
      }
    } catch (err: any) {
      setInlineError(err.response?.data?.error || 'PNR not found or invalid. Please check and try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleCategoryClick = (catName: string) => {
    toast((t) => (
      <span className="text-xs font-medium text-slate-350">
        To order <strong>{catName}</strong>, please locate your journey above to check available station vendors.
      </span>
    ), {
      duration: 4000,
      icon: '🍛',
    });
  };

  return (
    <div className="min-h-screen grid-bg relative overflow-x-hidden pt-12 pb-24">
      {/* Background glow layers */}
      <div className="absolute top-10 left-1/4 w-[30rem] h-[30rem] rounded-full pointer-events-none -z-10"
        style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.06) 0%, transparent 70%)', filter: 'blur(60px)' }} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        {/* ── SECTION 1: HERO & CTA OPTIONS ──────────────────────── */}
        <section className="text-center pt-10 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-6 bg-emerald-500/10 border border-emerald-500/25"
          >
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-300 text-[10px] font-bold tracking-widest uppercase">Hot Food Delivered directly to your coach</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-3xl md:text-5xl font-black text-white tracking-tight mb-4 leading-tight"
          >
            Fresh Food Delivered <br />
            <span style={{
              background: 'linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #4F46E5 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>Right to Your Seat</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 text-xs md:text-sm max-w-md mx-auto mb-8 leading-relaxed"
          >
            Retrieve your active journey to browse restaurants, customize menus, and coordinate meals delivered directly to your berth.
          </motion.p>

          <div className="max-w-md mx-auto mb-6">
            {loadingBookings ? (
              <div className="glass rounded-3xl p-8 border border-white/5 flex items-center justify-center gap-2.5">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                <span className="text-xs text-slate-400">Loading your latest ticket details...</span>
              </div>
            ) : latestBooking && !showManualSearch ? (
              /* Upgraded Case A: User has active booking record shortcut */
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-elevated rounded-3xl p-6 border border-indigo-500/20 text-center relative overflow-hidden"
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Upcoming Journey Located</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-450 text-[8px] font-bold uppercase tracking-wider">LATEST TRIP</span>
                </div>
                
                <div className="text-left bg-slate-950/40 p-4 rounded-2xl border border-slate-900/60 mb-5">
                  <h3 className="text-xs font-black text-white">{latestBooking.train?.name || 'Superfast Express'}</h3>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono leading-none">
                    {latestBooking.fromStation} → {latestBooking.toStation}
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3.5 border-t border-slate-900/60">
                    <div>
                      <span className="text-[8px] text-slate-500 uppercase font-black tracking-wider block">PNR Number</span>
                      <span className="text-xs font-mono font-bold text-cyan-400">{latestBooking.pnr}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-500 uppercase font-black tracking-wider block">Berth Details</span>
                      <span className="text-xs font-bold text-slate-300">Coach {latestBooking.coachNumber} / Seat {latestBooking.seatNumber || 'Allocated'}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    toast.success('Locating station menus...');
                    router.push(`/food/${latestBooking.id}`);
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl py-3 text-xs font-bold transition-all shadow-[0_4px_15px_rgba(79,70,229,0.3)] flex items-center justify-center gap-1.5"
                >
                  Order Food for this Trip
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setShowManualSearch(true)}
                  className="mt-4 text-[10px] font-bold text-slate-500 hover:text-slate-350 transition-colors"
                >
                  Order for a different PNR
                </button>
              </motion.div>
            ) : (
              /* Case B: Fallback to manual PNR search */
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-elevated rounded-3xl p-6 border border-white/10 relative"
              >
                <form onSubmit={handlePnrSearch} className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="Enter your 10-Digit PNR..."
                      value={pnr}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        setPnr(val);
                        if (val.length === 10) setInlineError('');
                      }}
                      className="w-full bg-slate-950 border border-white/8 rounded-2xl pl-10 pr-4 py-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono tracking-widest text-center"
                    />
                  </div>

                  <AnimatePresence>
                    {inlineError && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-red-400 text-[10px] font-bold text-center leading-normal"
                      >
                        {inlineError}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <button
                    type="submit"
                    disabled={pnr.length !== 10 || searching}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-2xl py-3 text-xs font-bold transition-all shadow-[0_4px_15px_rgba(79,70,229,0.3)] disabled:shadow-none flex items-center justify-center gap-2"
                  >
                    {searching ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Verifying Booking...
                      </>
                    ) : (
                      <>
                        Find My Journey
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>

                {latestBooking && (
                  <button
                    onClick={() => setShowManualSearch(false)}
                    className="mt-4 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    ← Back to Latest Trip Shortcut
                  </button>
                )}
              </motion.div>
            )}
          </div>

          {/* Trust Badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center items-center gap-6 text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-6"
          >
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Freshly Prepared</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> IRCTC Partner Vendors</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Delivery to Seat</span>
          </motion.div>
        </section>

        <div className="gradient-divider my-4" />

        {/* ── SECTION 2: POPULAR CATEGORIES ────────────────────────── */}
        <section className="py-12">
          <h2 className="text-center text-xs font-bold uppercase tracking-widest text-slate-500 mb-6">Popular Meal Categories</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-3xl mx-auto">
            {[
              { icon: '🍛', label: 'Veg Thali' },
              { icon: '🍗', label: 'Chicken Biryani' },
              { icon: '🥪', label: 'Sandwich' },
              { icon: '☕', label: 'Tea & Coffee' },
              { icon: '🥤', label: 'Beverages' }
            ].map(cat => (
              <button
                key={cat.label}
                onClick={() => handleCategoryClick(cat.label)}
                className="glass hover:border-indigo-500/30 transition-all rounded-2xl p-4 text-center flex flex-col items-center justify-center gap-2 group"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">{cat.icon}</span>
                <span className="text-[10px] font-bold text-slate-400 group-hover:text-white transition-colors">{cat.label}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="gradient-divider my-4" />

        {/* ── SECTION 3: RESTAURANT PARTNERS ───────────────────────── */}
        <section className="py-12">
          <div className="text-center mb-8">
            <h2 className="text-lg font-bold text-white">Partner Restaurants Serving Your Journey</h2>
            <p className="text-slate-500 text-xs mt-0.5">Top-rated hygienic caterers connected at major cross-country junctions.</p>
          </div>

          {loadingVendors ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            </div>
          ) : apiError || vendors.length === 0 ? (
            <div className="glass rounded-3xl p-8 text-center border border-white/5 max-w-sm mx-auto py-10">
              <Utensils className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <h4 className="text-xs font-bold text-white mb-1">No restaurants available at the moment</h4>
              <p className="text-[10px] text-slate-500 mb-5">Please verify your connection or refresh the vendor list.</p>
              <button
                onClick={() => {
                  setLoadingVendors(true);
                  setApiError(false);
                  foodAPI.getAllVendors()
                    .then(res => {
                      setVendors(res.data.vendors || []);
                      setLoadingVendors(false);
                    })
                    .catch(() => {
                      setLoadingVendors(false);
                      setApiError(true);
                    });
                }}
                className="bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-indigo-500/20 text-[9px] font-bold rounded-lg px-3.5 py-1.5 transition-all"
              >
                Retry Loading
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {vendors.map(vendor => (
                <div
                  key={vendor.id}
                  className="glass rounded-2xl p-5 border border-white/5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-xs font-bold text-white leading-tight">{vendor.name}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">{vendor.cuisine}</p>
                      </div>
                      <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 shrink-0">
                        <Star className="w-2.5 h-2.5 text-emerald-400 fill-emerald-400" />
                        <span className="text-emerald-400 text-[9px] font-bold">{vendor.rating}</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 mt-3">
                      <span className="font-bold text-slate-400 block mb-0.5 uppercase text-[8px] tracking-wider">Stations Served:</span>
                      <p className="font-mono text-slate-500 leading-tight">
                        {vendor.station?.name || 'Local Junction Stations'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-900 pt-3 mt-4">
                    <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase ${
                      vendor.isOpen ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-red-400 bg-red-400/10 border-red-400/20'
                    }`}>
                      {vendor.isOpen ? 'Open' : 'Closed'}
                    </span>
                    <button
                      onClick={() => handleCategoryClick(vendor.name)}
                      className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 transition-colors"
                    >
                      View Menu <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="gradient-divider my-4" />

        {/* ── SECTION 4: HOW IT WORKS FLOWCHART ─────────────────────── */}
        <section className="py-12 text-center">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6">How Delivery Works</h2>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 max-w-2xl mx-auto">
            {[
              { step: '1', title: 'Enter PNR', desc: 'Input your 10-digit ticket PNR' },
              { step: '2', title: 'Choose Station', desc: 'Select delivery junction' },
              { step: '3', title: 'Pick Restaurant', desc: 'Customize meals from menus' },
              { step: '4', title: 'Track Delivery', desc: 'Food delivered to your seat' }
            ].map((s, idx) => (
              <div key={idx} className="flex items-center gap-2 w-full sm:w-auto">
                <div className="glass rounded-xl p-3 flex items-center gap-2.5 flex-1 border border-white/5 text-left">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-xs font-bold font-mono">
                    {s.step}
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-white leading-tight">{s.title}</h4>
                    <p className="text-[8px] text-slate-500 mt-0.5">{s.desc}</p>
                  </div>
                </div>
                {idx < 3 && <ArrowRight className="w-3.5 h-3.5 text-slate-700 hidden sm:block shrink-0" />}
              </div>
            ))}
          </div>
        </section>

        <div className="gradient-divider my-4" />

        {/* ── SECTION 5: FAQs ──────────────────────────────────────── */}
        <section className="py-12">
          <div className="text-center mb-8">
            <h2 className="text-lg font-bold text-white">Frequently Asked Questions</h2>
            <p className="text-slate-500 text-xs mt-0.5">Quick guides to ordering on-board catering services.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              { q: 'Can I place food orders without a booking?', a: 'No, a verified 10-digit PNR code is strictly required so that partner restaurants can match your train schedule and locate your exact coach seat.' },
              { q: 'When should I place my food order?', a: 'Please place your order at least 60 to 90 minutes before your train reaches the selected station. This ensures the restaurant has time to cook and pack.' },
              { q: 'What happens if my train is delayed or routes change?', a: 'If a train delay shifts arrival outside restaurant hours or misses the stop, your order is auto-cancelled and a full refund is processed.' },
              { q: 'How is payment processed?', a: 'We support UPI, Net Banking, and Credit/Debit cards. Payments are processed securely via encrypted gateways directly on confirmation.' }
            ].map((faq, i) => (
              <div key={i} className="glass rounded-xl p-4 border border-white/5 text-left">
                <h4 className="text-[11px] font-bold text-white mb-1.5 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-indigo-500" />
                  {faq.q}
                </h4>
                <p className="text-[10px] text-slate-550 leading-relaxed pl-2.5">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
