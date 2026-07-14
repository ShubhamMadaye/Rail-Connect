'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import Link from 'next/link';
import { Loader2, Eye, EyeOff, CheckCircle2, Train, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error('Missing or invalid reset token');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return toast.error('No reset token found');
    if (password !== confirm) return toast.error('Passwords do not match');

    // Strong password checks
    if (password.length < 8) {
      return toast.error('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      return toast.error('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      return toast.error('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      return toast.error('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return toast.error('Password must contain at least one special character');
    }

    setLoading(true);
    try {
      await authAPI.resetPassword({ token, password });
      setResetDone(true);
      toast.success('Password updated successfully! Please log in.');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Password reset failed. Token may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Invalid Reset Link</h2>
        <p className="text-slate-400 text-sm">
          This password reset link is invalid, incomplete, or has expired. Please request a new one.
        </p>
        <Link href="/forgot-password" className="btn-primary w-full justify-center py-2.5 mt-4" style={{ borderRadius: '0.75rem' }}>
          Request New Link
        </Link>
      </div>
    );
  }

  return (
    <div>
      {!resetDone ? (
        <>
          <h2 className="text-2xl font-extrabold text-white mb-2">Reset Password</h2>
          <p className="text-slate-400 text-sm mb-6">
            Enter your new secure password below to regain access to your account.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="input-label">New Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input-field pl-10 pr-12"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <button
                  type="button"
                  onClick={() => setShowPw((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="input-label">Confirm New Password</label>
              <div className="relative">
                <input
                  type="password"
                  className="input-field pl-10 pr-12"
                  placeholder="Re-enter new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                {confirm && password === confirm && (
                  <CheckCircle2 className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                )}
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
                  <Loader2 className="w-5 h-5 animate-spin" /> Resetting...
                </>
              ) : (
                'Save New Password'
              )}
            </button>
          </form>
        </>
      ) : (
        <div className="text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-pulse mx-auto" />
          <h2 className="text-xl font-bold text-white">Password Updated!</h2>
          <p className="text-slate-400 text-sm">
            Your password was changed successfully. You can now use your new password to sign in.
          </p>
          <Link href="/login" className="btn-primary w-full justify-center py-2.5 mt-4" style={{ borderRadius: '0.75rem' }}>
            Sign In
          </Link>
        </div>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[calc(100vh-68px)] flex items-center justify-center p-6" style={{ background: '#03061A' }}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)' }} />
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
          <Suspense fallback={
            <div className="flex flex-col items-center gap-4 text-center py-6">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
              <h3 className="text-lg text-white font-semibold">Initializing reset view...</h3>
            </div>
          }>
            <ResetPasswordContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
