"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "@/components/admin/AdminAsyncState";

type CrmCustomerSummary = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  loyaltyTier: string;
  totalBookings: number;
  totalSpent: number;
  lastBookingDate: string | null;
  pets: Array<{ id: string; name: string; breed: string }>;
  tags: Array<{ id: string; name: string; color: string }>;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

export function CrmCustomersTable() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [loyaltyTier, setLoyaltyTier] = useState("all");
  const [customers, setCustomers] = useState<CrmCustomerSummary[]>([]);

  async function loadCustomers() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (query.trim()) {
        params.set("query", query.trim());
      }
      if (loyaltyTier !== "all") {
        params.set("loyaltyTier", loyaltyTier);
      }
      params.set("limit", "75");

      const response = await fetch(`/api/admin/crm/customers?${params.toString()}`, {
        cache: "no-store",
      });

      const data = (await response.json()) as {
        customers?: CrmCustomerSummary[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load CRM customers");
      }

      setCustomers(data.customers ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load CRM customers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCustomers();
  }, []);

  const customerCountLabel = useMemo(() => {
    if (customers.length === 1) {
      return "1 customer";
    }

    return `${customers.length} customers`;
  }, [customers]);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Customer CRM Workspace</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/crm/pipeline">Pipeline</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/crm/campaigns">Campaigns</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => void loadCustomers()} disabled={loading}>
              Refresh
            </Button>
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-[1fr_auto_auto] md:items-center">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void loadCustomers();
              }
            }}
            placeholder="Search by name, email, or phone"
          />
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={loyaltyTier}
            onChange={(event) => setLoyaltyTier(event.target.value)}
          >
            <option value="all">All tiers</option>
            <option value="pup">Pup</option>
            <option value="good_dog">Good Dog</option>
            <option value="top_dog">Top Dog</option>
            <option value="vip">VIP</option>
          </select>
          <Button onClick={() => void loadCustomers()} disabled={loading}>
            Search
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{customerCountLabel}</p>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-3">
            <AdminErrorState
              message={error}
              action={{ label: "Retry", onAction: () => void loadCustomers() }}
            />
          </div>
        )}

        {loading ? (
          <AdminLoadingState message="Loading CRM customers..." />
        ) : customers.length === 0 ? (
          <AdminEmptyState
            title="No CRM customers found"
            message="Try a different search query or check that customer accounts exist in the database."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Pets</TableHead>
                  <TableHead>Loyalty</TableHead>
                  <TableHead>Bookings</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Last Booking</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="font-medium">{customer.name ?? customer.email ?? "Unnamed customer"}</div>
                      <div className="text-xs text-muted-foreground">{customer.email ?? "No email"}</div>
                      <div className="text-xs text-muted-foreground">{customer.phone ?? "No phone"}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {customer.pets.length > 0
                        ? customer.pets.map((pet) => pet.name).join(", ")
                        : "No pets"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{customer.loyaltyTier}</Badge>
                    </TableCell>
                    <TableCell>{customer.totalBookings}</TableCell>
                    <TableCell>{formatCurrency(customer.totalSpent)}</TableCell>
                    <TableCell className="text-xs">
                      {customer.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {customer.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag.id} variant="outline">
                              {tag.name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {customer.lastBookingDate
                        ? new Date(customer.lastBookingDate).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/crm/${customer.id}`}>Open 360</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}