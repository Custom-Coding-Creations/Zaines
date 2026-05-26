'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import { getStripePayoutUrl, getStripeReconciliationReportUrl } from '@/lib/stripe-links';

interface PayoutData {
  id: string;
  stripePayoutId: string;
  amount: number;
  currency: string;
  status: string;
  arrivedAt: Date | null;
  reconciledAt: Date | null;
  reconciledByUserId: string | null;
  createdAt: Date;
  transactionCount: number;
  totalCharged: number;
  totalFees: number;
  totalNet: number;
}

interface PayoutsResponse {
  payouts: PayoutData[];
  totals: {
    totalPayouts: number;
    totalAmount: number;
    reconciledCount: number;
    pendingCount: number;
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

function formatDate(date: Date | null): string {
  if (!date) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
  }).format(new Date(date));
}

function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const normalizedStatus = status.toLowerCase();
  if (normalizedStatus === 'paid') return 'default';
  if (normalizedStatus === 'pending' || normalizedStatus === 'in_transit') return 'secondary';
  if (normalizedStatus === 'failed' || normalizedStatus === 'canceled') return 'destructive';
  return 'outline';
}

export default function FinancePayoutsPage() {
  const [data, setData] = useState<PayoutsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedPayoutId, setExpandedPayoutId] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/finance/payouts', { cache: 'no-store' });
      const payload = (await res.json()) as {
        success?: boolean;
        data?: PayoutsResponse;
        error?: string;
      };

      if (!res.ok || !payload.data) {
        throw new Error(payload.error ?? 'Failed loading payouts');
      }

      setData(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed loading payouts');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Stripe Payouts</h1>
          <p className="text-sm text-muted-foreground">
            View all Stripe payouts and their reconciliation status.
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
              Sigma Report
            </a>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/finance">Back to Finance</Link>
          </Button>
        </div>
      </div>

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
                <CardTitle className="text-sm">Total Payouts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{data.totals.totalPayouts}</div>
                <div className="text-xs text-muted-foreground mt-1">All time</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{formatCurrency(data.totals.totalAmount)}</div>
                <div className="text-xs text-muted-foreground mt-1">Lifetime payouts</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Reconciled</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{data.totals.reconciledCount}</div>
                <div className="text-xs text-muted-foreground mt-1">Matched to transactions</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{data.totals.pendingCount}</div>
                <div className="text-xs text-muted-foreground mt-1">Awaiting reconciliation</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payouts ({data.payouts.length})</CardTitle>
              <CardDescription>
                Click a payout to view details. Use Sigma report above for detailed reconciliation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.payouts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payouts found.</p>
              ) : (
                <>
                  <div className="space-y-3 md:hidden">
                    {data.payouts.map((payout) => (
                      <Card key={payout.id} className="rounded-2xl border-border/70 shadow-none">
                        <CardContent className="space-y-3 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-mono text-xs text-muted-foreground truncate">{payout.stripePayoutId}</p>
                              <p className="text-xs text-muted-foreground mt-1">Created {formatDate(payout.createdAt)}</p>
                            </div>
                            <Badge variant={getStatusBadgeVariant(payout.status)}>{payout.status}</Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Amount</p>
                              <p className="mt-1 font-semibold">{formatCurrency(payout.amount)}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Arrived</p>
                              <p className="mt-1">{formatDate(payout.arrivedAt)}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Transactions</p>
                              <p className="mt-1">{payout.transactionCount}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Reconciled</p>
                              <p className="mt-1">{payout.reconciledAt ? 'Yes' : 'Pending'}</p>
                            </div>
                          </div>

                          {payout.totalCharged > 0 ? (
                            <div className="rounded-md border bg-muted/20 p-3 text-sm">
                              <p>Charged: {formatCurrency(payout.totalCharged)}</p>
                              <p>Fees: {formatCurrency(payout.totalFees)}</p>
                              <p className="font-medium">Net: {formatCurrency(payout.totalNet)}</p>
                            </div>
                          ) : null}

                          <Button variant="ghost" size="sm" asChild>
                            <a
                              href={getStripePayoutUrl(payout.stripePayoutId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View in Stripe
                            </a>
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="hidden md:block">
                    <Table className="min-w-[900px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10"></TableHead>
                          <TableHead>Payout ID</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Arrived At</TableHead>
                          <TableHead>Transactions</TableHead>
                          <TableHead>Reconciled</TableHead>
                          <TableHead>Stripe Link</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.payouts.map((payout) => (
                          <TableRow key={payout.id}>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => setExpandedPayoutId(expandedPayoutId === payout.id ? null : payout.id)}
                              >
                                {expandedPayoutId === payout.id ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium font-mono text-sm">{payout.stripePayoutId}</p>
                              <p className="text-xs text-muted-foreground">
                                Created {formatDate(payout.createdAt)}
                              </p>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-semibold">{formatCurrency(payout.amount)}</p>
                                {payout.totalCharged > 0 && (
                                  <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                                    <div>Charged: {formatCurrency(payout.totalCharged)}</div>
                                    <div>Fees: {formatCurrency(payout.totalFees)}</div>
                                    <div>Net: {formatCurrency(payout.totalNet)}</div>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(payout.status)}>
                                {payout.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(payout.arrivedAt)}</TableCell>
                            <TableCell>
                              <div className="text-center">
                                <div className="font-semibold">{payout.transactionCount}</div>
                                <div className="text-xs text-muted-foreground">payments</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {payout.reconciledAt ? (
                                <div>
                                  <Badge variant="default">Reconciled</Badge>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {formatDate(payout.reconciledAt)}
                                  </p>
                                </div>
                              ) : (
                                <Badge variant="outline">Pending</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" asChild>
                                <a
                                  href={getStripePayoutUrl(payout.stripePayoutId)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  View
                                </a>
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
        </>
      )}
    </div>
  );
}
