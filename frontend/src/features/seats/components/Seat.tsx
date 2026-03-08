import { Seat as SeatType } from '../api/seats.api';
import { clsx } from 'clsx';

/**
 * Controls how a single seat looks and behaves.
 * 
 * KEY FIX: onToggle now receives the seatNumber string like "A3"
 * NOT the UUID seat.id — so the parent's selectedSeatNumbers array
 * (which stores "A3", "B5" etc.) can correctly compare.
 */
export interface SeatProps {
  seat: SeatType;
  status: 'AVAILABLE' | 'SELECTED' | 'LOCKED' | 'BOOKED';
  isLockedByCurrentUser: boolean;
  onToggle: (seatNumber: string) => void;
}

export function Seat({ seat, status, isLockedByCurrentUser, onToggle }: SeatProps) {
  const isBooked   = status === 'BOOKED';
  const isLocked   = status === 'LOCKED';
  const isSelected = status === 'SELECTED';
  const isAvailable = status === 'AVAILABLE';

  const isSelectable = isAvailable || isSelected;

  // ── Seat number string used for selection comparison ───────────────
  const seatCode = `${seat.row}${seat.number}`;

  // ── Visual styling ─────────────────────────────────────────────────
  let bgClass = 'bg-gray-200 hover:bg-gray-300 text-gray-700'; // Available

  if (isBooked) {
    bgClass = 'bg-red-500 text-white cursor-not-allowed opacity-70';
  } else if (isLocked && !isLockedByCurrentUser) {
    bgClass = 'bg-yellow-400 text-black cursor-not-allowed opacity-80';
  } else if (isLocked && isLockedByCurrentUser) {
    bgClass = 'bg-yellow-300 ring-2 ring-yellow-500 text-black';
  } else if (isSelected) {
    bgClass = 'bg-blue-600 text-white shadow-lg scale-105 ring-2 ring-blue-400';
  }

  return (
    <button
      type="button"
      onClick={() => isSelectable && onToggle(seatCode)}
      disabled={!isSelectable}
      title={`Row ${seat.row} Seat ${seat.number} — ${status}`}
      className={clsx(
        // Cinema-chair shape: more rounded on top, flatter on bottom
        'flex h-9 w-9 items-center justify-center',
        'rounded-t-lg rounded-b-sm',
        'text-[11px] font-bold',
        'transition-all duration-150',
        'border-b-4 border-transparent',
        bgClass,
        !isSelectable && 'cursor-not-allowed',
      )}
    >
      {seat.number}
    </button>
  );
}
