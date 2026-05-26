'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, ExternalLink, Trash2, CheckSquare, Square } from 'lucide-react';
import type { FinanceAuditEvent, FinanceTransactionsResponse, FinanceTransactionStatus } from '@/types/finance';
import { TransactionDetailModal } from '@/components/admin/TransactionDetailModal';
import { getStripeChargeUrl } from '@/lib/stripe-links';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function FinanceRefundsPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'refunded' | 'failed' | 'pending' | 'succeeded'>('refunded');
  const [reasonById, setReasonById] = useState<Record<string, string>>({});
  const [amountById, setAmountById] = useState<Record<string, string>>({});
  const [data, setData] = useState<FinanceTransactionsResponse | null>(null);
  const [auditEvents, setAuditEvents] = useState<FinanceAuditEvent[]>([]);
  const [adjustBookingId, setAdjustBookingId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchReason, setBatchReason] = useState('');
  const [batchAmount, setBatchAmount] = useState('');
  const [processingBatch, setProcessingBatch] = useState(false);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ status: filterStatus });
      if (search.trim()) {
        params.set('search', search.trim());
      }
      const res = await fetch(`/api/admin/finance/refunds?${params}`, { cache: 'no-store' });
      const payload = (await res.json()) as {
        success?: boolean;
        data?: FinanceTransactionsResponse;
        error?: string;
      };

      if (!res.ok || !payload.data) {
        throw new Error(payload.error ?? 'Failed loading refund queue');
      }

      setData(payload.data);

      const auditRes = await fetch('/api/admin/finance/audit?limit=50', { cache: 'no-store' });
      const auditPayload = (await auditRes.json()) as {
        success?: boolean;
        data?: FinanceAuditEvent[];
      };
      setAuditEvents(auditPayload.data ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed loading refund queue');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [filterStatus]);

  const rows = useMemo(() => data?.rows ?? [], [data]);

  async function handleRefund(paymentId: string, paymentAmount: number) {
    const rawAmount = amountById[paymentId] ?? '';
    const refundAmount = Number.parseFloat(rawAmount);
    const reason = (reasonById[paymentId] ?? '').trim();

    if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
      setError('Refund amount must be greater than zero.');
      return;
    }

    if (refundAmount > paymentAmount) {
      setError('Refund amount cannot exceed payment amount.');
      return;
    }

    if (!reason) {
      setError('Refund reason is required.');
      return;
    }

    setSavingId(paymentId);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/admin/finance/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, refundAmount, reason }),
      });
      const payload = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(payload.error ?? 'Refund failed');
      }

      setMessage('Refund applied successfully.');
      setReasonById((current) => ({ ...current, [paymentId]: '' }));
      setAmountById((current) => ({ ...current, [paymentId]: '' }));
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Refund failed');
    } finally {
      setSavingId(null);
    }
  }

  async function handleAdjustment() {
    const amount = Number.parseFloat(adjustAmount);

    if (!adjustBookingId.trim()) {
      setError('Booking ID is required for manual adjustments.');
      return;
    }
    if (!Number.isFinite(amount) || amount === 0) {
      setError('Adjustment amount must be non-zero.');
      return;
    }
    if (!adjustReason.trim()) {
      setError('Adjustment reason is required.');
      return;
    }

    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/admin/finance/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: adjustBookingId.trim(),
          amount,
          reason: adjustReason.trim(),
        }),
      });
      const payload = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(payload.error ?? 'Adjustment failed');
      }

      setAdjustAmount('');
      setAdjustReason('');
      setMessage('Manual adjustment recorded successfully.');
      await loadData();
    } catch (adjustError) {
      setError(adjustError instanceof Error ? adjustError.message : 'Adjustment failed');
    }
  }

  function toggleSelection(paymentId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(paymentId)) {
        next.delete(paymentId);
      } else {
        next.add(paymentId);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === rows.length && rows.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map((r) => r.id)));
    }
  }

  async function handleBatchRefund() {
    if (selectedIds.size === 0) {
      setError('No transactions selected for batch refund.');
      return;
    }

    const amount = batchAmount.trim() ? Number.parseFloat(batchAmount) : null;
    const reason = batchReason.trim();

    if (!reason) {
      setError('Batch refund reason is required.');
      return;
    }

    if (amount !== null && (!Number.isFinite(amount) || amount <= 0)) {
      setError('Invalid refund amount.');
      return;
    }

    // Confirm if more than 5 transactions
    if (selectedIds.size > 5) {
      const confirmed = window.confirm(
        `You are about to refund ${selectedIds.size} transactions. This cannot be undone. Continue?`
      );
      if (!confirmed) return;
    }

    setProcessingBatch(true);
    setError('');
    setMessage('');

    const results: Array<{ id: string; success: boolean; error?: string }> = [];

    for (const paymentId of selectedIds) {
      const row = rows.find((r) => r.id === paymentId);
      if (!row) continue;

      const refundAmount = amount ?? row.amount;

      try {
        const res = await fetch('/api/admin/finance/refunds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentId, refundAmount, reason }),
        });

        const payload = (await res.json()) as { error?: string };

        if (!res.ok) {
          results.push({ id: paymentId, success: false, error: payload.error ?? 'Refund failed' });
        } else {
          results.push({ id: paymentId, success: true });
        }
      } catch (refundError) {
        results.push({
          id: paymentId,
          success: false,
          error: refundError instanceof Error ? refundError.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    if (failCount > 0) {
      const failedIds = results.filter((r) => !r.success).map((r) => r.id);
      setError(`Batch refund completed with errors. ${successCount} succeeded, ${failCount} failed. Failed IDs: ${failedIds.join(', ')}`);
    } else {
      setMessage(`Batch refund completed successfully. ${successCount} transaction(s) refunded.`);
    }

    setSelectedIds(new Set());
    setBatchReason('');
    setBatchAmount('');
    setProcessingBatch(false);
    await loadData();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Refund Console</h1>
          <p className="text-sm text-muted-foreground">
            Process manual refunds and keep a finance audit trail for each action.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/finance">Back to Finance</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Search Refund Queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <Label htmlFor="status-filter" className="text-xs">Filter by Status</Label>
              <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as any)}>
                <SelectTrigger id="status-filter" className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="refunded">Refunded</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="succeeded">Succeeded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1">
              <Label htmlFor="search-input" className="text-xs">Search</Label>
              <Input
                id="search-input"
                placeholder="Booking number, customer, or Stripe ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button onClick={() => void loadData()} disabled={loading}>Apply</Button>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}
      {message && <p className="text-sm text-green-700">{message}</p>}

      {!loading && data && (
        <>
          {/* Batch Action Bar */}
          {selectedIds.size > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-blue-900">
                      {selectedIds.size} transaction(s) selected
                    </p>
                    <p className="text-xs text-blue-700">
                      Ready for batch refund processing
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <Input
                      placeholder="Refund amount (optional, uses full amount)"
                      value={batchAmount}
                      onChange={(e) => setBatchAmount(e.target.value)}
                      className="w-full sm:w-48"
                      type="number"
                      step="0.01"
                    />
                    <Input
                      placeholder="Reason for batch refund"
                      value={batchReason}
                      onChange={(e) => setBatchReason(e.target.value)}
                      className="w-full sm:w-64"
                    />
                    <Button
                      onClick={() => void handleBatchRefund()}
                      disabled={processingBatch || !batchReason.trim()}
                      variant="destructive"
                    >
                      {processingBatch ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Batch Refund
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedIds(new Set())}
                      disabled={processingBatch}
                    >
                      Clear Selection
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Eligible Transactions ({rows.length})
                {rows.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSelectAll}
                    className="ml-2"
                  >
                    {selectedIds.size === rows.length ? (
                      <>
                        <CheckSquare className="mr-1 h-4 w-4" />
                        Deselect All
                      </>
                    ) : (
                      <>
                        <Square className="mr-1 h-4 w-4" />
                        Select All
                      </>
                    )}
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No refundable transactions found.</p>
              ) : (
                <>
                  <div className="space-y-3 md:hidden">
                    {rows.map((row) => (
                      <Card key={row.id} className="rounded-2xl border-border/70 shadow-none">
                        <CardContent className="space-y-3 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => toggleSelection(row.id)}
                            >
                              {selectedIds.has(row.id) ? (
                                <CheckSquare className="h-4 w-4 text-blue-600" />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                            </Button>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium">{row.bookingNumber}</p>
                              <p className="text-xs text-muted-foreground">{row.customerName}</p>
                            </div>
                            <Badge variant={row.status === 'succeeded' ? 'default' : 'outline'}>{row.status}</Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Amount</p>
                              <p className="mt-1">{formatCurrency(row.amount)}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Stripe Fee</p>
                              <p className="mt-1">{row.stripeFee ? formatCurrency(row.stripeFee) : '—'}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Payment Method</p>
                              <p className="mt-1">
                                {row.cardBrand && row.cardLastFour
                                  ? `${row.cardBrand} •••• ${row.cardLastFour}`
                                  : '—'}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`mobile-amount-${row.id}`} className="text-xs">Refund Amount</Label>
                            <Input
                              id={`mobile-amount-${row.id}`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={amountById[row.id] ?? ''}
                              onChange={(e) =>
                                setAmountById((current) => ({ ...current, [row.id]: e.target.value }))
                              }
                              placeholder="0.00"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`mobile-reason-${row.id}`} className="text-xs">Reason</Label>
                            <Input
                              id={`mobile-reason-${row.id}`}
                              value={reasonById[row.id] ?? ''}
                              onChange={(e) =>
                                setReasonById((current) => ({ ...current, [row.id]: e.target.value }))
                              }
                              placeholder="Reason"
                            />
                          </div>

                          <div className="flex flex-col gap-2">
                            {row.stripeChargeId ? (
                              <Button variant="outline" size="sm" asChild>
                                <a
                                  href={getStripeChargeUrl(row.stripeChargeId)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  View in Stripe
                                </a>
                              </Button>
                            ) : null}
                            <Button
                              size="sm"
                              disabled={savingId === row.id}
                              onClick={() => void handleRefund(row.id, row.amount)}
                            >
                              {savingId === row.id ? 'Applying...' : 'Apply Refund'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="hidden md:block">
                    <Table className="min-w-[1120px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10"></TableHead>
                          <TableHead>Booking</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Payment Method</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Stripe Fee</TableHead>
                          <TableHead>Stripe Link</TableHead>
                          <TableHead>Refund Amount</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((row) => (
                          <TableRow 
                            key={row.id}
                            className="hover:bg-gray-50"
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => toggleSelection(row.id)}
                              >
                                {selectedIds.has(row.id) ? (
                                  <CheckSquare className="h-4 w-4 text-blue-600" />
                                ) : (
                                  <Square className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                            <TableCell 
                              className="cursor-pointer"
                              onClick={() => setSelectedPaymentId(row.id)}
                            >
                              <p className="font-medium">{row.bookingNumber}</p>
                              <p className="text-xs text-muted-foreground">{row.customerName}</p>
                            </TableCell>
                            <TableCell onClick={() => setSelectedPaymentId(row.id)} className="cursor-pointer">
                              <Badge variant={row.status === 'succeeded' ? 'default' : 'outline'}>{row.status}</Badge>
                            </TableCell>
                            <TableCell>
                              {row.cardBrand && row.cardLastFour ? (
                                <div className="text-sm">
                                  <span className="capitalize">{row.cardBrand}</span> •••• {row.cardLastFour}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>{formatCurrency(row.amount)}</TableCell>
                            <TableCell>
                              {row.stripeFee ? formatCurrency(row.stripeFee) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              {row.stripeChargeId ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  asChild
                                >
                                  <a
                                    href={getStripeChargeUrl(row.stripeChargeId)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    View
                                  </a>
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={amountById[row.id] ?? ''}
                                onChange={(e) =>
                                  setAmountById((current) => ({ ...current, [row.id]: e.target.value }))
                                }
                                placeholder="0.00"
                                className="w-28"
                              />
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <div className="space-y-1">
                                <Label htmlFor={`reason-${row.id}`} className="sr-only">
                                  Refund reason
                                </Label>
                                <Input
                                  id={`reason-${row.id}`}
                                  value={reasonById[row.id] ?? ''}
                                  onChange={(e) =>
                                    setReasonById((current) => ({ ...current, [row.id]: e.target.value }))
                                  }
                                  placeholder="Reason"
                                  className="min-w-56"
                                />
                              </div>
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                disabled={savingId === row.id}
                                onClick={() => void handleRefund(row.id, row.amount)}
                              >
                                {savingId === row.id ? 'Applying...' : 'Apply Refund'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Manual Adjustment</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-4">
              <Input
                placeholder="Booking ID"
                value={adjustBookingId}
                onChange={(e) => setAdjustBookingId(e.target.value)}
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Amount"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
              />
              <Input
                placeholder="Reason"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
              />
              <Button onClick={() => void handleAdjustment()}>Apply Adjustment</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Finance Audit Trail</CardTitle>
            </CardHeader>
            <CardContent>
              {auditEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No finance audit events yet.</p>
              ) : (
                <div className="space-y-2">
                  {auditEvents.map((event) => (
                    <div key={event.id} className="rounded border p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{event.eventType}</p>
                        <p className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Actor: {event.actorName} {event.bookingId ? `• Booking ${event.bookingId}` : ''}
                      </p>
                      <p className="mt-1">{event.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        paymentId={selectedPaymentId ?? ''}
        isOpen={!!selectedPaymentId}
        onClose={() => setSelectedPaymentId(null)}
      />
    </div>
  );
}
