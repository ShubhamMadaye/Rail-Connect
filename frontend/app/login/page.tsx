'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Train, Eye, EyeOff, Loader2, MapPin, Clock, Shield, Zap } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import toast from 'react-hot-toast';

const HIGHLIGHTS = [
  { icon: <Zap className="w-4 h-4" />,    text: 'Instant PNR confirmation' },
  { icon: <Clock className="w-4 h-4" />,  text: 'Real-time delay tracking' },
  { icon: <MapPin className="w-4 h-4" />, text: 'In-train food ordering' },
  { icon: <Shield className="w-4 h-4" />, text: 'Secure & encrypted payments' },
];

export default function LoginPage() {
  const { login, user } = useAuth();
  const router = useRouter();
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (!loading && user) router.replace(user?.role === 'admin' ? '/admin' : '/dashboard');
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const loggedInUser = await login(email, password);
      toast.success('Welcome back!');
      router.push(loggedInUser.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-68px)] flex">

      {/* Left — Branding Panel */}
      <div className="hidden lg:flex lg:w-[45%] relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #080D24 0%, #0D1335 60%, #111827 100%)' }}>
        {/* Decorative background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }} />
        </div>
        {/* Track decoration at bottom */}
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

        {/* Hero content */}
        <div className="relative">
          <div className="mb-8">
            <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">
              Your Journey,<br />
              <span style={{
                background: 'linear-gradient(135deg, #818cf8, #fcd34d)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>Reimagined.</span>
            </h2>
            <p className="text-slate-400 text-base leading-relaxed max-w-xs">
              India&apos;s smartest railway booking platform. Book tickets, track trains, and travel in comfort.
            </p>
          </div>

          <div className="space-y-3">
            {HIGHLIGHTS.map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8' }}>
                  {icon}
                </div>
                <span className="text-slate-300 text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom quote */}
        <div className="relative">
          <div className="text-slate-600 text-xs leading-relaxed italic">
            "Trusted by 2 million+ Indian travellers every month."
          </div>
        </div>
      </div>

      {/* Right — Form Panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12"
        style={{ background: '#03061A' }}>
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
              <Train className="w-6 h-6 text-white" />
            </div>
            <div className="font-extrabold text-xl gradient-text">RailConnect</div>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-white mb-1">Welcome back</h1>
            <p className="text-slate-500">Sign in to your account to continue</p>
          </div>

          <div className="glass-elevated rounded-3xl p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="input-label">
                  Email Address
                </label>
                <input
                  id="login-email"
                  type="email"
                  className="input-field"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="input-label mb-0">Password</label>
                  <button type="button" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPw ? 'text' : 'password'}
                    className="input-field pr-12"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setShowPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="btn-primary w-full justify-center py-3.5 rounded-xl text-base mt-2"
                style={{ borderRadius: '0.875rem' }}>
                {loading
                  ? <><Loader2 className="w-5 h-5 animate-spin" /> Signing in...</>
                  : 'Sign In to RailConnect'
                }
              </button>
            </form>

            <p className="text-center text-slate-500 text-sm mt-6">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
                Create one free →
              </Link>
            </p>

            {/* Demo credentials */}
            <div className="mt-5 p-3.5 rounded-2xl" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}>
              <p className="text-xs text-slate-500 text-center">
                <span className="text-slate-400 font-semibold">Demo Admin:</span>{' '}
                admin@railway.com{' · '}admin123
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
