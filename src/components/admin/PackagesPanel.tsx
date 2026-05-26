'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { formatDateTimeUtc, formatDateUtc } from '@/lib/datetime-format';

type CustomerPackageItem = {
  id: string;
  purchaseDate: string;
  expiresAt: string;
  sessionsUsed: number;
  sessionsRemaining: number;
  status: 'active' | 'expired' | 'fully_used' | 'cancelled';
  user: {
    id: string;
    name: string | null;
    email: string;
  };
};

type PackageItem = {
  id: string;
  name: string;
  type: string;
  totalSessions: number;
  price: number;
  validDays: number;
  description: string | null;
  isActive: boolean;
  customerPackages: CustomerPackageItem[];
};

type PackageAdjustmentDraft = {
  extensionDays: string;
  sessionAdjustment: string;
  status: CustomerPackageItem['status'];
};

type PackageAuditEvent = {
  id: string;
  actorName: string;
  sentAt: string;
  payload: {
    eventType: 'PACKAGE_GRANTED' | 'PACKAGE_UPDATED';
    customerPackageId: string;
    targetUserId: string;
    packageId: string;
    metadata: Record<string, unknown>;
    timestamp: string;
  };
};

export function PackagesPanel() {
  const [rows, setRows] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGranting, setIsGranting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [grantEmail, setGrantEmail] = useState('');
  const [grantPackageId, setGrantPackageId] = useState('');
  const [auditEvents, setAuditEvents] = useState<PackageAuditEvent[]>([]);
  const [drafts, setDrafts] = useState<Record<string, PackageAdjustmentDraft>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function loadPackages() {
    try {
      setLoading(true);
      setError(null);
      const [packagesResponse, auditResponse] = await Promise.all([
        fetch('/api/admin/packages'),
        fetch('/api/admin/packages/audit?limit=40'),
      ]);
      if (!packagesResponse.ok || !auditResponse.ok) throw new Error('Failed to load packages');
      const packagesPayload = (await packagesResponse.json()) as { data?: PackageItem[] };
      const auditPayload = (await auditResponse.json()) as { data?: PackageAuditEvent[] };
      setRows(packagesPayload.data ?? []);
      setAuditEvents(auditPayload.data ?? []);
      setGrantPackageId((current) => current || packagesPayload.data?.[0]?.id || '');
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPackages();
  }, []);

  const updateDraft = (customerPackage: CustomerPackageItem, patch: Partial<PackageAdjustmentDraft>) => {
    setDrafts((current) => ({
      ...current,
      [customerPackage.id]: {
        extensionDays: current[customerPackage.id]?.extensionDays ?? '',
        sessionAdjustment: current[customerPackage.id]?.sessionAdjustment ?? '',
        status: current[customerPackage.id]?.status ?? customerPackage.status,
        ...patch,
      },
    }));
  };

  async function applyCustomerPackageUpdate(customerPackage: CustomerPackageItem) {
    const draft = drafts[customerPackage.id] ?? {
      extensionDays: '',
      sessionAdjustment: '',
      status: customerPackage.status,
    };

    const payload: Record<string, number | string> = {};
    if (draft.extensionDays !== '') payload.extensionDays = Number(draft.extensionDays);
    if (draft.sessionAdjustment !== '') payload.sessionAdjustment = Number(draft.sessionAdjustment);
    if (draft.status !== customerPackage.status) payload.status = draft.status;

    if (Object.keys(payload).length === 0) {
      setError('Enter an extension, session adjustment, or status change before applying updates.');
      return;
    }

    try {
      setUpdatingId(customerPackage.id);
      setError(null);
      const response = await fetch(`/api/admin/customer-packages/${customerPackage.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? 'Failed to update customer package');
      }

      setDrafts((current) => {
        const next = { ...current };
        delete next[customerPackage.id];
        return next;
      });
      await loadPackages();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update customer package');
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredRows = rows.filter((pkg) => {
    const search = query.trim().toLowerCase();
    if (!search) return true;

    return (
      pkg.name.toLowerCase().includes(search) ||
      pkg.type.toLowerCase().includes(search) ||
      pkg.customerPackages.some((customerPackage) =>
        `${customerPackage.user.name ?? ''} ${customerPackage.user.email}`.toLowerCase().includes(search),
      )
    );
  });

  async function onSubmit(formData: FormData) {
    setError(null);
    setIsSaving(true);

    const payload = {
      name: String(formData.get('name') ?? ''),
      type: String(formData.get('type') ?? 'daycare_pass'),
      totalSessions: Number(formData.get('totalSessions') ?? 1),
      price: Number(formData.get('price') ?? 0),
      validDays: Number(formData.get('validDays') ?? 30),
      description: String(formData.get('description') ?? ''),
      isActive: true,
    };

    try {
      const response = await fetch('/api/admin/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? 'Failed to create package');
      }

      await loadPackages();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to create package');
    } finally {
      setIsSaving(false);
    }
  }

  async function onGrantSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsGranting(true);
      setError(null);

      const response = await fetch('/api/admin/customer-packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: grantEmail,
          packageId: grantPackageId,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? 'Failed to grant package');
      }

      setGrantEmail('');
      await loadPackages();
    } catch (grantError) {
      setError(grantError instanceof Error ? grantError.message : 'Failed to grant package');
    } finally {
      setIsGranting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Packages</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create and manage daycare package products and availability.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Package</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={onSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Package Name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select id="type" name="type" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue="daycare_pass">
                <option value="daycare_pass">Daycare Pass</option>
                <option value="boarding_bundle">Boarding Bundle</option>
                <option value="monthly_unlimited">Monthly Unlimited</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalSessions">Total Sessions</Label>
              <Input id="totalSessions" name="totalSessions" type="number" min={1} defaultValue={10} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price (USD)</Label>
              <Input id="price" name="price" type="number" min={0} step="0.01" defaultValue={250} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validDays">Valid Days</Label>
              <Input id="validDays" name="validDays" type="number" min={1} defaultValue={90} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={3} />
            </div>

            {error ? <p className="md:col-span-2 text-sm text-destructive">{error}</p> : null}

            <div className="md:col-span-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Create Package'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Package Audit Trail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {auditEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No package override audit events yet.</p>
          ) : (
            auditEvents.map((event) => (
              <div key={event.id} className="rounded-md border px-3 py-2 text-sm">
                <p className="font-medium">
                  {event.payload.eventType === 'PACKAGE_GRANTED' ? 'Package granted' : 'Package updated'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTimeUtc(event.sentAt)} · {event.actorName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Package ID {event.payload.packageId} · Customer package {event.payload.customerPackageId}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Grant Package To Customer</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(event) => void onGrantSubmit(event)} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="grant-email">Customer Email</Label>
              <Input
                id="grant-email"
                type="email"
                value={grantEmail}
                onChange={(event) => setGrantEmail(event.target.value)}
                placeholder="customer@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grant-package">Package</Label>
              <select
                id="grant-package"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={grantPackageId}
                onChange={(event) => setGrantPackageId(event.target.value)}
                required
              >
                <option value="" disabled>
                  Select a package
                </option>
                {rows.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} · {pkg.totalSessions} sessions · ${pkg.price.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 flex items-center gap-3">
              <Button type="submit" disabled={isGranting || !grantPackageId}>
                {isGranting ? 'Granting...' : 'Grant Package'}
              </Button>
              <p className="text-sm text-muted-foreground">
                Grants the package immediately using its configured validity window and session balance.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Packages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="package-search">Search packages or owners</Label>
            <Input
              id="package-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by package name, type, owner, or email"
            />
          </div>
          {loading ? <p>Loading packages...</p> : null}
          {!loading && filteredRows.length === 0 ? <p>No packages match the current search.</p> : null}
          {filteredRows.map((pkg) => (
            <div key={pkg.id} className="rounded-md border px-3 py-3 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{pkg.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {pkg.type} · {pkg.totalSessions} sessions · valid {pkg.validDays} days · {pkg.customerPackages.length} recent assignment{pkg.customerPackages.length === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">${pkg.price.toFixed(2)}</Badge>
                  <Badge variant={pkg.isActive ? 'default' : 'secondary'}>
                    {pkg.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>

              {pkg.description ? <p className="text-sm text-muted-foreground">{pkg.description}</p> : null}

              {pkg.customerPackages.length > 0 ? (
                <>
                  <div className="space-y-3 md:hidden">
                    {pkg.customerPackages.map((customerPackage) => {
                      const draft = drafts[customerPackage.id] ?? {
                        extensionDays: '',
                        sessionAdjustment: '',
                        status: customerPackage.status,
                      };

                      return (
                        <Card key={customerPackage.id} className="rounded-2xl border-border/70 shadow-none">
                          <CardContent className="space-y-3 p-4">
                            <div>
                              <p className="font-medium">{customerPackage.user.name || 'Unknown owner'}</p>
                              <p className="text-xs text-muted-foreground">{customerPackage.user.email}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Used</p>
                                <p className="mt-1">{customerPackage.sessionsUsed}</p>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Remaining</p>
                                <p className="mt-1">{customerPackage.sessionsRemaining}</p>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Expires</p>
                                <p className="mt-1">{formatDateUtc(customerPackage.expiresAt)}</p>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Purchased</p>
                                <p className="mt-1">{formatDateUtc(customerPackage.purchaseDate)}</p>
                              </div>
                            </div>

                            <Badge variant={customerPackage.status === 'active' ? 'default' : 'secondary'}>
                              {customerPackage.status}
                            </Badge>

                            <div className="space-y-2">
                              <Label htmlFor={`mobile-extension-${customerPackage.id}`}>Extend days</Label>
                              <Input
                                id={`mobile-extension-${customerPackage.id}`}
                                type="number"
                                min={0}
                                value={draft.extensionDays}
                                onChange={(event) =>
                                  updateDraft(customerPackage, { extensionDays: event.target.value })
                                }
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`mobile-adjust-${customerPackage.id}`}>Adjust sessions</Label>
                              <Input
                                id={`mobile-adjust-${customerPackage.id}`}
                                type="number"
                                value={draft.sessionAdjustment}
                                onChange={(event) =>
                                  updateDraft(customerPackage, { sessionAdjustment: event.target.value })
                                }
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`mobile-status-${customerPackage.id}`}>Status</Label>
                              <select
                                id={`mobile-status-${customerPackage.id}`}
                                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                                value={draft.status}
                                onChange={(event) =>
                                  updateDraft(customerPackage, {
                                    status: event.target.value as CustomerPackageItem['status'],
                                  })
                                }
                              >
                                <option value="active">Active</option>
                                <option value="expired">Expired</option>
                                <option value="fully_used">Fully Used</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </div>

                            <Button
                              type="button"
                              variant="outline"
                              disabled={updatingId === customerPackage.id}
                              onClick={() => void applyCustomerPackageUpdate(customerPackage)}
                            >
                              {updatingId === customerPackage.id ? 'Applying...' : 'Apply'}
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Owner</TableHead>
                          <TableHead>Usage</TableHead>
                          <TableHead>Expires</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Admin Controls</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pkg.customerPackages.map((customerPackage) => {
                          const draft = drafts[customerPackage.id] ?? {
                            extensionDays: '',
                            sessionAdjustment: '',
                            status: customerPackage.status,
                          };

                          return (
                            <TableRow key={customerPackage.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{customerPackage.user.name || 'Unknown owner'}</p>
                                  <p className="text-xs text-muted-foreground">{customerPackage.user.email}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <p>Used {customerPackage.sessionsUsed}</p>
                                  <p className="text-muted-foreground">Remaining {customerPackage.sessionsRemaining}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <p>{formatDateUtc(customerPackage.expiresAt)}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Purchased {formatDateUtc(customerPackage.purchaseDate)}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={customerPackage.status === 'active' ? 'default' : 'secondary'}>
                                  {customerPackage.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="min-w-[420px]">
                                <div className="grid gap-2 md:grid-cols-[100px_120px_1fr_auto] md:items-end">
                                  <div className="space-y-1">
                                    <Label htmlFor={`extension-${customerPackage.id}`}>Extend days</Label>
                                    <Input
                                      id={`extension-${customerPackage.id}`}
                                      type="number"
                                      min={0}
                                      value={draft.extensionDays}
                                      onChange={(event) =>
                                        updateDraft(customerPackage, { extensionDays: event.target.value })
                                      }
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label htmlFor={`adjust-${customerPackage.id}`}>Adjust sessions</Label>
                                    <Input
                                      id={`adjust-${customerPackage.id}`}
                                      type="number"
                                      value={draft.sessionAdjustment}
                                      onChange={(event) =>
                                        updateDraft(customerPackage, { sessionAdjustment: event.target.value })
                                      }
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label htmlFor={`status-${customerPackage.id}`}>Status</Label>
                                    <select
                                      id={`status-${customerPackage.id}`}
                                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                                      value={draft.status}
                                      onChange={(event) =>
                                        updateDraft(customerPackage, {
                                          status: event.target.value as CustomerPackageItem['status'],
                                        })
                                      }
                                    >
                                      <option value="active">Active</option>
                                      <option value="expired">Expired</option>
                                      <option value="fully_used">Fully Used</option>
                                      <option value="cancelled">Cancelled</option>
                                    </select>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    disabled={updatingId === customerPackage.id}
                                    onClick={() => void applyCustomerPackageUpdate(customerPackage)}
                                  >
                                    {updatingId === customerPackage.id ? 'Applying...' : 'Apply'}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No customer packages purchased for this product yet.</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
