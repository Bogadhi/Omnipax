import clsx from 'clsx';

interface SeatAvailability {
  seat: {
    id: string;
    row: string;
    number: number;
    type: string;
  };
  status: string; // "AVAILABLE" | "BOOKED" | "LOCKED"
}

interface SeatGridProps {
  seats: SeatAvailability[];
  selectedSeatNumbers: string[];
  onSelect: (seatNumber: string) => void;
}

export function SeatGrid({ seats, selectedSeatNumbers, onSelect }: SeatGridProps) {
  // Group seats by row letter
  const rows = seats.reduce((acc, s) => {
    const row = s.seat?.row ?? 'Unknown';
    if (!acc[row]) acc[row] = [];
    acc[row].push(s);
    return acc;
  }, {} as Record<string, SeatAvailability[]>);

  const sortedRowKeys = Object.keys(rows).sort();

  return (
    <div className="flex flex-col gap-4 p-4 bg-black/40 rounded-3xl border border-white/5 backdrop-blur-xl">

      {/* ── Cinema Screen ── */}
      <div className="relative w-full flex flex-col items-center mb-6">
        {/* Curved arc glow */}
        <div
          className="w-3/4 h-4 rounded-b-full"
          style={{
            background: 'linear-gradient(to bottom, rgba(68,138,255,0.5), transparent)',
            boxShadow: '0 8px 24px rgba(68,138,255,0.3)',
          }}
        />
        <div
          className="mt-1 w-3/4 h-0.5 rounded-full"
          style={{
            background: 'linear-gradient(to right, transparent, rgba(68,138,255,0.7), transparent)',
          }}
        />
        <p className="mt-2 text-[10px] font-black uppercase tracking-[0.4em] text-blue-400/60">
          Cinema Screen
        </p>
      </div>

      {/* ── Seat Grid — horizontally scrollable, no wrap ── */}
      <div className="w-full overflow-x-auto">
        <style>{`
          .booking-seat-scroll::-webkit-scrollbar { height: 5px; }
          .booking-seat-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 99px; }
          .booking-seat-scroll::-webkit-scrollbar-thumb { background: rgba(68,138,255,0.4); border-radius: 99px; }
        `}</style>

        <div className="booking-seat-scroll w-full overflow-x-auto pb-2">
          <div className="flex flex-col gap-3 min-w-max">
            {sortedRowKeys.map((rowKey) => (
              <div key={rowKey} className="flex items-center gap-2">
                {/* Row label — fixed, not scrolled */}
                <div className="w-6 shrink-0 text-sm font-black text-foreground/40 text-center select-none">
                  {rowKey}
                </div>

                {/* Seats — nowrap so they never fold to next line */}
                <div className="flex flex-nowrap gap-2">
                  {rows[rowKey]
                    .sort((a, b) => a.seat.number - b.seat.number)
                    .map((s) => {
                      const seatNumber = `${s.seat.row}${s.seat.number}`;
                      const isBooked = s.status === 'BOOKED';
                      const isLocked = s.status === 'LOCKED';
                      const isSelected = selectedSeatNumbers.includes(seatNumber);
                      const isUnavailable = isBooked || isLocked;

                      return (
                        <button
                          key={s.seat.id}
                          disabled={isUnavailable}
                          onClick={() => onSelect(seatNumber)}
                          title={`Row ${s.seat.row} Seat ${s.seat.number} — ${s.status}`}
                          className={clsx(
                            'w-9 h-9 rounded-t-xl rounded-b-md text-[11px] sm:text-xs font-black transition-all flex items-center justify-center border-2',
                            {
                              'bg-red-500/20 border-red-500/30 text-red-400/50 cursor-not-allowed': isBooked,
                              'bg-yellow-400/20 border-yellow-400/40 text-yellow-300/60 cursor-not-allowed': isLocked,
                              'bg-primary border-primary text-white shadow-lg shadow-primary/40 scale-110': isSelected,
                              'bg-white/5 border-white/10 text-foreground/60 hover:border-primary/60 hover:text-primary cursor-pointer':
                                !isUnavailable && !isSelected,
                            }
                          )}
                        >
                          {s.seat.number}
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex justify-center flex-wrap gap-5 mt-4 pt-5 border-t border-white/5">
        <LegendItem color="bg-white/5 border-white/10" label="Available" />
        <LegendItem color="bg-primary border-primary" label="Selected" />
        <LegendItem color="bg-yellow-400/20 border-yellow-400/40" label="Locked" />
        <LegendItem color="bg-red-500/20 border-red-500/30" label="Sold" />
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={clsx('w-4 h-4 rounded-t-md rounded-b-sm border-2', color)} />
      <span className="text-[10px] uppercase tracking-wider font-bold text-foreground/40">
        {label}
      </span>
    </div>
  );
}
