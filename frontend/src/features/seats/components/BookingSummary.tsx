import { Seat as SeatType } from '../api/seats.api';
import { formatINR } from '@/lib/formatINR';

interface PricingBreakdown {
  baseAmount: number;
  convenienceFee: number;
  serviceFee: number;
  totalAmount: number;
}

interface BookingSummaryProps {
  selectedSeatsCount: number;
  onConfirm: () => void;
  isProcessing: boolean;
  breakdown?: PricingBreakdown;
  selectedSeats?: SeatType[]; // Optional for GA
}

export function BookingSummary({ 
  selectedSeatsCount, 
  onConfirm, 
  isProcessing, 
  breakdown, 
  selectedSeats 
}: BookingSummaryProps) {
  if (selectedSeatsCount === 0 || !breakdown) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-gray-700 bg-gray-900 p-5 shadow-2xl sm:static sm:mt-6 sm:rounded-2xl sm:border sm:border-gray-700 sm:shadow-none">
      <div className="container mx-auto flex flex-col items-stretch justify-between gap-6 sm:flex-row sm:items-center">

        {/* Selected seat info */}
        <div className="flex-shrink-0">
          {selectedSeats && selectedSeats.length > 0 ? (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Selected Seats</p>
              <p className="font-bold text-white truncate max-w-[200px]">
                {selectedSeats.map((s) => `${s.row}${s.number}`).join(', ')}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Tickets</p>
              <p className="font-bold text-white">{selectedSeatsCount} Qty</p>
            </div>
          )}
        </div>

        {/* Pricing Breakdown */}
        <div className="flex-1 w-full sm:max-w-xs">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-2">Pricing Breakdown</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Base Price</span>
              <span className="font-medium text-white">{formatINR(breakdown.baseAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Convenience Fee (₹19.99 × {selectedSeatsCount})</span>
              <span className="font-medium text-white">{formatINR(breakdown.convenienceFee)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Service Fee (2%)</span>
              <span className="font-medium text-white">{formatINR(breakdown.serviceFee)}</span>
            </div>
            <div className="border-t border-gray-700 my-1" />
            <div className="flex justify-between text-base font-semibold">
              <span className="text-white">Total</span>
              <span className="text-blue-400 text-lg font-black">{formatINR(breakdown.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onConfirm}
          disabled={isProcessing}
          className="w-full sm:w-auto rounded-xl bg-blue-600 px-10 py-4 font-black text-white shadow-lg transition-all hover:bg-blue-500 hover:shadow-blue-900/50 hover:shadow-xl disabled:bg-gray-600 disabled:cursor-not-allowed text-base tracking-wide"
        >
          {isProcessing ? 'Processing...' : 'Continue to Payment'}
        </button>
      </div>
    </div>
  );
}
