'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { socketService } from '@/lib/socket';
import { useAuthStore } from '@/lib/authStore';
import {
  Activity,
  CheckCircle,
  Lock,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

interface EventLog {
  id: string;
  type:
    | 'seat_locked'
    | 'booking_confirmed'
    | 'booking_cancelled'
    | 'booking_failed'
    | 'seat_released';
  timestamp: Date;
  details: any;
}

export default function LiveMonitor() {
  const { token } = useAuthStore();
  const [socket, setSocket] = useState<any>(null);
  const [logs, setLogs] = useState<EventLog[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const addLog = (type: EventLog['type'], details: any) => {
    setLogs((prev) => [
      {
        id: crypto.randomUUID(),
        type,
        timestamp: new Date(),
        details,
      },
      ...prev.slice(0, 49),
    ]);
  };

  // ✅ FIXED: connect() takes NO arguments
  useEffect(() => {
    if (!token) return;

    const s = socketService.connect(); // ← removed token
    setSocket(s);

    return () => {
      socketService.disconnect();
    };
  }, [token]);

  useEffect(() => {
    if (!socket) return;

    const handleSeatLocked = (data: any) =>
      addLog('seat_locked', data);

    const handleBookingConfirmed = (data: any) =>
      addLog('booking_confirmed', data);

    const handleSeatReleased = (data: any) =>
      addLog('seat_released', data);

    const handleBookingCancelled = (data: any) =>
      addLog('booking_cancelled', data);

    const handleBookingFailed = (data: any) =>
      addLog('booking_failed', data);

    socket.on('seat_locked', handleSeatLocked);
    socket.on('booking_confirmed', handleBookingConfirmed);
    socket.on('seat_released', handleSeatReleased);
    socket.on('booking_cancelled', handleBookingCancelled);
    socket.on('booking_failed', handleBookingFailed);

    return () => {
      socket.off('seat_locked', handleSeatLocked);
      socket.off('booking_confirmed', handleBookingConfirmed);
      socket.off('seat_released', handleSeatReleased);
      socket.off('booking_cancelled', handleBookingCancelled);
      socket.off('booking_failed', handleBookingFailed);
    };
  }, [socket]);

  const getEventIcon = (type: EventLog['type']) => {
    switch (type) {
      case 'booking_confirmed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'seat_locked':
        return <Lock className="w-5 h-5 text-yellow-400" />;
      case 'seat_released':
        return <Activity className="w-5 h-5 text-blue-400" />;
      case 'booking_cancelled':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'booking_failed':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  const getEventColor = (type: EventLog['type']) => {
    switch (type) {
      case 'booking_confirmed':
        return 'bg-green-400/10 border-green-400/20';
      case 'seat_locked':
        return 'bg-yellow-400/10 border-yellow-400/20';
      case 'seat_released':
        return 'bg-blue-400/10 border-blue-400/20';
      case 'booking_cancelled':
        return 'bg-red-400/10 border-red-400/20';
      case 'booking_failed':
        return 'bg-red-500/10 border-red-500/20';
      default:
        return 'bg-white/5 border-white/10';
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Activity className="w-6 h-6 text-primary" />
          Live Booking Activity
        </h1>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-sm font-medium text-green-400">
            Connected
          </span>
        </div>
      </div>

      <div className="flex-1 glass-card overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 bg-white/5 font-medium grid grid-cols-12 gap-4 text-sm text-foreground/60">
          <div className="col-span-2">Timestamp</div>
          <div className="col-span-2">Event</div>
          <div className="col-span-8">Details</div>
        </div>

        <div
          className="flex-1 overflow-y-auto p-4 space-y-2"
          ref={scrollRef}
        >
          <AnimatePresence initial={false}>
            {logs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className={`p-4 rounded-xl border ${getEventColor(
                  log.type
                )} grid grid-cols-12 gap-4 text-sm`}
              >
                <div className="col-span-2 text-foreground/60 font-mono">
                  {log.timestamp.toLocaleTimeString()}
                </div>

                <div className="col-span-2 flex items-center gap-2 font-bold">
                  {getEventIcon(log.type)}
                  <span className="capitalize">
                    {log.type.replace('_', ' ')}
                  </span>
                </div>

                <div className="col-span-8 font-mono text-xs opacity-80 break-all">
                  {JSON.stringify(log.details)}
                </div>
              </motion.div>
            ))}

            {logs.length === 0 && (
              <div className="text-center py-20 text-foreground/20">
                Waiting for events...
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}