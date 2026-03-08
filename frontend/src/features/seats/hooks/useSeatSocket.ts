import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { socketService } from '@/lib/socket';
import { Seat } from '../api/seats.api';

export function useSeatSocket(showId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = socketService.connect();

    const handleSeatLocked = (payload: { showId: string; seatId: string; userId: string }) => {
      if (payload.showId !== showId) return;
      
      queryClient.setQueryData(['seats', showId], (oldSeats: Seat[] | undefined) => {
        if (!oldSeats) return oldSeats;
        return oldSeats.map(seat => 
          seat.id === payload.seatId 
            ? { ...seat, status: 'LOCKED', lockedBy: payload.userId } 
            : seat
        );
      });
    };

    const handleBookingConfirmed = (payload: { showId: string; seatId: string; userId: string }) => {
       if (payload.showId !== showId) return;

       queryClient.setQueryData(['seats', showId], (oldSeats: Seat[] | undefined) => {
        if (!oldSeats) return oldSeats;
        return oldSeats.map(seat => 
          seat.id === payload.seatId 
            ? { ...seat, status: 'BOOKED', lockedBy: null, lockedUntil: null } 
            : seat
        );
      });
    };

    socket.on('seat_locked', handleSeatLocked);
    socket.on('seat_booked', handleBookingConfirmed); // Backend currently emits 'seat_booked'

    return () => {
      socket.off('seat_locked', handleSeatLocked);
      socket.off('seat_booked', handleBookingConfirmed);
    };
  }, [showId, queryClient]);
}
