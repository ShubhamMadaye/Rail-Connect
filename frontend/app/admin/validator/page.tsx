'use client';
import { useState, useEffect, Suspense } from 'react';
import { bookingsAPI } from '@/lib/api';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Shield, Loader2, CheckCircle2, XCircle, Search, ArrowLeft,
  Calendar, MapPin, User, Info, ScanLine, FileUp, Check
} from 'lucide-react';
import toast from 'react-hot-toast';

function ValidatorContent() {
  const searchParams = useSearchParams();
  const [pnrInput, setPnrInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [searched, setSearched] = useState(false);

  // List of active bookings in database for easy click-to-scan simulation
  const [sampleBookings, setSampleBookings] = useState<any[]>([]);

  useEffect(() => {
    bookingsAPI.getMy()
      .then(res => {
        setSampleBookings(res.data.bookings || []);
      })
      .catch(() => {});
  }, []);

  const handleValidate = async (pnrToCheck: string) => {
    if (!pnrToCheck.trim()) return toast.error('Enter a PNR code');
    setLoading(true);
    setResult(null);
    setSearched(true);
    try {
      const res = await bookingsAPI.validateTicket(pnrToCheck.trim().toUpperCase());
      setResult(res.data);
    } catch {
      toast.error('Failed to contact validator endpoint');
    } finally {
      setLoading(false);
    }
  };

  // Auto-validate if PNR parameter is present in URL
  useEffect(() => {
    const pnrParam = searchParams.get('pnr');
    if (pnrParam) {
      setPnrInput(pnrParam.toUpperCase());
      const trigger = async () => {
        setLoading(true);
        setResult(null);
        setSearched(true);
        try {
          const res = await bookingsAPI.validateTicket(pnrParam.trim().toUpperCase());
          setResult(res.data);
        } catch {
          toast.error('Failed to contact validator endpoint');
        } finally {
          setLoading(false);
        }
      };
      trigger();
    }
  }, [searchParams]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleValidate(pnrInput);
  };

  const simulateQRCodeUpload = (pnr: string) => {
    setPnrInput(pnr);
    toast.success('QR Code ticket uploaded successfully');
    handleValidate(pnr);
  };

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Back button */}
      <Link href="/admin" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-white uppercase tracking-wider mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Admin Panel
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <ScanLine className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Ticket Validator Portal</h1>
          <p className="text-slate-400 text-sm font-medium">Verify passenger e-ticket status and PNR signatures</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Input Forms */}
        <div className="md:col-span-1 space-y-6">
          
          {/* Form */}
          <div className="glass-elevated rounded-3xl p-5 border border-slate-800/40">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Manual Validation</h3>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">PNR Number</label>
                <input
                  id="validator-pnr"
                  className="input-field text-xs font-mono tracking-widest text-center"
                  placeholder="Enter 10-char PNR..."
                  value={pnrInput}
                  onChange={e => setPnrInput(e.target.value.toUpperCase())}
                  maxLength={10}
                />
              </div>
              <button type="submit" disabled={loading}
                className="btn-primary w-full justify-center text-xs py-2.5 font-bold uppercase tracking-wider rounded-xl">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Validate PNR'}
              </button>
            </form>
          </div>

          {/* Simulated File Upload Scan */}
          <div className="glass rounded-3xl p-5 border border-slate-800/40">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Simulate File Upload</h3>
            <div className="border border-dashed border-slate-800 rounded-2xl p-6 text-center hover:border-indigo-500/40 transition-colors cursor-pointer relative">
              <input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={() => {
                  if (sampleBookings.length > 0) {
                    const randomPnr = sampleBookings[Math.floor(Math.random() * sampleBookings.length)].pnr;
                    simulateQRCodeUpload(randomPnr);
                  } else {
                    toast.error('No bookings found to simulate. Please book a ticket first.');
                  }
                }}
              />
              <FileUp className="w-6 h-6 text-slate-500 mx-auto mb-2" />
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Upload Ticket Image</span>
              <span className="text-[9px] text-slate-600 block mt-1">Accepts QR Code screenshots</span>
            </div>
          </div>

          {/* Quick simulation links */}
          {sampleBookings.length > 0 && (
            <div className="glass rounded-3xl p-5 border border-slate-800/40 space-y-3">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select From Your Bookings</h3>
              <div className="space-y-1.5">
                {sampleBookings.slice(0, 3).map((b, i) => (
                  <button key={i} onClick={() => { setPnrInput(b.pnr); handleValidate(b.pnr); }}
                    className="w-full text-left px-3 py-2 rounded-xl bg-slate-900/50 hover:bg-slate-800 text-[10px] text-slate-300 font-semibold border border-slate-800/40 transition-colors flex items-center justify-between">
                    <span className="font-mono">{b.pnr}</span>
                    <span className="text-[9px] text-slate-500 uppercase">{b.train.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Output Panel */}
        <div className="md:col-span-2">
          
          {loading ? (
            <div className="glass-elevated rounded-3xl p-16 flex flex-col items-center justify-center gap-3 border border-slate-800/40 min-h-[350px]">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
              <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Verifying ticket signature...</span>
            </div>
          ) : searched && result ? (
            result.valid ? (
              /* Success Panel */
              <div className="glass-elevated rounded-3xl p-6 border-2 border-emerald-500/20 bg-slate-900/10 min-h-[350px] space-y-6 animate-fade-in">
                
                {/* Status Indicator */}
                <div className="flex items-center gap-3 pb-4 border-b border-slate-800/40">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-white text-base font-extrabold uppercase tracking-wider">Validation Success</h3>
                    <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">Active Ticket</span>
                  </div>
                  <div className="ml-auto font-mono text-xs text-indigo-400 font-bold bg-indigo-500/10 px-3 py-1 rounded-lg">
                    PNR: {result.pnr}
                  </div>
                </div>

                {/* Train Details */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Train Name & Number</span>
                    <div className="text-white font-bold mt-0.5">{result.trainName} ({result.trainNumber})</div>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Journey Date</span>
                    <div className="text-white font-bold mt-0.5 font-mono">{result.journeyDate}</div>
                  </div>
                </div>

                {/* Corridor */}
                <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-950/40 border border-slate-800/40 rounded-2xl p-4">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{result.fromStation}</span>
                  <span className="text-slate-600">→</span>
                  <span>{result.toStation}</span>
                  <span className="text-slate-700 font-normal">·</span>
                  <span className="text-indigo-400 font-bold">{result.seatClass} Class</span>
                </div>

                {/* Carriage/Seat Allocation */}
                <div className="grid grid-cols-2 gap-4 text-xs border-t border-slate-800/30 pt-4">
                  <div>
                    <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Coach Number</span>
                    <div className="text-white font-bold mt-0.5">{result.coachNumber || 'General / Unreserved'}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Allocated Seats</span>
                    <div className="text-white font-bold mt-0.5 font-mono">{result.seatNumbers?.join(', ') || 'General Admission'}</div>
                  </div>
                </div>

                {/* Passengers */}
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider block mb-2">Verified Passengers</span>
                  <div className="space-y-2">
                    {result.passengers?.map((p: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-xs py-1.5 border-b border-slate-800/10 last:border-0">
                        <span className="text-white font-semibold">{p.name}</span>
                        <span className="text-slate-500">{p.age} yrs · {p.gender}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              /* Failure Panel */
              <div className="glass-elevated rounded-3xl p-8 border-2 border-red-500/20 bg-slate-900/10 min-h-[350px] flex flex-col items-center justify-center text-center gap-4 animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
                  <XCircle className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-white text-lg font-extrabold uppercase tracking-wider">Ticket Rejected</h3>
                  <p className="text-slate-500 text-xs mt-2 max-w-[280px] leading-relaxed">
                    {result.message || 'The PNR verification failed. This PNR does not exist in the database or the booking is cancelled.'}
                  </p>
                </div>
                {pnrInput && (
                  <span className="font-mono text-xs text-red-400/80 bg-red-500/10 px-4 py-1.5 rounded-lg border border-red-500/10 mt-2">
                    Failed Code: {pnrInput}
                  </span>
                )}
              </div>
            )
          ) : (
            /* Idle Panel */
            <div className="glass rounded-3xl p-16 flex flex-col items-center justify-center text-center gap-4 border border-slate-800/40 min-h-[350px]">
              <div className="w-16 h-16 rounded-3xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}>
                <Info className="w-8 h-8 text-slate-600" />
              </div>
              <div>
                <h3 className="text-slate-300 text-sm font-bold uppercase tracking-wider">Awaiting validation</h3>
                <p className="text-slate-600 text-xs mt-2 max-w-[260px] leading-relaxed">
                  Input a 10-digit ticket PNR code or upload a ticket image to execute QR verification checks.
                </p>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}

export default function TicketValidatorPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    }>
      <ValidatorContent />
    </Suspense>
  );
}
