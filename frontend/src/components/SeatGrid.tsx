'use client';

import { useState, useEffect } from 'react';
import { socketService } from '@/lib/socket';
import { useAuthStore } from '@/lib/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

interface Seat {
  id: string;
  row: string;
  number: number;
  isBooked: boolean;
  isLocked?: boolean;
}

interface SeatGridProps {
  eventId: string;
  seats: Seat[];
}

export default function SeatGrid({ eventId, seats }: SeatGridProps) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = !!user;
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [liveSeats, setLiveSeats] = useState<Seat[]>(seats);

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = socketService.connect();

    const handleSeatUpdate = (payload: {
      eventId: string;
      seats: Seat[];
    }) => {
      if (payload.eventId === eventId) {
        setLiveSeats(payload.seats);
      }
    };

    socket.on('event:seats-update', handleSeatUpdate);

    return () => {
      socket.off('event:seats-update', handleSeatUpdate);
    };
  }, [eventId, isAuthenticated]);

  const toggleSeat = (seatId: string) => {
    setSelectedSeats((prev) =>
      prev.includes(seatId)
        ? prev.filter((id) => id !== seatId)
        : [...prev, seatId]
    );
  };

  return (
    <div className="grid grid-cols-10 gap-2">
      <AnimatePresence>
        {liveSeats.map((seat) => {
          const isSelected = selectedSeats.includes(seat.id);

          return (
            <motion.button
              key={seat.id}
              whileTap={{ scale: 0.9 }}
              disabled={seat.isBooked || seat.isLocked}
              onClick={() => toggleSeat(seat.id)}
              className={clsx(
                'h-10 w-10 rounded-md text-sm font-medium transition-colors',
                seat.isBooked && 'bg-red-500 text-white cursor-not-allowed',
                seat.isLocked && 'bg-yellow-400 text-white cursor-not-allowed',
                isSelected && 'bg-blue-600 text-white',
                !seat.isBooked &&
                  !seat.isLocked &&
                  !isSelected &&
                  'bg-gray-200 hover:bg-gray-300'
              )}
            >
              {seat.row}
              {seat.number}
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}