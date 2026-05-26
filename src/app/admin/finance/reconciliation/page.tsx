'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ExternalLink, ChevronDown, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import type { FinanceReconciliationResponse } from '@/types/finance';
import { getStripeReconciliationReportUrl, getStripeChargeUrl, getStripePayoutUrl } from '@/lib/stripe-links';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function defaultDateRange(): { startDate: string; endDate: string } {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  return {
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10),
  };
}

export default function FinanceReconciliationPage() {
  const defaults = useMemo(() => defaultDateRange(), []);
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [noteByDate, setNoteByDate] = useState<Record<string, string>>({});
  const [data, setData] = useState<FinanceReconciliationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingDate, setSavingDate] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [datePayments, setDatePayments] = useState<Record<string, any>>({}); 
  const [loadingDate, setLoadingDate] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ startDate, endDate });
      const res = await fetch(`/api/admin/finance/reconciliation?${params}`, { cache: 'no-store' });
      const payload = (await res.json()) as {
        success?: boolean;
        data?: FinanceReconciliationResponse;
        error?: string;
      };

      if (!res.ok || !payload.data) {
        throw new Error(payload.error ?? 'Failed loading reconciliation data');
      }

      setData(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed loading reconciliation data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function markReconciled(bucketDate: string) {
    setSavingDate(bucketDate);
    setError('');
    try {
      const res = await fetch('/api/admin/finance/reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bucketDate,
          note: noteByDate[bucketDate] ?? '',
        }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(payload.error ?? 'Failed to mark reconciliation');
      }
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to mark reconciliation');
    } finally {
      setSavingDate(null);
    }
  }

  async function toggleBucketExpansion(date: string) {
    if (expandedDate === date) {
      setExpandedDate(null);
      return;
    }

    // If already loaded, just expand
    if (datePayments[date]) {
      setExpandedDate(date);
      return;
    }

    // Load payments for this date
    setLoadingDate(date);
    try {
      const res = await fetch(`/api/admin/finance/reconciliation/${date}`, { cache: 'no-store' });
      const payload = (await res.json()) as {
        success?: boolean;
        data?: any;
        error?: string;
      };

      if (!res.ok || !payload.data) {
        throw new Error(payload.error ?? 'Failed loading date details');
      }

      setDatePayments((prev) => ({ ...prev, [date]: payload.data }));
      setExpandedDate(date);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed loading date details');
    } finally {
      setLoadingDate(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Payout Reconciliation</h1>
          <p className="text-sm text-muted-foreground">
            Reconcile daily payout buckets and record immutable audit events.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" size="sm" asChild>
            <a
              href={getStripeReconciliationReportUrl('payout')}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1"
            >
              <ExternalLink className="h-4 w-4" />
              Stripe Sigma Report
            </a>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/finance">Back to Finance</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Range</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <Button onClick={() => void loadData()} disabled={loading}>Apply</Button>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}

      {!loading && data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Succeeded</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{formatCurrency(data.totals.succeededAmount)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Refunded</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{formatCurrency(data.totals.refundedAmount)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Net</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{formatCurrency(data.totals.netAmount)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Transactions</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{data.totals.transactionCount}</CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily Buckets</CardTitle>
              <CardDescription>
                Mark each day as reconciled after matching with Stripe payouts. Use the Sigma report above for detailed payout matching.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.buckets.length === 0 ? (
                <p className="text-sm text-muted-foreground">No buckets found for this range.</p>
              ) : (
                <>
                <div className="space-y-3 md:hidden">
                  {data.buckets.map((bucket) => {
                    const isExpanded = expandedDate === bucket.date;
                    const dateDetail = datePayments[bucket.date];
                    const isLoadingDetail = loadingDate === bucket.date;

                    return (
                      <Card key={bucket.date} className="rounded-2xl border-border/70 shadow-none">
                        <CardContent className="space-y-3 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold">{bucket.date}</p>
                              <p className="text-xs text-muted-foreground">{bucket.transactionCount} transactions</p>
                            </div>
                            <Badge variant={bucket.status === 'reconciled' ? 'default' : 'secondary'}>
                              {bucket.status}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Succeeded</p>
                              <p className="mt-1">{formatCurrency(bucket.succeededAmount)}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Refunded</p>
                              <p className="mt-1">{formatCurrency(bucket.refundedAmount)}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Net</p>
                              <p className="mt-1 font-semibold">{formatCurrency(bucket.netAmount)}</p>
                            </div>
                          </div>

                          <Input
                            value={noteByDate[bucket.date] ?? ''}
                            onChange={(e) =>
                              setNoteByDate((current) => ({ ...current, [bucket.date]: e.target.value }))
                            }
                            placeholder="Optional note"
                          />

                          <div className="flex flex-col gap-2">
                            <Button
                              size="sm"
                              variant={bucket.status === 'reconciled' ? 'outline' : 'default'}
                              disabled={savingDate === bucket.date || bucket.status === 'reconciled'}
                              onClick={() => void markReconciled(bucket.date)}
                            >
                              {bucket.status === 'reconciled' ? 'Reconciled' : 'Mark Reconciled'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void toggleBucketExpansion(bucket.date)}
                              disabled={isLoadingDetail}
                            >
                              {isLoadingDetail
                                ? 'Loading details...'
                                : isExpanded
                                  ? 'Hide Payments'
                                  : 'Show Payments'}
                            </Button>
                          </div>

                          {isExpanded && dateDetail ? (
                            <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                              <p className="text-xs text-muted-foreground">
                                Total {formatCurrency(dateDetail.totals.totalAmount)} · Fees {formatCurrency(dateDetail.totals.totalFees)}
                              </p>
                              {dateDetail.payments.map((payment: any) => (
                                <div key={payment.id} className="rounded border bg-background p-3 text-sm">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <p className="font-medium">{payment.bookingNumber}</p>
                                      <p className="text-xs text-muted-foreground">{payment.customerName}</p>
                                    </div>
                                    <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                                  </div>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {payment.cardBrand && payment.cardLastFour
                                      ? `${payment.cardBrand} •••• ${payment.cardLastFour}`
                                      : 'Payment method unavailable'}
                                  </p>
                                  <div className="mt-2 flex gap-2">
                                    {payment.stripeChargeId ? (
                                      <Button variant="outline" size="sm" asChild>
                                        <a
                                          href={getStripeChargeUrl(payment.stripeChargeId)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          Charge
                                        </a>
                                      </Button>
                                    ) : null}
                                    {payment.payout ? (
                                      <Button variant="outline" size="sm" asChild>
                                        <a
                                          href={getStripePayoutUrl(payment.payout.stripePayoutId)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          Payout
                                        </a>
                                      </Button>
                                    ) : null}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Succeeded</TableHead>
                        <TableHead>Refunded</TableHead>
                        <TableHead>Net</TableHead>
                        <TableHead>Transactions</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Note</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.buckets.map((bucket) => {
                        const isExpanded = expandedDate === bucket.date;
                        const dateDetail = datePayments[bucket.date];
                        const isLoadingDetail = loadingDate === bucket.date;

                        return (
                          <>
                            <TableRow key={bucket.date} className="bg-gray-50">
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => void toggleBucketExpansion(bucket.date)}
                                  disabled={isLoadingDetail}
                                >
                                  {isLoadingDetail ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              </TableCell>
                              <TableCell className="font-medium">{bucket.date}</TableCell>
                              <TableCell>{formatCurrency(bucket.succeededAmount)}</TableCell>
                              <TableCell>{formatCurrency(bucket.refundedAmount)}</TableCell>
                              <TableCell className="font-semibold">{formatCurrency(bucket.netAmount)}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{bucket.transactionCount}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={bucket.status === 'reconciled' ? 'default' : 'secondary'}>
                                  {bucket.status}
                                </Badge>
                              </TableCell>
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <Input
                                  value={noteByDate[bucket.date] ?? ''}
                                  onChange={(e) =>
                                    setNoteByDate((current) => ({ ...current, [bucket.date]: e.target.value }))
                                  }
                                  placeholder="Optional note"
                                  className="min-w-48"
                                />
                              </TableCell>
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="sm"
                                  variant={bucket.status === 'reconciled' ? 'outline' : 'default'}
                                  disabled={savingDate === bucket.date || bucket.status === 'reconciled'}
                                  onClick={() => void markReconciled(bucket.date)}
                                >
                                  {bucket.status === 'reconciled' ? 'Reconciled' : 'Mark Reconciled'}
                                </Button>
                              </TableCell>
                            </TableRow>

                            {isExpanded && dateDetail && (
                              <TableRow key={`${bucket.date}-details`}>
                                <TableCell colSpan={9} className="bg-white p-0">
                                  <div className="border-t-2 border-blue-100 p-4">
                                    <div className="mb-3 flex items-center justify-between">
                                      <h4 className="text-sm font-semibold">
                                        Payments for {bucket.date} ({dateDetail.totals.count} transactions)
                                      </h4>
                                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                        <span>Total: {formatCurrency(dateDetail.totals.totalAmount)}</span>
                                        <span>Fees: {formatCurrency(dateDetail.totals.totalFees)}</span>
                                        <span>
                                          Matched to Payout: {dateDetail.totals.matchedToPayoutCount}/{dateDetail.totals.count}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    <div className="overflow-x-auto">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead className="w-8"></TableHead>
                                            <TableHead>Time</TableHead>
                                            <TableHead>Booking</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Fee</TableHead>
                                            <TableHead>Payment Method</TableHead>
                                            <TableHead>Payout Status</TableHead>
                                            <TableHead>Stripe Link</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {dateDetail.payments.map((payment: any) => (
                                            <TableRow key={payment.id} className="text-sm">
                                              <TableCell>
                                                {payment.payout ? (
                                                  <CheckCircle className="h-4 w-4 text-green-600" aria-label="Matched to payout" />
                                                ) : (
                                                  <XCircle className="h-4 w-4 text-orange-600" aria-label="Not matched" />
                                                )}
                                              </TableCell>
                                              <TableCell className="text-xs">
                                                {new Date(payment.paidAt).toLocaleTimeString()}
                                              </TableCell>
                                              <TableCell>
                                                <div className="font-medium">{payment.bookingNumber}</div>
                                                <div className="text-xs text-muted-foreground font-mono">
                                                  {payment.stripeChargeId?.slice(0, 12)}...
                                                </div>
                                              </TableCell>
                                              <TableCell>
                                                <div>{payment.customerName}</div>
                                                <div className="text-xs text-muted-foreground">{payment.customerEmail}</div>
                                              </TableCell>
                                              <TableCell className="font-semibold">
                                                {formatCurrency(payment.amount)}
                                              </TableCell>
                                              <TableCell>
                                                {payment.stripeFeeAmount ? formatCurrency(payment.stripeFeeAmount) : '—'}
                                              </TableCell>
                                              <TableCell>
                                                {payment.cardBrand && payment.cardLastFour ? (
                                                  <div className="capitalize">
                                                    {payment.cardBrand} •••• {payment.cardLastFour}
                                                  </div>
                                                ) : (
                                                  '—'
                                                )}
                                              </TableCell>
                                              <TableCell>
                                                {payment.payout ? (
                                                  <div>
                                                    <Badge variant="default" className="text-xs">
                                                      {payment.payout.status}
                                                    </Badge>
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                      {formatCurrency(payment.payout.amount)}
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <Badge variant="outline" className="text-xs">Unmatched</Badge>
                                                )}
                                              </TableCell>
                                              <TableCell>
                                                <div className="flex gap-1">
                                                  {payment.stripeChargeId && (
                                                    <Button variant="ghost" size="sm" className="h-6 px-2" asChild>
                                                      <a
                                                        href={getStripeChargeUrl(payment.stripeChargeId)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        title="View charge"
                                                      >
                                                        <ExternalLink className="h-3 w-3" />
                                                      </a>
                                                    </Button>
                                                  )}
                                                  {payment.payout && (
                                                    <Button variant="ghost" size="sm" className="h-6 px-2" asChild>
                                                      <a
                                                        href={getStripePayoutUrl(payment.payout.stripePayoutId)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        title="View payout"
                                                      >
                                                        $
                                                      </a>
                                                    </Button>
                                                  )}
                                                </div>
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
