import { Seat as SeatComponent } from './Seat';
import { Seat as SeatType } from '../api/seats.api';

interface SeatGridProps {
  seats: SeatType[];
  selectedSeatNumbers: string[];   // ["A1", "B3"] format — NOT UUIDs
  currentUserId: string | null;
  onSeatToggle: (seatNumber: string) => void;  // called with "A1" format
}

export function SeatGrid({ seats, selectedSeatNumbers, currentUserId, onSeatToggle }: SeatGridProps) {
  // Group seats by row letter — use the raw seat.row value
  const rows = seats.reduce((acc, seat) => {
    const row = seat.row ?? 'Unknown';
    if (!acc[row]) acc[row] = [];
    acc[row].push(seat);
    return acc;
  }, {} as Record<string, SeatType[]>);

  const rowKeys = Object.keys(rows).sort();

  if (rowKeys.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        No seats available for this show
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-white/70 backdrop-blur-md rounded-3xl border border-gray-200 shadow-xl">

      {/* ── Cinema Screen ── */}
      <div className="w-full flex flex-col items-center mb-4">
        <div
          className="w-3/4 h-3 rounded-b-full"
          style={{
            background: 'linear-gradient(to bottom, rgba(37,99,235,0.5), transparent)',
            boxShadow: '0 6px 16px rgba(37,99,235,0.2)',
          }}
        />
        <p className="mt-2 text-[10px] font-black uppercase tracking-[0.4em] text-blue-600/50">
          Cinema Screen
        </p>
      </div>

      {/* ── Scrollable seat grid ── */}
      <div className="w-full overflow-x-auto">
        <style>{`
          .seat-grid-scroll::-webkit-scrollbar { height: 5px; }
          .seat-grid-scroll::-webkit-scrollbar-track { background: #e5e7eb; border-radius: 99px; }
          .seat-grid-scroll::-webkit-scrollbar-thumb { background: #3b82f6; border-radius: 99px; }
        `}</style>

        <div className="seat-grid-scroll overflow-x-auto pb-4 custom-scrollbar">
          {/* 🎯 [FIX] Centering: Added flex-col items-center and w-full to ensure the grid stays centered */}
          <div className="flex flex-col items-center gap-2 min-w-min w-full mx-auto px-4">
            {rowKeys.map((rowLabel) => {
              const rowSeats = rows[rowLabel].sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
              return (
                <div key={rowLabel} className="flex items-center justify-center gap-3">
                  {/* Row letter label */}
                  <span className="w-6 shrink-0 text-center text-xs font-black text-red-500 uppercase select-none">
                    {rowLabel}
                  </span>

                  {/* Seats — never wrap */}
                  <div className="flex gap-1.5 flex-nowrap">
                    {rowSeats.map((seat) => {
                      const seatCode = `${seat.row}${seat.number}`;
                      let status: 'AVAILABLE' | 'SELECTED' | 'LOCKED' | 'BOOKED' = 'AVAILABLE';

                      if (seat.status === 'BOOKED') status = 'BOOKED';
                      else if (seat.status === 'LOCKED') status = 'LOCKED';
                      else if (selectedSeatNumbers.includes(seatCode)) status = 'SELECTED';

                      return (
                        <SeatComponent
                          key={seat.id}
                          seat={seat}
                          status={status}
                          isLockedByCurrentUser={
                            !!(seat.lockedBy && currentUserId && seat.lockedBy === currentUserId)
                          }
                          onToggle={onSeatToggle}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="mt-3 flex flex-wrap justify-center gap-5 border-t border-gray-100 pt-4 w-full">
        <LegendItem className="bg-gray-200" label="Available" />
        <LegendItem className="bg-blue-600" label="Selected" />
        <LegendItem className="bg-yellow-400" label="Locked" />
        <LegendItem className="bg-red-500" label="Sold" />
      </div>
    </div>
  );
}

function LegendItem({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
      <div className={`h-4 w-4 rounded-t-md rounded-b-sm ${className}`} />
      {label}
    </div>
  );
}
