'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { platformApi } from '@/lib/api/platform';
import { useState } from 'react';
import {
  ShieldCheck,
  ShieldOff,
  TrendingUp,
  Users,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

// ─── Status Badge ────────────────────────────────────────────────────────────
function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
        isActive
          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
          : 'bg-red-500/10 text-red-400 border border-red-500/20'
      }`}
    >
      {isActive ? (
        <CheckCircle2 size={12} />
      ) : (
        <XCircle size={12} />
      )}
      {isActive ? 'Active' : 'Suspended'}
    </span>
  );
}

// ─── Metric Card ─────────────────────────────────────────────────────────────
function MetricCard({
  title,
  value,
  Icon,
  color = 'text-blue-400',
}: {
  title: string;
  value: string | number;
  Icon: any;
  color?: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex items-center gap-4">
      <div className={`p-3 rounded-xl bg-gray-800 ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider">{title}</p>
        <p className="text-xl font-bold text-white mt-0.5">{value}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<'suspend' | 'activate' | null>(null);

  const { data: tenant, isLoading, isError } = useQuery({
    queryKey: ['platform', 'tenant', id],
    queryFn: () => platformApi.getTenantById(id!),
    enabled: !!id,
  });

  const { data: health } = useQuery({
    queryKey: ['platform', 'tenant-health', id],
    queryFn: () => platformApi.getTenantHealth(id!),
    enabled: !!id,
    refetchInterval: 30_000,
  });

  const toggleStatus = useMutation({
    mutationFn: () =>
      platformApi.updateTenantStatus(id!, !tenant?.isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'tenant', id] });
      queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
      setConfirmAction(null);
    },
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-10 w-96 bg-gray-800 rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-gray-800 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !tenant) {
    return (
      <div className="flex items-center gap-3 text-red-400 p-8 bg-red-500/5 rounded-2xl border border-red-500/20">
        <AlertTriangle size={20} />
        <span>Failed to load tenant. Check your connection.</span>
      </div>
    );
  }

  const usagePct = Math.min(
    Math.round((tenant.monthlyBookingCount / (tenant.bookingLimit || 1)) * 100),
    100,
  );

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold">{tenant.name}</h2>
          <p className="text-gray-500 mt-1 text-sm">
            Slug: <span className="text-gray-300 font-mono">{tenant.slug}</span>{' '}
            · Plan: <span className="text-blue-400 font-bold">{tenant.plan}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge isActive={tenant.isActive} />
          <button
            onClick={() => setConfirmAction(tenant.isActive ? 'suspend' : 'activate')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              tenant.isActive
                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'
            }`}
          >
            {tenant.isActive ? (
              <><ShieldOff size={16} /> Suspend</>
            ) : (
              <><ShieldCheck size={16} /> Activate</>
            )}
          </button>
        </div>
      </div>

      {/* ── Confirmation Dialog ── */}
      {confirmAction && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-6 flex items-center justify-between">
          <p className="text-yellow-400 font-medium">
            Are you sure you want to {confirmAction} tenant "{tenant.name}"?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmAction(null)}
              className="px-4 py-2 text-sm rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={() => toggleStatus.mutate()}
              disabled={toggleStatus.isPending}
              className={`px-4 py-2 text-sm rounded-xl font-semibold ${
                confirmAction === 'suspend'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {toggleStatus.isPending ? 'Processing...' : 'Confirm'}
            </button>
          </div>
        </div>
      )}

      {/* ── Key Metrics ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Monthly Revenue"
          value={`₹${Number(tenant.monthlyRevenue || 0).toLocaleString()}`}
          Icon={TrendingUp}
          color="text-green-400"
        />
        <MetricCard
          title="Bookings (MTD)"
          value={tenant.monthlyBookingCount || 0}
          Icon={CreditCard}
          color="text-blue-400"
        />
        <MetricCard
          title="Booking Limit"
          value={tenant.bookingLimit || 0}
          Icon={Users}
          color="text-purple-400"
        />
        <MetricCard
          title="Subscription"
          value={tenant.subscriptionStatus || 'N/A'}
          Icon={ShieldCheck}
          color="text-yellow-400"
        />
      </div>

      {/* ── Usage Bar ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex justify-between mb-3">
          <h3 className="font-semibold">Monthly Booking Usage</h3>
          <span className="text-sm text-gray-400">
            {tenant.monthlyBookingCount} / {tenant.bookingLimit} ({usagePct}%)
          </span>
        </div>
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              usagePct > 90 ? 'bg-red-500' : usagePct > 70 ? 'bg-yellow-400' : 'bg-blue-500'
            }`}
            style={{ width: `${usagePct}%` }}
          />
        </div>
        {usagePct > 90 && (
          <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
            <AlertTriangle size={12} />
            Approaching booking limit — consider upgrading plan
          </p>
        )}
      </div>

      {/* ── Health Status ── */}
      {health && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="font-semibold mb-4">System Health</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(health).map(([key, value]: [string, any]) => (
              <div key={key} className="bg-gray-800/50 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  {key.replace(/_/g, ' ')}
                </p>
                <p className={`font-bold ${value === 'ok' || value === true ? 'text-green-400' : 'text-red-400'}`}>
                  {String(value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
