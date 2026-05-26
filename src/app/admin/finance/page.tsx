'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Download, RefreshCw, TrendingUp, TrendingDown, DollarSign, CreditCard, AlertTriangle, ExternalLink, FileText, BarChart3 } from 'lucide-react';
import { AdminErrorState, AdminLoadingState } from '@/components/admin/AdminAsyncState';
import type {
  FinanceAlertsResponse,
  FinanceAutopayConsentSummaryResponse,
  FinanceCashForecastResponse,
  FinanceExceptionsResponse,
  FinanceOverviewResponse,
  FinanceRevenueRecognitionSummaryResponse,
  FinanceTransactionStatus,
  FinanceTransactionsResponse,
  FinanceWebhookHealthResponse,
} from '@/types/finance';
import type { StripeCapabilityFlags } from '@/types/admin';
import { TransactionDetailModal } from '@/components/admin/TransactionDetailModal';
import {
  getStripeSigmaUrl,
  getStripeReconciliationReportUrl,
  getStripeBillingSubscriptionsUrl,
  getStripeCustomerPortalConfigUrl,
} from '@/lib/stripe-links';

type FetchState = {
  loading: boolean;
  error: string;
};

function defaultStripeCapabilityFlags(): StripeCapabilityFlags {
  return {
    billingSubscriptionsEnabled: false,
    customerPortalEnabled: false,
    savedPaymentMethodsEnabled: false,
    oneClickRebookingEnabled: false,
    autopayEnabled: false,
    taxEnabled: false,
    disputesEnabled: false,
    radarReviewEnabled: false,
    connectEnabled: false,
    treasuryEnabled: false,
    issuingEnabled: false,
    financialConnectionsEnabled: false,
    identityEnabled: false,
    terminalEnabled: false,
    premiumCheckoutReassuranceEnabled: false,
    premiumCheckoutCopyEnabled: false,
    premiumCheckoutTrustIndicatorsEnabled: false,
    premiumCheckoutLoadingExperienceEnabled: false,
  };
}

const STATUS_OPTIONS: Array<{ label: string; value: 'all' | FinanceTransactionStatus }> = [
  { label: 'All statuses', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Succeeded', value: 'succeeded' },
  { label: 'Failed', value: 'failed' },
  { label: 'Refunded', value: 'refunded' },
  { label: 'Cancelled', value: 'cancelled' },
];

function statusBadgeVariant(status: FinanceTransactionStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'succeeded':
      return 'default';
    case 'pending':
      return 'secondary';
    case 'failed':
      return 'destructive';
    case 'refunded':
      return 'outline';
    case 'cancelled':
      return 'outline';
    default:
      return 'outline';
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function formatShortDate(value: string): string {
  return new Date(value).toLocaleDateString();
}

function severityBadgeVariant(severity: 'info' | 'warning' | 'critical'): 'default' | 'secondary' | 'destructive' {
  switch (severity) {
    case 'critical':
      return 'destructive';
    case 'warning':
      return 'secondary';
    case 'info':
    default:
      return 'default';
  }
}

function recognitionBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'fully_recognized':
      return 'default';
    case 'partially_recognized':
      return 'secondary';
    case 'reversed':
      return 'destructive';
    case 'excluded':
      return 'outline';
    case 'deferred':
    case 'pending_payment':
    case 'voided':
    default:
      return 'secondary';
  }
}

function defaultDateRange(): { startDate: string; endDate: string } {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 120);

  return {
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10),
  };
}

function normalizeDateForApi(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const month = usMatch[1].padStart(2, '0');
    const day = usMatch[2].padStart(2, '0');
    const year = usMatch[3];
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return trimmed;
}

