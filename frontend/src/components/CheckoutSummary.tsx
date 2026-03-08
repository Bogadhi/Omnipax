'use client';

import { motion } from 'framer-motion';
import { ShoppingBag, CreditCard, ShieldCheck } from 'lucide-react';
import { formatINR } from '@/lib/formatINR';
import type { DiscountBreakdown } from '@/features/payments/api/payment.api';

interface Seat {
  id: string;
  row: string;
  number: number;
  category: string;
  price: number;
}

interface CheckoutSummaryProps {
  selectedSeats: Seat[];
  onConfirm: () => void;
  isLoading: boolean;
  /** Populated once the user has applied a coupon or gift card */
  discount?: DiscountBreakdown | null;
  /** The amount actually charged – equals finalAmount when discount applied, else totalAmount */
  finalAmount?: number;
}

export default function CheckoutSummary({
  selectedSeats,
  onConfirm,
  isLoading,
  discount,
  finalAmount,
}: CheckoutSummaryProps) {
  const ticketSubtotal = selectedSeats.reduce((sum, s) => sum + s.price, 0);
  const FIXED_FEE = 19.99;
  const PERCENTAGE_RATE = 0.02;
  const percentageFee = parseFloat((ticketSubtotal * PERCENTAGE_RATE).toFixed(2));
  const totalConvenienceFee = parseFloat((FIXED_FEE + percentageFee).toFixed(2));
  const baseTotal = parseFloat((ticketSubtotal + totalConvenienceFee).toFixed(2));

  // If the parent has driven a discount, use the server-calculated finalAmount.
  // Otherwise fall back to the locally-derived total.
  const displayTotal = finalAmount ?? baseTotal;
  const hasDiscount = discount && discount.discountAmount > 0;

  return (
    <div className="glass-card p-8 sticky top-32">
      <div className="flex items-center gap-2 mb-6">
        <ShoppingBag className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-bold">Order Summary</h2>
      </div>

      <div className="space-y-4 mb-8">
        {selectedSeats.length > 0 ? (
          <>
            {selectedSeats.map((seat) => (
              <div key={seat.id} className="flex justify-between items-center text-sm">
                <span className="text-foreground/60">
                  Row {seat.row}, Seat {seat.number} ({seat.category})
                </span>
                <span className="font-semibold">{formatINR(seat.price)}</span>
              </div>
            ))}

            <div className="border-t border-white/5 my-4"></div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-foreground/60">Ticket Price</span>
              <span className="font-semibold">{formatINR(ticketSubtotal)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-foreground/60">
                Convenience Fee (Fixed ₹{FIXED_FEE} + 2%)
              </span>
              <span className="font-semibold text-primary">{formatINR(totalConvenienceFee)}</span>
            </div>

            {/* Discount breakdown (only visible when a discount is applied) */}
            {hasDiscount && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-1.5 pt-1"
              >
                {discount.couponDiscountAmount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-green-400/80">🏷 Coupon Discount</span>
                    <span className="font-semibold text-green-400">
                      –{formatINR(discount.couponDiscountAmount)}
                    </span>
                  </div>
                )}
                {discount.giftCardDiscountAmount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-purple-400/80">🎁 Gift Card</span>
                    <span className="font-semibold text-purple-400">
                      –{formatINR(discount.giftCardDiscountAmount)}
                    </span>
                  </div>
                )}
              </motion.div>
            )}
          </>
        ) : (
          <p className="text-sm text-foreground/40 text-center py-4">No seats selected</p>
        )}
      </div>

      <div className="border-t border-white/10 pt-4 mb-8">
        {hasDiscount && (
          <div className="flex justify-between items-center mb-1 text-sm text-foreground/40 line-through">
            <span>Original Total</span>
            <span>{formatINR(baseTotal)}</span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold">
            {hasDiscount ? 'You Pay' : 'Total Amount'}
          </span>
          <span className={`text-2xl font-black ${hasDiscount ? 'text-green-400' : 'text-primary'}`}>
            {formatINR(displayTotal)}
          </span>
        </div>
        {hasDiscount && (
          <p className="text-xs text-green-400/70 mt-1 text-right">
            You save {formatINR(discount.discountAmount)} 🎉
          </p>
        )}
      </div>

      <div className="space-y-3">
        <button
          onClick={onConfirm}
          disabled={selectedSeats.length === 0 || isLoading}
          className="w-full bg-primary hover:bg-primary/90 disabled:bg-white/5 disabled:text-white/20 text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              <span>Proceed to Payment</span>
            </>
          )}
        </button>
        <div className="flex items-center justify-center gap-2 text-[10px] text-foreground/40 uppercase tracking-widest font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>Secure Transaction</span>
        </div>
      </div>
    </div>
  );
}
