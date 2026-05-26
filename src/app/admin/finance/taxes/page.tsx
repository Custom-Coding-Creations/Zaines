'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Loader2 } from 'lucide-react';
import type { FinanceTaxSummaryResponse } from '@/types/finance';

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
  startDate.setDate(startDate.getDate() - 180);
  return {
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10),
  };
}

export default function FinanceTaxesPage() {
  const defaults = useMemo(() => defaultDateRange(), []);
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [data, setData] = useState<FinanceTaxSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({ startDate, endDate });
      const res = await fetch(`/api/admin/finance/taxes?${params}`, { cache: 'no-store' });
      const payload = (await res.json()) as {
        success?: boolean;
        data?: FinanceTaxSummaryResponse;
        error?: string;
      };

      if (!res.ok || !payload.data) {
        throw new Error(payload.error ?? 'Failed loading tax summary');
      }

      setData(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed loading tax summary');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const exportHref = useMemo(() => {
    const params = new URLSearchParams({ startDate, endDate });
    return `/api/admin/finance/taxes/export?${params}`;
  }, [endDate, startDate]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tax Liability</h1>
          <p className="text-sm text-muted-foreground">
            Review tax collected, refunded tax, and net liability by period.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button variant="outline" asChild>
            <Link href="/admin/finance">Back to Finance</Link>
          </Button>
          <Button asChild>
            <a href={exportHref}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </a>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Range</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <Button onClick={() => void loadData()} disabled={loading} className="sm:w-auto">Apply</Button>
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
                <CardTitle className="text-sm">Taxable Revenue</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{formatCurrency(data.totals.taxableRevenue)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Tax Collected</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{formatCurrency(data.totals.taxCollected)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Refunded Tax</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{formatCurrency(data.totals.refundedTax)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Net Tax Liability</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{formatCurrency(data.totals.netTaxLiability)}</CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Period Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {data.rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tax rows found for this range.</p>
              ) : (
                <>
                  <div className="space-y-3 md:hidden">
                    {data.rows.map((row) => (
                      <Card key={row.period} className="rounded-2xl border-border/70 shadow-none">
                        <CardContent className="space-y-3 p-4">
                          <p className="font-semibold">{row.period}</p>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Taxable Revenue</p>
                              <p className="mt-1">{formatCurrency(row.taxableRevenue)}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Tax Collected</p>
                              <p className="mt-1">{formatCurrency(row.taxCollected)}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Refunded Tax</p>
                              <p className="mt-1">{formatCurrency(row.refundedTax)}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Net Liability</p>
                              <p className="mt-1 font-semibold">{formatCurrency(row.netTaxLiability)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="hidden md:block">
                    <Table className="min-w-[760px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Period</TableHead>
                          <TableHead>Taxable Revenue</TableHead>
                          <TableHead>Tax Collected</TableHead>
                          <TableHead>Refunded Tax</TableHead>
                          <TableHead>Net Tax Liability</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.rows.map((row) => (
                          <TableRow key={row.period}>
                            <TableCell>{row.period}</TableCell>
                            <TableCell>{formatCurrency(row.taxableRevenue)}</TableCell>
                            <TableCell>{formatCurrency(row.taxCollected)}</TableCell>
                            <TableCell>{formatCurrency(row.refundedTax)}</TableCell>
                            <TableCell>{formatCurrency(row.netTaxLiability)}</TableCell>
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
