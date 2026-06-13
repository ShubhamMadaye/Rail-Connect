'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Train, Eye, EyeOff, Loader2, CheckCircle2, Zap, Clock, MapPin, Shield } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import toast from 'react-hot-toast';

const STEPS = [
  'Create your free account',
  'Search across 200+ trains',
  'Book tickets in under 2 minutes',
  'Track your journey live',
];

export default function RegisterPage() {
  const { register, user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (!loading && user) router.replace(user?.role === 'admin' ? '/admin' : '/dashboard');
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      const newUser = await register(form.name, form.email, form.password, form.phone);
      toast.success('Account created! Welcome aboard');
      router.push(newUser.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, val: string) => setForm(f => ({ ...f, [field]: val }));

  return (
    <div className="min-h-[calc(100vh-68px)] flex">

      {/* Left — Branding Panel */}
      <div className="hidden lg:flex lg:w-[45%] relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #080D24 0%, #0D1335 60%, #111827 100%)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }} />
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 track-dots opacity-20" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
            <Train className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-extrabold text-xl" style={{
              background: 'linear-gradient(135deg, #818cf8, #c084fc, #fcd34d)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>RailConnect</div>
            <div className="text-[9px] text-slate-600 tracking-widest uppercase">Smart Booking Platform</div>
          </div>
        </div>

        {/* Steps */}
        <div className="relative">
          <h2 className="text-3xl font-extrabold text-white mb-2">
            Get started in<br />
            <span style={{
              background: 'linear-gradient(135deg, #818cf8, #fcd34d)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>60 seconds.</span>
          </h2>
          <p className="text-slate-400 text-sm mb-8">Join 2M+ travellers on India&apos;s premium railway platform.</p>

          <div className="space-y-4">
            {STEPS.map((step, i) => (
              <div key={step} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-extrabold"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: 'white' }}>
                  {i + 1}
                </div>
                <span className="text-slate-300 text-sm font-medium">{step}</span>
              </div>
            ))}
          </div>

          <div className="mt-10 flex items-center gap-3">
            {[Zap, Clock, MapPin, Shield].map((Icon, i) => (
              <div key={i} className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8' }}>
                <Icon className="w-4 h-4" />
              </div>
            ))}
            <span className="text-slate-500 text-xs ml-1">All features included. Free.</span>
          </div>
        </div>

        <div className="relative">
          <div className="text-slate-600 text-xs italic">
            "Trusted by 2 million+ Indian travellers every month."
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-10"
        style={{ background: '#03061A' }}>
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
              <Train className="w-6 h-6 text-white" />
            </div>
            <div className="font-extrabold text-xl gradient-text">RailConnect</div>
          </div>

          <div className="mb-7">
            <h1 className="text-3xl font-extrabold text-white mb-1">Create your account</h1>
            <p className="text-slate-500">Start your smart rail journey today. It&apos;s free.</p>
          </div>

          <div className="glass-elevated rounded-3xl p-7">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="input-label">Full Name</label>
                  <input id="reg-name" className="input-field" placeholder="Rahul Sharma"
                    value={form.name} onChange={e => update('name', e.target.value)} required />
                </div>
                <div className="col-span-2">
                  <label className="input-label">Email</label>
                  <input id="reg-email" type="email" className="input-field" placeholder="you@example.com"
                    value={form.email} onChange={e => update('email', e.target.value)} required />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="input-label">
                    Phone <span className="text-slate-700 normal-case font-normal">(optional)</span>
                  </label>
                  <input id="reg-phone" type="tel" className="input-field" placeholder="+91 98765 43210"
                    value={form.phone} onChange={e => update('phone', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="input-label">Password</label>
                <div className="relative">
                  <input id="reg-password" type={showPw ? 'text' : 'password'} className="input-field pr-12"
                    placeholder="At least 6 characters" value={form.password}
                    onChange={e => update('password', e.target.value)} required />
                  <button type="button" onClick={() => setShowPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1 transition-colors">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="input-label">Confirm Password</label>
                <div className="relative">
                  <input id="reg-confirm" type="password" className="input-field pr-12"
                    placeholder="Re-enter password" value={form.confirm}
                    onChange={e => update('confirm', e.target.value)} required />
                  {form.confirm && form.password === form.confirm && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                  )}
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="btn-primary w-full justify-center py-3.5 mt-2 text-base"
                style={{ borderRadius: '0.875rem' }}>
                {loading
                  ? <><Loader2 className="w-5 h-5 animate-spin" /> Creating account...</>
                  : 'Create Free Account'
                }
              </button>
            </form>

            <p className="text-center text-slate-500 text-sm mt-5">
              Already have an account?{' '}
              <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
                Sign in →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
