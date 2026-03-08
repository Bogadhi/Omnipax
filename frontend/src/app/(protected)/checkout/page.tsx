'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { paymentApi, type DiscountBreakdown } from '@/features/payments/api/payment.api';
import ProtectedRoute from '@/components/ProtectedRoute';
import CheckoutSummary from '@/components/CheckoutSummary';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Calendar,
  Clock,
  MapPin,
  Tag,
  Gift,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/authStore';

// ─── Razorpay global type ────────────────────────────────────────────
declare global {
  interface Window {
    Razorpay: any;
  }
}

// ─── Imperative Razorpay SDK loader ─────────────────────────────────
// • If window.Razorpay already exists (cached), resolves immediately.
// • Injects the script tag once; subsequent calls reuse the pending promise.
// • Rejects on network error.
let _rzpLoaderPromise: Promise<void> | null = null;

function loadRazorpaySDK(): Promise<void> {
  // Already available — resolve immediately without any script work
  if (typeof window !== 'undefined' && window.Razorpay) {
    return Promise.resolve();
  }

  // Already loading — reuse existing promise
  if (_rzpLoaderPromise) return _rzpLoaderPromise;

  _rzpLoaderPromise = new Promise<void>((resolve, reject) => {
    // Double-check after the microtask tick (React StrictMode double-invoke)
    if (window.Razorpay) {
      resolve();
      return;
    }

    const existing = document.getElementById('razorpay-checkout-sdk');
    if (existing) {
      // Script tag exists but hasn't fired onload yet — wait for it
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => {
        reject(new Error('Razorpay SDK failed to load'));
      });
      return;
    }

    const script = document.createElement('script');
    script.id = 'razorpay-checkout-sdk';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      _rzpLoaderPromise = null; // allow retry
      reject(new Error('Razorpay SDK failed to load'));
    };
    document.head.appendChild(script);
  });

  // Reset cache on error so a retry is possible
  _rzpLoaderPromise.catch(() => {
    _rzpLoaderPromise = null;
  });

  return _rzpLoaderPromise;
}

