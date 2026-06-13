'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { bookingsAPI } from '@/lib/api';
import { CheckCircle, Train, User, IndianRupee, Loader2, Download, Utensils } from 'lucide-react';
import Link from 'next/link';
import DelayBadge from '@/components/DelayBadge';

function ConfirmContent() {
  const sp = useSearchParams();
  const bookingId = sp.get('bookingId');
  const pnr = sp.get('pnr');

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        if (bookingId) {
          const r = await bookingsAPI.getById(bookingId);
          setBooking(r.data.booking);
        } else if (pnr) {
          const r = await bookingsAPI.getByPNR(pnr);
          setBooking(r.data.booking);
        }
      } catch { } finally { setLoading(false); }
    };
    fetch();
  }, [bookingId, pnr]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
    </div>
  );

  if (!booking) return (
    <div className="text-center py-20">
      <p className="text-slate-400">Booking not found</p>
      <Link href="/dashboard" className="btn-secondary mt-4 inline-flex">My Bookings</Link>
    </div>
  );

  const seatNumbers = booking.seatNumbers ? JSON.parse(booking.seatNumbers) : [];

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Success banner */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Booking Confirmed!</h1>
        <p className="text-slate-400">Your e-ticket has been generated. Have a great journey!</p>
      </div>

      {/* Ticket card */}
      <div className="glass rounded-3xl overflow-hidden border border-slate-700/50 mb-6">
        {/* Ticket top */}
        <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 p-6 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Train className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-white text-lg">{booking.train?.name}</div>
                <div className="text-slate-400 text-sm font-mono">{booking.train?.trainNumber}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500 mb-1">PNR</div>
              <div className="text-2xl font-bold text-white tracking-wider font-mono">{booking.pnr}</div>
            </div>
          </div>
        </div>

        {/* Journey info */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <div className="text-xs text-slate-500 uppercase mb-1">From</div>
              <div className="text-lg font-bold text-white">{booking.fromStation}</div>
              <div className="text-slate-400 text-sm">{booking.journeyDate}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500 uppercase mb-1">To</div>
              <div className="text-lg font-bold text-white">{booking.toStation}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-t border-b border-slate-700/50 mb-6">
            <div>
              <div className="text-xs text-slate-500 mb-1">Class</div>
              <div className="text-white font-semibold">{booking.seatClass}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Coach</div>
              <div className="text-white font-semibold">{booking.coachNumber}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Passengers</div>
              <div className="text-white font-semibold">{booking.totalPassengers}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Status</div>
              <span className={`text-xs font-bold ${booking.status === 'Confirmed' ? 'text-emerald-400' : 'text-red-400'}`}>
                {booking.status}
              </span>
            </div>
          </div>

          {/* Passengers */}
          <div className="mb-4">
            <div className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-400" /> Passengers
            </div>
            <div className="space-y-2">
              {booking.passengers?.map((p: any, i: number) => (
                <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-800/50">
                  <div>
                    <span className="text-white font-medium text-sm">{p.name}</span>
                    <span className="text-slate-500 text-xs ml-2">{p.age}y · {p.gender}</span>
                  </div>
                  <span className="text-slate-400 text-xs font-mono">{p.seatNumber || seatNumbers[i]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Fare */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
            <span className="text-slate-400">Total Paid</span>
            <span className="text-2xl font-bold text-white flex items-center gap-1">
              <IndianRupee className="w-5 h-5 text-indigo-400" />{booking.totalFare}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Link
          href={`/food/${booking.id}`}
          className="btn-secondary justify-center py-3"
          id="order-food-btn"
        >
          <Utensils className="w-4 h-4" /> Order Food
        </Link>
        <Link href="/dashboard" className="btn-primary justify-center py-3">
          My Bookings
        </Link>
      </div>

      {/* PNR lookup prompt */}
      <div className="glass rounded-xl p-4 text-center text-sm text-slate-400">
        Save your PNR: <span className="text-white font-bold font-mono tracking-wider ml-1">{booking.pnr}</span>
        <br />Use it to look up your booking anytime.
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-indigo-400" /></div>}>
      <ConfirmContent />
    </Suspense>
  );
}
