'use client';
import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { trainsAPI, bookingsAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Train, User, Plus, Trash2, Loader2, ArrowRight, IndianRupee, MapPin } from 'lucide-react';
import DelayBadge from '@/components/DelayBadge';
import toast from 'react-hot-toast';
import Link from 'next/link';

const DEFAULT_CLASSES = ['General', 'Sleeper', '3AC', '2AC', '1AC'];
const LOCAL_CLASSES = ['First Class', 'Second Class'];
const GENDERS = ['Male', 'Female', 'Other'];

interface Passenger { name: string; age: string; gender: string; }

function BookingForm() {
  const { trainId } = useParams<{ trainId: string }>();
  const sp = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const fromStation = sp.get('from') || '';
  const toStation = sp.get('to') || '';
  const date = sp.get('date') || new Date().toISOString().split('T')[0];
  const initialClass = sp.get('class') || 'Sleeper';

  const [train, setTrain] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [seatClass, setSeatClass] = useState(initialClass);
  const [passengers, setPassengers] = useState<Passenger[]>([{ name: '', age: '', gender: 'Male' }]);

  useEffect(() => {
    trainsAPI.getById(trainId).then(r => setTrain(r.data)).finally(() => setLoading(false));
  }, [trainId]);

  useEffect(() => {
    if (train?.type === 'Local' && user && passengers.length === 1 && !passengers[0].name) {
      setPassengers([{ name: user.name, age: '25', gender: 'Male' }]);
    }
  }, [train, user]);

  const isLocal = train?.type === 'Local';
  const availableClasses = isLocal ? LOCAL_CLASSES : DEFAULT_CLASSES;
  const defaultFareMap: Record<string, number> = { General: 0.5, Sleeper: 1.2, '3AC': 2.5, '2AC': 3.8, '1AC': 6.0 };
  const localFareMap: Record<string, number> = { 'Second Class': 0.2, 'First Class': 1.5 };
  const fareMap = isLocal ? localFareMap : defaultFareMap;

  const fromRoute = train?.routes?.find((r: any) => r.station?.code === fromStation);
  const toRoute = train?.routes?.find((r: any) => r.station?.code === toStation);
  const dist = Math.abs((toRoute?.distanceFromOrigin || 100) - (fromRoute?.distanceFromOrigin || 0));
  const baseFare = Math.max(dist * 0.8, isLocal ? 10 : 50);
  const perFare = Math.max(isLocal ? 5 : 50, Math.round(baseFare * (fareMap[seatClass] || (isLocal ? 0.2 : 1.2))));
  const totalFare = perFare * passengers.length;

  const addPassenger = () => {
    if (passengers.length < 6) setPassengers(p => [...p, { name: '', age: '', gender: 'Male' }]);
  };

  const removePassenger = (i: number) => setPassengers(p => p.filter((_, idx) => idx !== i));

  const updatePassenger = (i: number, field: string, val: string) => {
    setPassengers(p => p.map((pass, idx) => idx === i ? { ...pass, [field]: val } : pass));
  };

  const handleBook = async () => {
    if (!user) { router.push('/login'); return; }
    for (const p of passengers) {
      if (!p.name || !p.age) return toast.error('Please fill all passenger details');
      if (isNaN(Number(p.age)) || Number(p.age) < 1 || Number(p.age) > 120) return toast.error('Invalid age');
    }
    setSubmitting(true);
    try {
      const r = await bookingsAPI.create({
        trainId,
        journeyDate: date,
        fromStation,
        toStation,
        seatClass,
        passengers,
      });
      toast.success('Booking confirmed!');
      router.push(`/booking/confirm?bookingId=${r.data.booking.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
    </div>
  );

  if (!train) return (
    <div className="text-center py-20">
      <Train className="w-16 h-16 text-slate-700 mx-auto mb-4" />
      <p className="text-slate-400">Train not found</p>
      <Link href="/trains/search" className="btn-secondary mt-4 inline-flex">Go Back</Link>
    </div>
  );

  const formatTo12Hr = (timeStr: string | null | undefined): string => {
    if (!timeStr || timeStr === '—') return '—';
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

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Train summary */}
      <div className="glass rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-slate-500 font-mono text-sm">{train.trainNumber}</span>
              <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                {train.type}
              </span>
              {train.delay && <DelayBadge delayMinutes={train.delay.delayMinutes} />}
            </div>
            <h1 className="text-2xl font-bold text-white">{train.name}</h1>
          </div>
          <div className="text-right text-slate-400 text-sm">
            {date}
          </div>
        </div>

        <div className="flex items-center gap-6 mt-4">
          <div>
            <div className="text-xl font-bold text-white">{formatTo12Hr(fromRoute?.departureTime)}</div>
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {fromStation}
            </div>
          </div>
          <div className="flex-1 h-px bg-slate-700" />
          <ArrowRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
          <div className="flex-1 h-px bg-slate-700" />
          <div className="text-right">
            <div className="text-xl font-bold text-white">{formatTo12Hr(toRoute?.arrivalTime)}</div>
            <div className="text-xs text-slate-400 flex items-center gap-1 justify-end">
              <MapPin className="w-3 h-3" /> {toStation}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Class selection */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Select Class</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {availableClasses.map(cls => (
                <button key={cls} onClick={() => setSeatClass(cls)}
                  className={`py-3 px-2 rounded-xl text-sm font-semibold text-center border transition-all ${
                    seatClass === cls
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
                      : 'text-slate-400 border-slate-700/50 hover:border-slate-600'
                  }`}>
                  {cls}
                  <div className="text-xs font-normal text-slate-500 mt-0.5">
                    ₹{Math.max(isLocal ? 5 : 50, Math.round(baseFare * fareMap[cls]))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Passengers */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-400" />
                Passengers ({passengers.length}/6)
              </h2>
              {passengers.length < 6 && (
                <button onClick={addPassenger} className="btn-secondary text-sm py-2 px-3 gap-1">
                  <Plus className="w-4 h-4" /> Add
                </button>
              )}
            </div>

            <div className="space-y-4">
              {passengers.map((p, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-400">Passenger {i + 1}</span>
                    {i > 0 && (
                      <button onClick={() => removePassenger(i)} className="text-red-400 hover:text-red-300">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-1">
                      <input
                        id={`passenger-name-${i}`}
                        className="input-field"
                        placeholder="Full Name"
                        value={p.name}
                        onChange={e => updatePassenger(i, 'name', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <input
                        id={`passenger-age-${i}`}
                        className="input-field"
                        placeholder="Age"
                        type="number"
                        min="1"
                        max="120"
                        value={p.age}
                        onChange={e => updatePassenger(i, 'age', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <select
                        id={`passenger-gender-${i}`}
                        className="input-field"
                        value={p.gender}
                        onChange={e => updatePassenger(i, 'gender', e.target.value)}
                      >
                        {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {isLocal && (
              <div className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm">
                <strong>Note:</strong> Local trains have unreserved seating. Your ticket is valid for any local train on this route for the entire day. No fixed seat numbers will be assigned.
              </div>
            )}
          </div>
        </div>

        {/* Fare summary */}
        <div className="space-y-4">
          <div className="glass rounded-2xl p-6 sticky top-24">
            <h2 className="text-lg font-semibold text-white mb-4">Fare Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Class</span>
                <span className="text-white font-medium">{seatClass}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Passengers</span>
                <span className="text-white font-medium">{passengers.length}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Fare/person</span>
                <span className="text-white font-medium">₹{perFare}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Distance</span>
                <span className="text-white font-medium">{dist} km</span>
              </div>
              <div className="border-t border-slate-700 pt-3 flex justify-between items-center">
                <span className="text-slate-300 font-semibold">Total</span>
                <span className="text-2xl font-bold text-white flex items-center gap-1">
                  <IndianRupee className="w-5 h-5 text-indigo-400" />{totalFare}
                </span>
              </div>
            </div>

            {!user ? (
              <div className="mt-4">
                <p className="text-slate-400 text-sm mb-3 text-center">Sign in to book</p>
                <Link href={`/login?redirect=/booking/${trainId}`} className="btn-primary w-full justify-center">
                  Sign In & Book
                </Link>
              </div>
            ) : (
              <button
                id="confirm-booking-btn"
                onClick={handleBook}
                disabled={submitting}
                className="btn-primary w-full justify-center mt-4 py-3"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Confirm & Pay ₹{totalFare}</>}
              </button>
            )}

            <p className="text-xs text-slate-500 text-center mt-3">
              Simulated payment — always succeeds instantly
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-indigo-400" /></div>}>
      <BookingForm />
    </Suspense>
  );
}
