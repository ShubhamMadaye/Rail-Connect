'use client';
import React, { useState } from 'react';
import { authAPI } from '@/lib/api';
import Link from 'next/link';
import { Loader2, Mail, ArrowLeft, Train, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error('Email is required');
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSubmitted(true);
      toast.success('Reset link dispatched! (Check backend/mock-emails.log)');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-68px)] flex items-center justify-center p-6" style={{ background: '#03061A' }}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 right-1/4 w-80 h-80 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.05) 0%, transparent 70%)' }} />
      </div>

      <div className="flex flex-col items-center gap-6 w-full max-w-md">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
            <Train className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-lg text-white">RailConnect</span>
        </div>

        <div className="glass-elevated rounded-3xl p-8 w-full">
          {!submitted ? (
            <>
              <h2 className="text-2xl font-extrabold text-white mb-2">Forgot Password</h2>
              <p className="text-slate-400 text-sm mb-6">
                Enter your email address and we will mock-send you a secure link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="input-label">Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      className="input-field pl-10"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full justify-center py-3 mt-2"
                  style={{ borderRadius: '0.75rem' }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Requesting...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                <Mail className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Check Your Mail</h2>
              <p className="text-slate-400 text-sm">
                If an account exists for <strong className="text-slate-300">{email}</strong>, a password reset link has been dispatched to it.
              </p>
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex gap-3 text-left">
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-400">
                  <strong className="text-slate-300 block mb-0.5">Development Environment Note:</strong>
                  We have printed the reset link to the backend logs. Check <code>backend/mock-emails.log</code> to access it.
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-slate-800/60 mt-6 pt-5 flex justify-center">
            <Link href="/login" className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-bold transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
