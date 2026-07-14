'use client';
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import Link from 'next/link';
import { Loader2, CheckCircle2, XCircle, Train } from 'lucide-react';
import toast from 'react-hot-toast';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email address...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided. Check your email verification link.');
      return;
    }

    authAPI.verifyEmail(token)
      .then((res) => {
        setStatus('success');
        setMessage(res.data.message || 'Email verified successfully!');
        toast.success('Email verified successfully!');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Verification failed. The token may be invalid or expired.');
        toast.error('Email verification failed');
      });
  }, [token]);

  return (
    <div className="glass-elevated rounded-3xl p-8 text-center max-w-md w-full">
      {status === 'loading' && (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
          <h2 className="text-xl font-bold text-white">Verifying...</h2>
          <p className="text-slate-400 text-sm">{message}</p>
        </div>
      )}

      {status === 'success' && (
        <div className="flex flex-col items-center gap-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-pulse" />
          <h2 className="text-xl font-bold text-white">Verification Successful!</h2>
          <p className="text-slate-400 text-sm">{message}</p>
          <Link href="/login" className="btn-primary w-full justify-center py-2.5 mt-4" style={{ borderRadius: '0.75rem' }}>
            Go to Login
          </Link>
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col items-center gap-4">
          <XCircle className="w-12 h-12 text-rose-500" />
          <h2 className="text-xl font-bold text-white">Verification Failed</h2>
          <p className="text-slate-400 text-sm">{message}</p>
          <Link href="/register" className="btn-secondary w-full justify-center py-2.5 mt-4" style={{ borderRadius: '0.75rem' }}>
            Back to Register
          </Link>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-[calc(100vh-68px)] flex items-center justify-center p-6" style={{ background: '#03061A' }}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)' }} />
      </div>

      <div className="flex flex-col items-center gap-6 w-full max-w-md">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
            <Train className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-lg text-white">RailConnect</span>
        </div>

        <Suspense fallback={
          <div className="glass-elevated rounded-3xl p-8 text-center max-w-md w-full flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
            <h2 className="text-xl font-bold text-white">Loading...</h2>
          </div>
        }>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
