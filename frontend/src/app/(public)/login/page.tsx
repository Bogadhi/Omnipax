'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore, PORTAL_HOME } from '@/lib/authStore';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'EMAIL' | 'OTP'>('EMAIL');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');

  const { setAuth, user, token, hasHydrated } = useAuthStore();

  // ── Bridge pre-existing sessions to cookie ─────────────────────────────────
  // Problem: sessions created before the cookie-writing fix only have a token
  // in Zustand/localStorage. The middleware cannot read localStorage (SSR), so
  // it sends every navigation to /login. This effect detects that state on mount
  // and writes the cookie + navigates, breaking the loop.
  useEffect(() => {
    if (!hasHydrated) return;           // wait for Zustand to rehydrate from localStorage
    if (!user || !token) return;        // genuinely unauthenticated — show login

    // User IS authenticated — write cookie so middleware accepts future navigations
    document.cookie = `access_token=${token}; path=/; SameSite=Lax`;

    // Navigate to correct portal (privileged roles ignore ?redirect=)
    const role: string = user.role ?? '';
    const privileged = ['SUPER_ADMIN', 'ADMIN', 'THEATER_MANAGER', 'SCANNER_DEVICE'];
    const destination = privileged.includes(role)
      ? (PORTAL_HOME[role] ?? '/')
      : (redirect ?? '/');

    console.log('[Login] Pre-existing session detected. Role:', role, '→', destination);
    router.replace(destination);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated]);


  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password) {
      await handleLoginPassword(e);
    } else {
      await handleRequestOTP(e);
    }
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await api.post('/auth/otp/request', { email });
      setStep('OTP');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login/password', { email, password });
      const { access_token, user } = res.data;

      if (typeof window !== 'undefined') {
        document.cookie = `access_token=${access_token}; path=/; SameSite=Lax`;
      }

      setAuth(user, access_token);

      const role: string = user.role ?? '';
      let destination: string;

      if (role === 'SUPER_ADMIN') {
        destination = '/super-admin';
      } else if (role === 'ADMIN') {
        destination = '/admin';
      } else if (role === 'THEATER_MANAGER') {
        destination = '/theatre';
      } else if (role === 'SCANNER_DEVICE') {
        destination = '/scanner';
      } else {
        destination = redirect ?? '/';
      }

      console.log('[Login] Password verified. Role:', role, '→ Redirecting to:', destination);
      router.replace(destination);

    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };



  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', { email, otp });

      const { access_token, user } = res.data;

      // ── 1. Write cookie FIRST so middleware sees it on navigation ──────────
      // The Next.js middleware reads `access_token` from cookies. If the cookie
      // is not set before router.replace() fires, the middleware intercepts the
      // navigation and bounces the user back to /login — making it appear that
      // router.replace() never ran.
      if (typeof window !== 'undefined') {
        document.cookie = `access_token=${access_token}; path=/; SameSite=Lax`;
      }

      // ── 2. Update Zustand + localStorage ──────────────────────────────────
      setAuth(user, access_token);

      // ── 3. Role-based destination (privileged roles ignore ?redirect=) ────
      // SUPER_ADMIN / ADMIN / THEATER_MANAGER / SCANNER_DEVICE always land
      // in their own portal. Only USER respects the ?redirect= param.
      const role: string = user.role ?? '';
      let destination: string;

      if (role === 'SUPER_ADMIN') {
        destination = '/super-admin';
      } else if (role === 'ADMIN') {
        destination = '/admin';
      } else if (role === 'THEATER_MANAGER') {
        destination = '/theatre';
      } else if (role === 'SCANNER_DEVICE') {
        destination = '/scanner';
      } else {
        // USER: respect ?redirect= or go home
        destination = redirect ?? '/';
      }

      // ── 4. Navigate ───────────────────────────────────────────────────────
      console.log('[Login] OTP verified. Role:', role, '→ Redirecting to:', destination);
      router.replace(destination);

    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-accent/20 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-card p-10 relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-black mb-2">Welcome Back</h1>
          <p className="text-foreground/60">
            Secure access to your entertainment gateway
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'EMAIL' ? (
            <motion.form
              key="email"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleEmailSubmit}
              className="space-y-6"
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 ml-1">
                    Email Address
                  </label>

                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                    <input
                      id="email-input"
                      type="email"
                      required
                      defaultValue={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 ml-1">
                    Password (Optional for OTP)
                  </label>

                  <div className="relative">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                    <input
                      id="password-input"
                      type="password"
                      defaultValue={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password to login directly"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-red-400 text-sm font-medium bg-red-400/10 p-3 rounded-lg border border-red-400/20 text-center">
                  {error}
                </p>
              )}

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleLoginPassword}
                  disabled={isLoading || !password}
                  className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 group"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>Login with Password</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-white/10"></div>
                  <span className="flex-shrink-0 mx-4 text-foreground/40 text-xs font-bold uppercase tracking-widest">or</span>
                  <div className="flex-grow border-t border-white/10"></div>
                </div>

                <button
                  type="button"
                  onClick={handleRequestOTP}
                  disabled={isLoading}
                  className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-xl transition-all border border-white/10 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <span>Send Login OTP</span>
                  )}
                </button>
              </div>
            </motion.form>
          ) : (
            <motion.form
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleVerifyOTP}
              className="space-y-6"
            >
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 ml-1">
                  Enter 6-digit OTP
                </label>

                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="000000"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-center text-2xl font-black tracking-[0.5em] focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm font-medium bg-red-400/10 p-3 rounded-lg border border-red-400/20 text-center">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <span>Verify & Login</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep('EMAIL')}
                className="w-full text-foreground/40 hover:text-foreground/60 text-sm font-bold transition-colors"
              >
                Change Email
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}