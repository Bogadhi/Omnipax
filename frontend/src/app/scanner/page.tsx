'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { CheckCircle2, XCircle, QrCode, RefreshCw } from 'lucide-react';

type ScanStatus = 'idle' | 'scanning' | 'success' | 'error';

export default function ScannerPage() {
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [message, setMessage] = useState('Point camera at a QR ticket');
  const [ticketData, setTicketData] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the hidden input for barcode scanner devices
  useEffect(() => {
    inputRef.current?.focus();
  }, [status]);

  const handleScan = async (qrHash: string) => {
    if (!qrHash.trim() || status === 'scanning') return;
    setStatus('scanning');

    try {
      const res = await api.post('/tickets/scan', { qrHash: qrHash.trim() });
      setTicketData(res.data);
      setStatus('success');
      setMessage('Ticket Valid ✓');
    } catch (err: any) {
      setStatus('error');
      setMessage(err?.response?.data?.message ?? 'Invalid or already used ticket');
      setTicketData(null);
    }

    // Auto-reset after 3 seconds
    setTimeout(() => {
      setStatus('idle');
      setMessage('Point camera at a QR ticket');
      setTicketData(null);
      inputRef.current?.focus();
    }, 3000);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleScan((e.target as HTMLInputElement).value);
      (e.target as HTMLInputElement).value = '';
    }
  };

  const bgColor = status === 'success' ? 'bg-green-950' : status === 'error' ? 'bg-red-950' : 'bg-black';

  return (
    <div className={`flex flex-col items-center justify-center h-full ${bgColor} transition-colors duration-300 p-6`}>
      {/* Hidden input for hardware QR scanner */}
      <input
        ref={inputRef}
        type="text"
        className="absolute opacity-0 w-0 h-0"
        onKeyDown={handleKeyPress}
        aria-label="QR Scanner Input"
      />

      {/* Status icon */}
      <div className="mb-8">
        {status === 'idle' || status === 'scanning' ? (
          <div className="h-32 w-32 rounded-3xl border-4 border-dashed border-green-500/50 flex items-center justify-center">
            {status === 'scanning' ? (
              <RefreshCw className="h-12 w-12 text-green-400 animate-spin" />
            ) : (
              <QrCode className="h-12 w-12 text-green-400/60" />
            )}
          </div>
        ) : status === 'success' ? (
          <CheckCircle2 className="h-32 w-32 text-green-400" />
        ) : (
          <XCircle className="h-32 w-32 text-red-400" />
        )}
      </div>

      {/* Message */}
      <p className={`text-xl font-semibold text-center ${
        status === 'success' ? 'text-green-300' : status === 'error' ? 'text-red-300' : 'text-zinc-300'
      }`}>
        {message}
      </p>

      {/* Ticket details on success */}
      {ticketData && status === 'success' && (
        <div className="mt-6 bg-green-900/40 border border-green-700/40 rounded-2xl p-5 text-center max-w-sm w-full">
          <p className="text-green-200 font-semibold">{ticketData.seatNumber ?? 'Seat'}</p>
          <p className="text-green-400/80 text-sm mt-1">{ticketData.showTitle ?? ''}</p>
          <p className="text-green-400/60 text-xs mt-1">{ticketData.holderName ?? ''}</p>
        </div>
      )}

      {/* Manual input */}
      <div className="mt-8 w-full max-w-sm">
        <p className="text-zinc-600 text-xs text-center mb-2">Or enter QR code manually</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Paste QR hash…"
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-green-500"
            onKeyDown={(e) => { if (e.key === 'Enter') { handleScan((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ''; }}}
          />
          <button
            className="px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-xl transition-colors"
            onClick={(e) => {
              const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
              handleScan(input.value);
              input.value = '';
            }}
          >
            Scan
          </button>
        </div>
      </div>
    </div>
  );
}
