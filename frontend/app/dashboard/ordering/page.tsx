'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import orderingService from '../../../services/ordering.service';
import type { Order, OrderStatus } from '../../../types/ordering.types';

const STATUS_TABS: { value: OrderStatus | 'ALL'; label: string; color: string }[] = [
  { value: 'ALL', label: 'All', color: 'bg-gray-100 text-gray-700' },
  { value: 'PENDING', label: 'Pending', color: 'bg-amber-100 text-amber-700' },
  { value: 'CONFIRMED', label: 'Confirmed', color: 'bg-blue-100 text-blue-700' },
  { value: 'PREPARING', label: 'Preparing', color: 'bg-purple-100 text-purple-700' },
  { value: 'READY', label: 'Ready', color: 'bg-green-100 text-green-700' },
  { value: 'COMPLETED', label: 'Completed', color: 'bg-gray-100 text-gray-500' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'bg-red-100 text-red-700' },
];

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: 'CONFIRMED',
  CONFIRMED: 'PREPARING',
  PREPARING: 'READY',
  READY: 'COMPLETED',
};

function statusBadge(status: OrderStatus) {
  const tab = STATUS_TABS.find((t) => t.value === status);
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${tab?.color ?? 'bg-gray-100 text-gray-600'}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function formatPrice(val: string | number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(
    typeof val === 'string' ? parseFloat(val) : val,
  );
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function OrderCard({ order, onStatusUpdate }: { order: Order; onStatusUpdate: (o: Order) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);

  const next = NEXT_STATUS[order.status];

  const advance = async () => {
    if (!next) return;
    setUpdating(true);
    try {
      const updated = await orderingService.updateOrderStatus(order.id, next);
      onStatusUpdate(updated);
      toast.success(`Order marked as ${next.toLowerCase()}`);
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const cancel = async () => {
    if (!confirm('Cancel this order?')) return;
    setUpdating(true);
    try {
      const updated = await orderingService.updateOrderStatus(order.id, 'CANCELLED');
      onStatusUpdate(updated);
      toast.success('Order cancelled');
    } catch {
      toast.error('Failed to cancel order');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        {/* Order ID + time */}
        <div className="flex-shrink-0">
          <p className="text-sm font-mono font-semibold text-gray-900">#{order.id.slice(-6).toUpperCase()}</p>
          <p className="text-xs text-gray-400 mt-0.5">{timeAgo(order.createdAt)}</p>
        </div>

        {/* Customer info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900 truncate">
              {order.customerName || 'Walk-in'}
            </span>
            {order.tableNumber && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                Table {order.tableNumber}
              </span>
            )}
          </div>
          {order.customerPhone && (
            <p className="text-xs text-gray-500 mt-0.5">{order.customerPhone}</p>
          )}
          <p className="text-xs text-gray-400 mt-0.5">
            {order.lines?.length ?? 0} item{(order.lines?.length ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Status + total */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {statusBadge(order.status)}
          <span className="text-sm font-bold text-gray-900">{formatPrice(order.total)}</span>
        </div>

        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">
          {/* Order lines */}
          <div className="space-y-1.5">
            {order.lines?.map((line) => (
              <div key={line.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">
                  <span className="font-medium text-gray-900">{line.quantity}×</span>{' '}
                  {line.menuItem?.name ?? line.bundle?.name ?? '—'}
                </span>
                <span className="text-gray-600 font-medium">{formatPrice(line.lineTotal)}</span>
              </div>
            ))}
          </div>

          {/* Discount */}
          {parseFloat(String(order.discountAmt)) > 0 && (
            <div className="flex items-center justify-between text-sm text-green-700">
              <span>Discount</span>
              <span>−{formatPrice(order.discountAmt)}</span>
            </div>
          )}

          {/* Total */}
          <div className="flex items-center justify-between text-sm font-bold border-t border-gray-100 pt-2">
            <span className="text-gray-900">Total</span>
            <span className="text-gray-900">{formatPrice(order.total)}</span>
          </div>

          {/* Notes */}
          {order.notes && (
            <p className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
              Note: {order.notes}
            </p>
          )}

          {/* Actions */}
          {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
            <div className="flex gap-2 pt-1">
              {next && (
                <button
                  onClick={advance}
                  disabled={updating}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {updating ? 'Updating…' : `Mark as ${next.charAt(0) + next.slice(1).toLowerCase()}`}
                </button>
              )}
              <button
                onClick={cancel}
                disabled={updating}
                className="px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await orderingService.getOrders(
        statusFilter === 'ALL' ? undefined : statusFilter,
      );
      setOrders(data);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const handleStatusUpdate = (updated: Order) => {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500 text-sm mt-1">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/ordering/bundles"
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Bundles
          </Link>
          <Link
            href="/dashboard/ordering/pricing-rules"
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Pricing Rules
          </Link>
          <button
            onClick={() => { setLoading(true); load(); }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value as OrderStatus | 'ALL')}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === tab.value
                ? tab.color + ' ring-2 ring-offset-1 ring-current'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-5xl mb-3">📋</div>
          <h3 className="font-semibold text-gray-700">No orders yet</h3>
          <p className="text-gray-500 text-sm mt-1">
            {statusFilter === 'ALL' ? 'Orders will appear here when customers place them.' : `No ${statusFilter.toLowerCase()} orders.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} onStatusUpdate={handleStatusUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}