export default function AdminFinancePage() {
  const defaults = useMemo(() => defaultDateRange(), []);
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | FinanceTransactionStatus>('all');

  const [overview, setOverview] = useState<FinanceOverviewResponse | null>(null);
  const [revenueRecognition, setRevenueRecognition] =
    useState<FinanceRevenueRecognitionSummaryResponse | null>(null);
  const [transactions, setTransactions] = useState<FinanceTransactionsResponse | null>(null);
  const [alerts, setAlerts] = useState<FinanceAlertsResponse | null>(null);
  const [exceptions, setExceptions] = useState<FinanceExceptionsResponse | null>(null);
  const [forecast, setForecast] = useState<FinanceCashForecastResponse | null>(null);
  const [webhookHealth, setWebhookHealth] = useState<FinanceWebhookHealthResponse | null>(null);
  const [autopayConsents, setAutopayConsents] =
    useState<FinanceAutopayConsentSummaryResponse | null>(null);
  const [stripeCapabilityFlags, setStripeCapabilityFlags] = useState<StripeCapabilityFlags>(
    defaultStripeCapabilityFlags(),
  );
  const [evaluatedAt, setEvaluatedAt] = useState<number | null>(null);
  const [state, setState] = useState<FetchState>({ loading: true, error: '' });
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setState({ loading: true, error: '' });

    try {
      const normalizedStartDate = normalizeDateForApi(startDate);
      const normalizedEndDate = normalizeDateForApi(endDate);

      const params = new URLSearchParams({
        startDate: normalizedStartDate,
        endDate: normalizedEndDate,
      });
      const txParams = new URLSearchParams({
        startDate: normalizedStartDate,
        endDate: normalizedEndDate,
        ...(status !== 'all' ? { status } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
      });

      const [overviewRes, revRecRes, txRes, alertsRes, exceptionsRes, forecastRes, webhookRes, settingsRes, autopayRes] = await Promise.all([
        fetch(`/api/admin/finance/overview?${params}`, { cache: 'no-store' }),
        fetch(`/api/admin/finance/revenue-recognition?${params}`, { cache: 'no-store' }),
        fetch(`/api/admin/finance/transactions?${txParams}`, { cache: 'no-store' }),
        fetch('/api/admin/finance/alerts', { cache: 'no-store' }),
        fetch('/api/admin/finance/exceptions', { cache: 'no-store' }),
        fetch('/api/admin/finance/forecast?days=30', { cache: 'no-store' }),
        fetch('/api/admin/finance/webhooks', { cache: 'no-store' }),
        fetch('/api/admin/settings', { cache: 'no-store' }),
        fetch('/api/admin/finance/autopay-consents', { cache: 'no-store' }),
      ]);

      const overviewJson = (await overviewRes.json()) as {
        success?: boolean;
        data?: FinanceOverviewResponse;
        error?: string;
      };
      const txJson = (await txRes.json()) as {
        success?: boolean;
        data?: FinanceTransactionsResponse;
        error?: string;
      };
      const revRecJson = (await revRecRes.json()) as {
        success?: boolean;
        data?: FinanceRevenueRecognitionSummaryResponse;
        error?: string;
      };
      const alertsJson = (await alertsRes.json()) as {
        success?: boolean;
        data?: FinanceAlertsResponse;
        error?: string;
      };
      const exceptionsJson = (await exceptionsRes.json()) as {
        success?: boolean;
        data?: FinanceExceptionsResponse;
        error?: string;
      };
      const forecastJson = (await forecastRes.json()) as {
        success?: boolean;
        data?: FinanceCashForecastResponse;
        error?: string;
      };
      const settingsJson = (await settingsRes.json()) as {
        success?: boolean;
        data?: { stripeCapabilityFlags?: StripeCapabilityFlags };
      };
      const webhookJson = (await webhookRes.json()) as {
        success?: boolean;
        data?: FinanceWebhookHealthResponse;
        error?: string;
      };
      const autopayJson = (await autopayRes.json()) as {
        success?: boolean;
        data?: FinanceAutopayConsentSummaryResponse;
        error?: string;
      };

      if (!overviewRes.ok || !overviewJson.data) {
        throw new Error(overviewJson.error ?? 'Failed loading finance overview');
      }

      if (!txRes.ok || !txJson.data) {
        throw new Error(txJson.error ?? 'Failed loading finance transactions');
      }

      if (!revRecRes.ok || !revRecJson.data) {
        throw new Error(revRecJson.error ?? 'Failed loading revenue recognition summary');
      }

      if (!alertsRes.ok || !alertsJson.data) {
        throw new Error(alertsJson.error ?? 'Failed loading finance alerts');
      }

      if (!exceptionsRes.ok || !exceptionsJson.data) {
        throw new Error(exceptionsJson.error ?? 'Failed loading finance exceptions');
      }

      if (!forecastRes.ok || !forecastJson.data) {
        throw new Error(forecastJson.error ?? 'Failed loading finance forecast');
      }

      if (!webhookRes.ok || !webhookJson.data) {
        throw new Error(webhookJson.error ?? 'Failed loading webhook health');
      }

      if (!autopayRes.ok || !autopayJson.data) {
        throw new Error(autopayJson.error ?? 'Failed loading autopay consent summary');
      }

      setOverview(overviewJson.data);
      setRevenueRecognition(revRecJson.data);
      setTransactions(txJson.data);
      setAlerts(alertsJson.data);
      setExceptions(exceptionsJson.data);
      setForecast(forecastJson.data);
      setWebhookHealth(webhookJson.data);
      setAutopayConsents(autopayJson.data);
      setStripeCapabilityFlags(
        settingsJson.data?.stripeCapabilityFlags ?? defaultStripeCapabilityFlags(),
      );
      setEvaluatedAt(Date.now());
      setState({ loading: false, error: '' });
    } catch (error) {
      setOverview(null);
      setRevenueRecognition(null);
      setTransactions(null);
      setAlerts(null);
      setExceptions(null);
      setForecast(null);
      setWebhookHealth(null);
      setAutopayConsents(null);
      setStripeCapabilityFlags(defaultStripeCapabilityFlags());
      setEvaluatedAt(Date.now());
      setState({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed loading finance data',
      });
    }
  }, [endDate, search, startDate, status]);

  useEffect(() => {
     
    void loadData();
  }, [loadData]);

  const exportHref = useMemo(() => {
    const normalizedStartDate = normalizeDateForApi(startDate);
    const normalizedEndDate = normalizeDateForApi(endDate);

    const params = new URLSearchParams({
      startDate: normalizedStartDate,
      endDate: normalizedEndDate,
      ...(status !== 'all' ? { status } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
    });
    return `/api/admin/finance/export?${params}`;
  }, [endDate, search, startDate, status]);

  const appliedRangeLabel = useMemo(() => {
    const normalizedStartDate = normalizeDateForApi(startDate);
    const normalizedEndDate = normalizeDateForApi(endDate);
    return `${normalizedStartDate || 'unset'} to ${normalizedEndDate || 'unset'}`;
  }, [endDate, startDate]);

  const latestDataGeneratedAt = useMemo(() => {
    const generatedAtValues = [
      overview?.generatedAt,
      revenueRecognition?.generatedAt,
      transactions?.generatedAt,
      alerts?.generatedAt,
      exceptions?.generatedAt,
      forecast?.generatedAt,
      autopayConsents?.generatedAt,
    ].filter(Boolean) as string[];

    if (generatedAtValues.length === 0) return null;

    return generatedAtValues.reduce((latest, current) => {
      return new Date(current).getTime() > new Date(latest).getTime()
        ? current
        : latest;
    });
  }, [
    alerts,
    autopayConsents,
    exceptions,
    forecast,
    overview,
    revenueRecognition,
    transactions,
  ]);

  const dataAgeMinutes = useMemo(() => {
    if (!latestDataGeneratedAt || evaluatedAt === null) return null;
    const ms = evaluatedAt - new Date(latestDataGeneratedAt).getTime();
    return Math.max(0, Math.floor(ms / 60000));
  }, [latestDataGeneratedAt, evaluatedAt]);

  const latestAutopayConsentUpdatedAt = useMemo(() => {
    if (!autopayConsents || autopayConsents.rows.length === 0) {
      return null;
    }

    return autopayConsents.rows.reduce((latest, row) => {
      return new Date(row.updatedAt).getTime() > new Date(latest).getTime()
        ? row.updatedAt
        : latest;
    }, autopayConsents.rows[0].updatedAt);
  }, [autopayConsents]);

  const dataIsStale = (dataAgeMinutes ?? 0) >= 10;
  const stripeOpsEnabled =
    stripeCapabilityFlags.billingSubscriptionsEnabled ||
    stripeCapabilityFlags.customerPortalEnabled ||
    stripeCapabilityFlags.taxEnabled ||
    stripeCapabilityFlags.disputesEnabled ||
    stripeCapabilityFlags.radarReviewEnabled ||
    stripeCapabilityFlags.connectEnabled ||
    stripeCapabilityFlags.treasuryEnabled ||
    stripeCapabilityFlags.issuingEnabled ||
    stripeCapabilityFlags.financialConnectionsEnabled ||
    stripeCapabilityFlags.identityEnabled ||
    stripeCapabilityFlags.terminalEnabled;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Finance</h1>
          <p className="text-sm text-muted-foreground">
            View revenue, refunds, taxes, and transaction-level accounting activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadData()} disabled={state.loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button size="sm" asChild>
            <a href={exportHref}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </a>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Button variant="outline" className="h-auto flex-col items-start gap-2 p-4" asChild>
            <Link href="/admin/finance/refunds">
              <CreditCard className="h-5 w-5" />
              <div className="text-left">
                <div className="font-semibold">Refund Console</div>
                <div className="text-xs text-muted-foreground">Process manual refunds</div>
              </div>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto flex-col items-start gap-2 p-4" asChild>
            <Link href="/admin/finance/reconciliation">
              <BarChart3 className="h-5 w-5" />
              <div className="text-left">
                <div className="font-semibold">Reconciliation</div>
                <div className="text-xs text-muted-foreground">Match payouts to transactions</div>
              </div>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto flex-col items-start gap-2 p-4" asChild>
            <Link href="/admin/finance/payouts">
              <DollarSign className="h-5 w-5" />
              <div className="text-left">
                <div className="font-semibold">Payouts</div>
                <div className="text-xs text-muted-foreground">View Stripe payouts</div>
              </div>
            </Link>
          </Button>
          {stripeCapabilityFlags.taxEnabled ? (
            <Button variant="outline" className="h-auto flex-col items-start gap-2 p-4" asChild>
              <Link href="/admin/finance/taxes">
                <FileText className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-semibold">Tax Summary</div>
                  <div className="text-xs text-muted-foreground">Review tax liability</div>
                </div>
              </Link>
            </Button>
          ) : (
            <Button variant="outline" className="h-auto flex-col items-start gap-2 p-4" asChild>
              <Link href="/admin/settings">
                <FileText className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-semibold">Enable Tax Summary</div>
                  <div className="text-xs text-muted-foreground">Stripe Tax capability is disabled</div>
                </div>
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Billing & Customer Portal</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {stripeCapabilityFlags.billingSubscriptionsEnabled ? (
            <Button variant="outline" className="h-auto flex-col items-start gap-2 p-4" asChild>
              <a href={getStripeBillingSubscriptionsUrl()} target="_blank" rel="noopener noreferrer">
                <div className="font-semibold">Subscriptions Console</div>
                <div className="text-xs text-muted-foreground">Manage recurring billing and lifecycle changes</div>
              </a>
            </Button>
          ) : (
            <Button variant="outline" className="h-auto flex-col items-start gap-2 p-4" asChild>
              <Link href="/admin/settings">
                <div className="font-semibold">Enable Subscriptions</div>
                <div className="text-xs text-muted-foreground">Billing subscriptions capability is disabled</div>
              </Link>
            </Button>
          )}

          {stripeCapabilityFlags.customerPortalEnabled ? (
            <Button variant="outline" className="h-auto flex-col items-start gap-2 p-4" asChild>
              <a href={getStripeCustomerPortalConfigUrl()} target="_blank" rel="noopener noreferrer">
                <div className="font-semibold">Customer Portal Config</div>
                <div className="text-xs text-muted-foreground">Review self-service portal settings and policy text</div>
              </a>
            </Button>
          ) : (
            <Button variant="outline" className="h-auto flex-col items-start gap-2 p-4" asChild>
              <Link href="/admin/settings">
                <div className="font-semibold">Enable Customer Portal</div>
                <div className="text-xs text-muted-foreground">Customer portal capability is disabled</div>
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className={dataIsStale ? 'border-amber-200 bg-amber-50' : ''}>
        <CardHeader>
          <CardTitle className="text-base">Data Freshness</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {latestDataGeneratedAt ? (
              <>
                <p className="text-sm">
                  Last synchronized at {formatDate(latestDataGeneratedAt)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Data age: {dataAgeMinutes} minute(s)
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No finance sync timestamp available yet.</p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadData()} disabled={state.loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry Sync
          </Button>
        </CardContent>
      </Card>

      {webhookHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Webhook Operations Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Events (24h)</p>
                <p className="text-xl font-semibold">{webhookHealth.summary.receivedLast24h}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Processed (24h)</p>
                <p className="text-xl font-semibold">{webhookHealth.summary.processedLast24h}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-xl font-semibold">{webhookHealth.summary.pendingCount}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Processed Rate</p>
                <p className="text-xl font-semibold">{webhookHealth.summary.processedRatePercent}%</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Avg Lag</p>
                <p className="text-xl font-semibold">
                  {webhookHealth.summary.avgProcessingLagSeconds === null
                    ? '—'
                    : `${webhookHealth.summary.avgProcessingLagSeconds}s`}
                </p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Recent Events</p>
              {webhookHealth.recentEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No webhook events recorded yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Processed</TableHead>
                        <TableHead>Lag</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {webhookHealth.recentEvents.map((evt) => (
                        <TableRow key={evt.eventId}>
                          <TableCell>
                            <p className="font-medium">{evt.eventType}</p>
                            <p className="text-xs text-muted-foreground">{evt.eventId}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant={evt.status === 'processed' ? 'default' : 'secondary'}>
                              {evt.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(evt.createdAt)}</TableCell>
                          <TableCell>{evt.processedAt ? formatDate(evt.processedAt) : '—'}</TableCell>
                          <TableCell>
                            {evt.processingLagSeconds === null ? '—' : `${evt.processingLagSeconds}s`}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            Stripe Sigma Reports
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!stripeOpsEnabled ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Stripe advanced capabilities are currently disabled. Enable capabilities in settings to unlock Sigma report shortcuts.
              <div className="mt-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/admin/settings">Open Settings</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-3">
              <Button variant="outline" size="sm" asChild>
                <a href={getStripeReconciliationReportUrl('payout')} target="_blank" rel="noopener noreferrer">
                  Payout Reconciliation
                  <ExternalLink className="ml-2 h-3 w-3" />
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={getStripeReconciliationReportUrl('balance')} target="_blank" rel="noopener noreferrer">
                  Balance Change Report
                  <ExternalLink className="ml-2 h-3 w-3" />
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={getStripeSigmaUrl()} target="_blank" rel="noopener noreferrer">
                  All Sigma Queries
                  <ExternalLink className="ml-2 h-3 w-3" />
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Start Date</p>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">End Date</p>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Status</p>
            <Select value={status} onValueChange={(value) => setStatus(value as 'all' | FinanceTransactionStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 lg:col-span-2">
            <p className="text-xs text-muted-foreground">Search</p>
            <Input
              placeholder="Booking, customer, or Stripe ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="lg:col-span-5">
            <Button onClick={() => void loadData()} disabled={state.loading}>
              Apply Filters
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Applied range: {appliedRangeLabel} (by booking check-in date)
            </p>
          </div>
        </CardContent>
      </Card>

      {state.loading && (
        <div className="py-10">
          <AdminLoadingState message="Loading finance data…" />
        </div>
      )}

      {state.error ? (
        <AdminErrorState
          title="Finance data unavailable"
          message={state.error}
          action={{
            label: 'Retry Finance Load',
            onAction: () => {
              void loadData();
            },
          }}
        />
      ) : null}

      {!state.loading && !state.error && overview && revenueRecognition && transactions && alerts && exceptions && forecast && autopayConsents && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Owner Command Center</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium">Actionable Alerts</p>
                  <p className="text-xs text-muted-foreground">{alerts.alerts.length} active</p>
                </div>
                {alerts.alerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active owner alerts right now.</p>
                ) : (
                  <div className="space-y-2">
                    {alerts.alerts.map((alert) => (
                      <div key={alert.id} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="mb-1 flex items-center gap-2">
                            <Badge variant={severityBadgeVariant(alert.severity)}>{alert.severity}</Badge>
                            <p className="font-medium">{alert.title}</p>
                          </div>
                          <p className="text-sm text-muted-foreground">{alert.description}</p>
                        </div>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={alert.actionHref}>{alert.actionLabel}</Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">30-Day Expected Cash In</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">{formatCurrency(forecast.totals.expectedCashIn)}</CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Projected Refunds</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">{formatCurrency(forecast.totals.expectedRefunds)}</CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Expected Net Cash</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">{formatCurrency(forecast.totals.expectedNet)}</CardContent>
                </Card>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Autopay Profiles</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">{autopayConsents.totals.profiles}</CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Autopay Enabled</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">{autopayConsents.totals.enabled}</CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Incidentals Authorized</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">{autopayConsents.totals.incidentalsAuthorized}</CardContent>
                </Card>
              </div>

              <p className="text-xs text-muted-foreground">
                Latest autopay consent update:{" "}
                {latestAutopayConsentUpdatedAt
                  ? formatDate(latestAutopayConsentUpdatedAt)
                  : "No consent updates recorded."}
              </p>

              <div>
                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium">Recent Autopay Profiles</p>
                  <p className="text-xs text-muted-foreground">
                    Showing up to 5 most recent updates
                  </p>
                </div>
                {autopayConsents.rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No autopay consent profiles recorded yet.
                  </p>
                ) : (
                  <>
                    <div className="space-y-3 md:hidden">
                      {autopayConsents.rows.slice(0, 5).map((row) => (
                        <Card key={`${row.userId}:${row.updatedAt}`} className="rounded-2xl border-border/70 shadow-none">
                          <CardContent className="space-y-3 p-4">
                            <div>
                              <p className="font-medium">{row.customerName || 'Unknown customer'}</p>
                              <p className="text-xs text-muted-foreground">{row.customerEmail || row.userId}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant={row.enabled ? 'default' : 'secondary'}>
                                {row.enabled ? 'autopay enabled' : 'autopay disabled'}
                              </Badge>
                              <Badge variant={row.allowIncidentals ? 'default' : 'outline'}>
                                {row.allowIncidentals ? 'incidentals authorized' : 'incidentals blocked'}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">Updated {formatDate(row.updatedAt)}</p>
                            <Button size="sm" variant="outline" asChild>
                              <Link href={row.bookingsSearchHref}>Open Bookings</Link>
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <div className="hidden md:block overflow-x-auto rounded-md border">
                      <Table className="min-w-[760px]">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Autopay</TableHead>
                            <TableHead>Incidentals</TableHead>
                            <TableHead>Updated</TableHead>
                            <TableHead>Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {autopayConsents.rows.slice(0, 5).map((row) => (
                            <TableRow key={`${row.userId}:${row.updatedAt}`}>
                              <TableCell>
                                <p className="font-medium">
                                  {row.customerName || "Unknown customer"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {row.customerEmail || row.userId}
                                </p>
                              </TableCell>
                              <TableCell>
                                <Badge variant={row.enabled ? 'default' : 'secondary'}>
                                  {row.enabled ? 'enabled' : 'disabled'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={row.allowIncidentals ? 'default' : 'outline'}>
                                  {row.allowIncidentals ? 'authorized' : 'not authorized'}
                                </Badge>
                              </TableCell>
                              <TableCell>{formatDate(row.updatedAt)}</TableCell>
                              <TableCell>
                                <Button size="sm" variant="ghost" asChild>
                                  <Link href={row.bookingsSearchHref}>Open Bookings</Link>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </div>

              <div>
                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium">Exception Queue</p>
                  <p className="text-xs text-muted-foreground">{exceptions.totalExceptions} total</p>
                </div>
                {exceptions.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No exceptions in the queue.</p>
                ) : (
                  <>
                    <div className="space-y-3 md:hidden">
                      {exceptions.items.slice(0, 8).map((item) => (
                        <Card key={item.id} className="rounded-2xl border-border/70 shadow-none">
                          <CardContent className="space-y-3 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <p className="font-medium capitalize">{item.type.replaceAll('_', ' ')}</p>
                              <Badge variant="outline">{item.ageDays}d</Badge>
                            </div>
                            <div>
                              <p className="text-sm font-medium">{item.bookingNumber}</p>
                              <p className="text-xs text-muted-foreground">{item.customerName}</p>
                              <p className="text-xs text-muted-foreground">{item.customerEmail}</p>
                            </div>
                            <p className="text-sm font-semibold">{formatCurrency(item.amount)}</p>
                            <Button size="sm" variant="outline" asChild>
                              <Link href={item.actionHref}>Open</Link>
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <div className="hidden md:block overflow-x-auto rounded-md border">
                      <Table className="min-w-[760px]">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Booking</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Age</TableHead>
                            <TableHead>Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {exceptions.items.slice(0, 8).map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="capitalize">{item.type.replaceAll('_', ' ')}</TableCell>
                              <TableCell>{item.bookingNumber}</TableCell>
                              <TableCell>
                                <p>{item.customerName}</p>
                                <p className="text-xs text-muted-foreground">{item.customerEmail}</p>
                              </TableCell>
                              <TableCell>{formatCurrency(item.amount)}</TableCell>
                              <TableCell>{item.ageDays}d</TableCell>
                              <TableCell>
                                <Button size="sm" variant="ghost" asChild>
                                  <Link href={item.actionHref}>Open</Link>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </div>

              <div>
                <p className="mb-3 text-sm font-medium">7-Day Forecast Snapshot</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
                  {forecast.days.slice(0, 7).map((day) => (
                    <div key={day.date} className="rounded-md border p-2">
                      <p className="text-xs text-muted-foreground">{formatShortDate(day.date)}</p>
                      <p className="text-sm font-medium">{formatCurrency(day.expectedNet)}</p>
                      <p className="text-xs text-muted-foreground">{day.bookingCount} booking(s)</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Gross Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{formatCurrency(overview.totals.grossRevenue)}</div>
                <div className="text-xs text-muted-foreground mt-1">Before refunds</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  Refunds
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{formatCurrency(overview.totals.refunds)}</div>
                <div className="text-xs text-muted-foreground mt-1">Total refunded</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  Net Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{formatCurrency(overview.totals.netRevenue)}</div>
                <div className="text-xs text-muted-foreground mt-1">After refunds</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-600" />
                  Tax Collected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{formatCurrency(overview.totals.taxesCollected)}</div>
                <div className="text-xs text-muted-foreground mt-1">Sales tax liability</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  Pending Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{formatCurrency(overview.totals.outstandingPending)}</div>
                <div className="text-xs text-muted-foreground mt-1">Awaiting settlement</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Deferred Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{formatCurrency(revenueRecognition.totals.deferredRevenue)}</div>
                <div className="text-xs text-muted-foreground mt-1">Not yet recognized</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Recognized Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{formatCurrency(revenueRecognition.totals.recognizedRevenue)}</div>
                <div className="text-xs text-muted-foreground mt-1">Recognized in period</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Reversed Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{formatCurrency(revenueRecognition.totals.reversedRevenue)}</div>
                <div className="text-xs text-muted-foreground mt-1">Refund/correction reversals</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Excluded Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{formatCurrency(revenueRecognition.totals.excludedRevenue)}</div>
                <div className="text-xs text-muted-foreground mt-1">Excluded by rules</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">RevRec Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{revenueRecognition.totals.transactionCount}</div>
                <div className="text-xs text-muted-foreground mt-1">In selected period</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue Recognition Status Mix</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {revenueRecognition.byRecognitionStatus.map((item) => (
                <div key={item.status} className="rounded-md border p-3">
                  <div className="mb-2">
                    <Badge variant={recognitionBadgeVariant(item.status)}>{item.status.replaceAll('_', ' ')}</Badge>
                  </div>
                  <p className="text-lg font-semibold">{item.count}</p>
                  <p className="text-sm text-muted-foreground">{formatCurrency(item.amount)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Transaction Status Mix</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {overview.byStatus.map((item) => (
                <div key={item.status} className="rounded-md border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.status}</p>
                  <p className="text-lg font-semibold">{item.count}</p>
                  <p className="text-sm text-muted-foreground">{formatCurrency(item.amount)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Transactions ({transactions.summary.filteredTransactions}/{transactions.summary.totalTransactions})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No transactions found for this filter set.</p>
              ) : (
                <>
                  <div className="space-y-3 md:hidden">
                    {transactions.rows.map((row) => (
                      <Card key={row.id} className="rounded-2xl border-border/70 shadow-none">
                        <CardContent
                          className="space-y-3 p-4"
                          onClick={() => setSelectedPaymentId(row.id)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium">{row.bookingNumber}</p>
                              <p className="text-xs text-muted-foreground truncate">{row.stripePaymentId ?? 'no processor id'}</p>
                            </div>
                            <Badge variant={statusBadgeVariant(row.status)}>{row.status}</Badge>
                          </div>
                          <div>
                            <p className="text-sm">{row.customerName}</p>
                            <p className="text-xs text-muted-foreground">{row.customerEmail}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Amount</p>
                              <p className="mt-1">{formatCurrency(row.amount)}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Refund</p>
                              <p className="mt-1">{formatCurrency(row.refundAmount)}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Method</p>
                              <p className="mt-1 capitalize">{row.paymentMethod.replace('_', ' ')}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Created</p>
                              <p className="mt-1">{formatDate(row.createdAt)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="hidden md:block overflow-x-auto">
                    <Table className="min-w-[980px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Booking</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Refund</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Flow</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.rows.map((row) => (
                          <TableRow 
                            key={row.id}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => setSelectedPaymentId(row.id)}
                          >
                            <TableCell>
                              <p className="font-medium">{row.bookingNumber}</p>
                              <p className="text-xs text-muted-foreground">{row.stripePaymentId ?? 'no processor id'}</p>
                            </TableCell>
                            <TableCell>
                              <p>{row.customerName}</p>
                              <p className="text-xs text-muted-foreground">{row.customerEmail}</p>
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusBadgeVariant(row.status)}>{row.status}</Badge>
                            </TableCell>
                            <TableCell>{formatCurrency(row.amount)}</TableCell>
                            <TableCell>{formatCurrency(row.refundAmount)}</TableCell>
                            <TableCell className="capitalize">{row.paymentMethod.replace('_', ' ')}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <Badge variant="outline" className="capitalize">
                                  {row.paymentMode.replace('_', ' ')}
                                </Badge>
                                <p className="text-xs text-muted-foreground">
                                  {row.stripeSourceType.replace('_', ' ')}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>{formatDate(row.createdAt)}</TableCell>
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

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        paymentId={selectedPaymentId ?? ''}
        isOpen={!!selectedPaymentId}
        onClose={() => setSelectedPaymentId(null)}
      />
    </div>
  );
}
