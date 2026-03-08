'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { seatsApi, Seat as SeatType } from '@/features/seats/api/seats.api';
import { socketService } from '@/lib/socket';
import { X, Users, Lock, CheckCircle, Info } from 'lucide-react';
import { SeatGrid } from '@/features/seats/components/SeatGrid';

interface LiveSeatMonitorProps {
  showId: string;
  showTitle: string;
  onClose: () => void;
}

export function LiveSeatMonitor({ showId, showTitle, onClose }: LiveSeatMonitorProps) {
  const [seats, setSeats] = useState<SeatType[]>([]);
  const [activeAdmins, setActiveAdmins] = useState(0);

  const { data: initialSeats, isLoading } = useQuery({
    queryKey: ['seats', showId],
    queryFn: () => seatsApi.getSeats(showId),
  });

  useEffect(() => {
    if (initialSeats) {
      setSeats(initialSeats);
    }
  }, [initialSeats]);

  useEffect(() => {
    // Connect to admin namespace
    const socket = socketService.connect('/admin');

    // Join room for this show
    socket.emit('monitor_show', { showId });

    // Listen for events
    socket.on('seat_locked', (data: { seatId: string; userId: string }) => {
      setSeats(prev => prev.map(s => 
        s.id === data.seatId ? { ...s, status: 'LOCKED', lockedBy: data.userId } : s
      ));
    });

    socket.on('seat_released', (data: { seatId: string }) => {
      setSeats(prev => prev.map(s => 
        s.id === data.seatId ? { ...s, status: 'AVAILABLE', lockedBy: null } : s
      ));
    });

    socket.on('booking_confirmed', (data: { seatIds: string[] }) => {
      setSeats(prev => prev.map(s => 
        data.seatIds.includes(s.id) ? { ...s, status: 'BOOKED' } : s
      ));
    });

    return () => {
      socket.off('seat_locked');
      socket.off('seat_released');
      socket.off('booking_confirmed');
      // We don't disconnect the whole socket because other components might use it,
      // but we might want to "unmonitor" if the backend supported it.
    };
  }, [showId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-gray-900/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand-500/10 rounded-xl">
              <Users className="w-6 h-6 text-brand-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500 text-white uppercase tracking-wider animate-pulse">Live</span>
                <h2 className="text-xl font-bold text-white">{showTitle}</h2>
              </div>
              <p className="text-sm text-gray-500">Real-time seat occupancy monitoring</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Legend & Stats */}
        <div className="flex items-center justify-between px-8 py-4 bg-gray-900/30 border-b border-gray-800">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-gray-200"></div>
              <span className="text-xs text-gray-400">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-yellow-400"></div>
              <span className="text-xs text-gray-400">Locked (Pending)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-red-500"></div>
              <span className="text-xs text-gray-400">Booked</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-gray-400">
              <Info className="w-4 h-4" />
              <span>Total Seats: {seats.length}</span>
            </div>
            <div className="w-px h-4 bg-gray-800"></div>
            <div className="flex items-center gap-1.5 text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span>Available: {seats.filter(s => s.status === 'AVAILABLE').length}</span>
            </div>
            <div className="w-px h-4 bg-gray-800"></div>
            <div className="flex items-center gap-1.5 text-red-400">
              <Lock className="w-4 h-4" />
              <span>Occupied: {seats.filter(s => s.status !== 'AVAILABLE').length}</span>
            </div>
          </div>
        </div>

        {/* Grid Area */}
        <div className="flex-1 overflow-auto bg-gray-950 p-8 custom-scrollbar">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-gray-500">
              <div className="w-10 h-10 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
              <p className="animate-pulse">Loading Seat Layout...</p>
            </div>
          ) : (
            <SeatGrid 
              seats={seats}
              selectedSeatIds={[]}
              currentUserId={null}
              onSeatToggle={() => {}} // Read-only for monitor
            />
          )}
        </div>

        {/* Status Bar */}
        <div className="px-6 py-3 bg-gray-900 border-t border-gray-800 flex items-center justify-between">
           <div className="flex items-center gap-2 text-[10px] text-gray-500">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
              <span>CONNECTED TO CLOUD MONITORING ENGINE</span>
           </div>
           <p className="text-[10px] text-gray-600 font-mono">WS_NS: /admin | ROOM_ID: {showId}</p>
        </div>
      </div>
    </div>
  );
}