// ─────────────────────────────────────────────────────────────────────

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const { user } = useAuthStore();

  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [razorpayReady, setRazorpayReady] = useState(false);

  // ── Discount state ────────────────────────────────────────────────
  const [couponCode, setCouponCode] = useState('');
  const [giftCardCode, setGiftCardCode] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isApplyingGiftCard, setIsApplyingGiftCard] = useState(false);
  const [discount, setDiscount] = useState<DiscountBreakdown | null>(null);
  // orderLocked is set ONLY when we successfully create a Razorpay order
  const [orderLocked, setOrderLocked] = useState(false);

  // ── Load Razorpay SDK on mount (before booking even loads) ────────
  useEffect(() => {
    loadRazorpaySDK()
      .then(() => setRazorpayReady(true))
      .catch(() => {
        toast.error('Failed to load payment system. Please refresh.');
      });
  }, []); // runs once on component mount

  // ── Fetch booking on mount ────────────────────────────────────────
  useEffect(() => {
    if (!bookingId) {
      router.push('/events');
      return;
    }

    const fetchBooking = async () => {
      try {
        const res = await api.get(`/bookings/${bookingId}`);
        setBooking(res.data);

        // Restore discount state if already applied on a previous visit
        const bk = res.data as any;
        if ((bk.discountAmount ?? 0) > 0) {
          setDiscount({
            totalAmount: bk.totalAmount,
            couponDiscountAmount: bk.couponDiscountAmount ?? 0,
            giftCardDiscountAmount: bk.giftCardDiscountAmount ?? 0,
            discountAmount: bk.discountAmount,
            finalAmount: bk.finalAmount,
          });
        }

        // Lock if order was already created in a previous session
        if (bk.orderCreatedAt) {
          setOrderLocked(true);
        }
      } catch {
        toast.error('Failed to load booking details');
        router.push('/events');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId, router]);

  // ── Apply coupon ──────────────────────────────────────────────────
  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !bookingId) return;
    setIsApplyingCoupon(true);
    try {
      const result = await paymentApi.applyDiscount({ bookingId, couponCode: couponCode.trim() });
      setDiscount(result);
      toast.success(`Coupon applied! You saved ₹${result.couponDiscountAmount.toFixed(2)}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Invalid or expired coupon code');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  // ── Apply gift card ───────────────────────────────────────────────
  const handleApplyGiftCard = async () => {
    if (!giftCardCode.trim() || !bookingId) return;
    setIsApplyingGiftCard(true);
    try {
      const result = await paymentApi.applyDiscount({ bookingId, giftCardCode: giftCardCode.trim() });
      setDiscount(result);
      toast.success(`Gift card applied! ₹${result.giftCardDiscountAmount.toFixed(2)} deducted`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Invalid or expired gift card');
    } finally {
      setIsApplyingGiftCard(false);
    }
  };

  // ── Pay: ensure SDK → createOrder → open modal → confirmPayment ──
  const handlePay = useCallback(async () => {
    if (!booking || !bookingId || isProcessing) return;

    setIsProcessing(true);

    try {
      // 1. Ensure SDK is ready (handles the state-stale case by checking window directly)
      if (!window.Razorpay) {
        try {
          await loadRazorpaySDK();
          setRazorpayReady(true);
        } catch {
          toast.error('Payment system unavailable. Please refresh the page.');
          setIsProcessing(false);
          return;
        }
      }

      // Final guard — should never hit this after the block above
      if (!window.Razorpay) {
        toast.error('Payment system unavailable. Please refresh the page.');
        setIsProcessing(false);
        return;
      }

      // 2. Create Razorpay order (locks discount on backend via orderCreatedAt)
      let orderRes: any;
      try {
        orderRes = await paymentApi.createOrder(bookingId);
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Failed to create payment order');
        setIsProcessing(false);
        return;
      }

      if (!orderRes?.orderId) {
        toast.error('Invalid order response from server');
        setIsProcessing(false);
        return;
      }

      setOrderLocked(true); // Lock discount inputs once order is created

      // 3. Open Razorpay modal
      await new Promise<void>((resolve, reject) => {
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || orderRes.keyId,
          amount: orderRes.amount,
          currency: orderRes.currency || 'INR',
          name: 'StarPass',
          description: 'Ticket Booking',
          order_id: orderRes.orderId,
          handler: async (response: any) => {
            try {
              // 4. Confirm payment on backend
              const result = await paymentApi.confirmPayment({
                bookingId,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature,
              });
              setIsSuccess(true);
              toast.success('Payment successful! Booking confirmed.');
              setTimeout(() => router.push(`/booking/success/${result.id}`), 1500);
              resolve();
            } catch (err: any) {
              toast.error(
                err?.response?.data?.message || 'Confirmation failed. Check My Bookings.'
              );
              reject(err);
            }
          },
          prefill: {
            name: user?.name || '',
            email: user?.email || '',
          },
          theme: { color: '#6366f1' },
          modal: {
            ondismiss: () => {
              setIsProcessing(false);
              resolve(); // user dismissed — not an error
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (resp: any) => {
          toast.error(resp?.error?.description || 'Payment failed');
          setIsProcessing(false);
          reject(new Error('Payment failed'));
        });
        rzp.open();
      });
    } catch {
      // errors are already toasted in the individual catch blocks above
    } finally {
      setIsProcessing(false);
    }
  }, [booking, bookingId, isProcessing, user, router]);

  // ── Render ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!booking) return null;

  const { show, bookingSeats } = booking;
  const event = show?.event;
  const theater = show?.screen?.theater ?? show?.screen;  // screen may not have nested theater
  
  // Prisma Decimal comes through JSON as a string — coerce to number.
  // Also fall back to computing from BookingSeat.price if totalAmount is 0 or falsy.
  const rawTotal = Number(booking.totalAmount ?? 0);
  const computedFromSeats = (bookingSeats as any[])?.reduce(
    (sum: number, bs: any) => sum + Number(bs.price ?? 0), 0
  ) ?? 0;
  const bookingTotal = rawTotal > 0 ? rawTotal : computedFromSeats;
  
  const payable = discount ? discount.finalAmount : bookingTotal;

  return (
    <ProtectedRoute>
      {/* No <Script> tag — SDK loaded imperatively in useEffect above */}

      <div className="min-h-screen bg-background">
        <main className="max-w-7xl mx-auto pt-32 pb-20 px-6">
          <AnimatePresence mode="wait">
            {isSuccess ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-xl mx-auto text-center glass-card p-12"
              >
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <h1 className="text-4xl font-black mb-4">Booking Confirmed!</h1>
                <p className="text-foreground/60 mb-10 leading-relaxed">
                  Your tickets for{' '}
                  <span className="text-white font-bold">{event?.title ?? 'Event'}</span>{' '}
                  have been secured. Redirecting…
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="checkout"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-12"
              >
                {/* ── Left column ── */}
                <div className="lg:col-span-2 space-y-8">
                  <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-foreground/40 hover:text-white transition-colors group"
                  >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span className="font-bold uppercase tracking-widest text-xs">Go Back</span>
                  </button>

                  <h1 className="text-4xl font-black">Checkout</h1>

                  {/* Event card */}
                  <div className="glass-card p-8 flex gap-8">
                    <img
                      src={event?.imageUrl ?? 'https://placehold.co/120x176?text=Event'}
                      className="w-32 h-44 rounded-xl object-cover shadow-xl"
                      alt="event"
                    />
                    <div className="flex-1">
                      <h2 className="text-2xl font-black mb-2">{event?.title ?? 'Event'}</h2>
                      <div className="space-y-2 text-foreground/60 font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span>
                            {show?.startTime
                              ? new Date(show.startTime).toLocaleDateString('en-IN', {
                                  dateStyle: 'medium',
                                })
                              : 'Date TBA'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-primary" />
                          <span>
                            {show?.startTime
                              ? new Date(show.startTime).toLocaleTimeString('en-IN', {
                                  timeStyle: 'short',
                                })
                              : 'Time TBA'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary" />
                          <span>{theater?.name ?? 'Venue TBA'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Discounts Panel ── */}
                  <div className="glass-card p-8 space-y-5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white tracking-wide uppercase text-xs">
                        Discounts &amp; Offers
                      </h3>
                      {orderLocked && (
                        <span className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold bg-amber-400/10 px-3 py-1 rounded-full">
                          <Lock className="w-3 h-3" />
                          Discounts Locked
                        </span>
                      )}
                    </div>

                    {/* Coupon */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm text-foreground/60 font-medium">
                        <Tag className="w-4 h-4 text-primary" />
                        Coupon Code
                      </label>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          placeholder="e.g. STAR20"
                          disabled={orderLocked || !!discount?.couponDiscountAmount}
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono placeholder:text-foreground/30 focus:outline-none focus:border-primary/50 disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                        <button
                          onClick={handleApplyCoupon}
                          disabled={
                            !couponCode.trim() ||
                            isApplyingCoupon ||
                            orderLocked ||
                            !!discount?.couponDiscountAmount
                          }
                          className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 disabled:bg-white/10 disabled:cursor-not-allowed text-white font-bold px-5 py-3 rounded-xl transition-all text-sm"
                        >
                          {isApplyingCoupon ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>Apply <ChevronRight className="w-4 h-4" /></>
                          )}
                        </button>
                      </div>
                      {discount?.couponDiscountAmount ? (
                        <p className="text-xs text-green-400 font-medium">
                          ✓ Coupon applied — saving ₹{discount.couponDiscountAmount.toFixed(2)}
                        </p>
                      ) : null}
                    </div>

                    {/* Gift Card */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm text-foreground/60 font-medium">
                        <Gift className="w-4 h-4 text-purple-400" />
                        Gift Card
                      </label>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={giftCardCode}
                          onChange={(e) => setGiftCardCode(e.target.value.toUpperCase())}
                          placeholder="e.g. GC1000"
                          disabled={orderLocked || !!discount?.giftCardDiscountAmount}
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono placeholder:text-foreground/30 focus:outline-none focus:border-purple-500/50 disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                        <button
                          onClick={handleApplyGiftCard}
                          disabled={
                            !giftCardCode.trim() ||
                            isApplyingGiftCard ||
                            orderLocked ||
                            !!discount?.giftCardDiscountAmount
                          }
                          className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-white/10 disabled:cursor-not-allowed text-white font-bold px-5 py-3 rounded-xl transition-all text-sm"
                        >
                          {isApplyingGiftCard ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>Apply <ChevronRight className="w-4 h-4" /></>
                          )}
                        </button>
                      </div>
                      {discount?.giftCardDiscountAmount ? (
                        <p className="text-xs text-purple-400 font-medium">
                          ✓ Gift card applied — ₹{discount.giftCardDiscountAmount.toFixed(2)} deducted
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {/* SDK loading status (dev helper — hidden when ready) */}
                  {!razorpayReady && (
                    <div className="flex items-center gap-2 text-xs text-amber-400/80">
                      <div className="w-3 h-3 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                      Loading payment system…
                    </div>
                  )}

                  {/* Protection notice */}
                  <div className="glass-card p-6 bg-blue-500/5 border-blue-500/20">
                    <div className="flex gap-4">
                      <ShieldCheck className="w-6 h-6 text-blue-400 mt-0.5 shrink-0" />
                      <div>
                        <h3 className="font-bold text-blue-400 mb-1">StarPass Protection</h3>
                        <p className="text-sm text-foreground/60">
                          Your seats are locked. Apply any discounts above, then click{' '}
                          <strong className="text-white">Pay &amp; Confirm</strong> to finalize.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Right column: summary + pay button ── */}
                <div>
                  <CheckoutSummary
                    selectedSeats={
                      bookingSeats?.map((bs: any) => ({ ...bs.seat, price: bs.price })) ?? []
                    }
                    discount={discount}
                    finalAmount={payable}
                    onConfirm={handlePay}
                    isLoading={isProcessing}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </ProtectedRoute>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}