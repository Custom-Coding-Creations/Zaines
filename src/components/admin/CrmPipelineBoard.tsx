"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AdminErrorState, AdminLoadingState } from "@/components/admin/AdminAsyncState";

type Stage = "new" | "qualified" | "proposal" | "won" | "lost";

type Opportunity = {
  id: string;
  userId: string;
  ownerUserId: string | null;
  customerName: string | null;
  title: string;
  description: string | null;
  stage: Stage;
  source: string | null;
  estimatedValue: number | null;
  expectedCloseAt: string | null;
  ownerName: string | null;
  createdAt: string;
};

type CustomerLookupResult = {
  id: string;
  name: string | null;
  email: string | null;
};

type Owner = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
};

const stages: Stage[] = ["new", "qualified", "proposal", "won", "lost"];

function formatCurrency(value: number | null): string {
  if (typeof value !== "number") {
    return "-";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);
}

export function CrmPipelineBoard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);

  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerMatches, setCustomerMatches] = useState<CustomerLookupResult[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("");
  const [ownerUserId, setOwnerUserId] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [expectedCloseAt, setExpectedCloseAt] = useState("");

  async function loadOpportunities() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/crm/opportunities?limit=400", { cache: "no-store" });
      const data = (await response.json()) as { opportunities?: Opportunity[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load opportunities");
      }

      setOpportunities(data.opportunities ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load opportunities");
    } finally {
      setLoading(false);
    }
  }

  async function loadOwners() {
    try {
      const response = await fetch("/api/admin/crm/owners?limit=200", { cache: "no-store" });
      const data = (await response.json()) as { owners?: Owner[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load owners");
      }

      setOwners(data.owners ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load owners");
    }
  }

  useEffect(() => {
    void Promise.all([loadOpportunities(), loadOwners()]);
  }, []);

  async function searchCustomers() {
    const query = customerSearch.trim();
    if (query.length < 2) {
      setCustomerMatches([]);
      return;
    }

    try {
      const params = new URLSearchParams({ query, limit: "10" });
      const response = await fetch(`/api/admin/crm/customers?${params.toString()}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        customers?: Array<{ id: string; name: string | null; email: string | null }>;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to search customers");
      }

      setCustomerMatches((data.customers ?? []).map((customer) => ({
        id: customer.id,
        name: customer.name,
        email: customer.email,
      })));
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Unable to search customers");
    }
  }

  async function createOpportunity() {
    if (!customerId.trim() || !title.trim()) {
      setError("Customer ID and title are required to create an opportunity.");
      return;
    }

    const parsedEstimatedValue = estimatedValue.trim() ? Number(estimatedValue) : undefined;
    if (typeof parsedEstimatedValue === "number" && Number.isNaN(parsedEstimatedValue)) {
      setError("Estimated value must be a valid number.");
      return;
    }

    try {
      const response = await fetch("/api/admin/crm/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: customerId.trim(),
          title: title.trim(),
          description: description.trim() || undefined,
          source: source.trim() || undefined,
          ownerUserId: ownerUserId.trim() || undefined,
          estimatedValue: parsedEstimatedValue,
          expectedCloseAt: expectedCloseAt.trim() || undefined,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to create opportunity");
      }

      setCustomerId("");
      setCustomerSearch("");
      setCustomerMatches([]);
      setTitle("");
      setDescription("");
      setSource("");
      setOwnerUserId("");
      setEstimatedValue("");
      setExpectedCloseAt("");
      await loadOpportunities();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create opportunity");
    }
  }

  async function moveOpportunity(opportunityId: string, stage: Stage) {
    try {
      const response = await fetch("/api/admin/crm/opportunities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId, stage }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update stage");
      }

      await loadOpportunities();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update stage");
    }
  }

  const grouped = useMemo(() => {
    return stages.reduce<Record<Stage, Opportunity[]>>(
      (acc, stage) => {
        acc[stage] = opportunities.filter((item) => item.stage === stage);
        return acc;
      },
      {
        new: [],
        qualified: [],
        proposal: [],
        won: [],
        lost: [],
      },
    );
  }, [opportunities]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">CRM Pipeline</h1>
          <p className="text-sm text-muted-foreground">Track and advance sales opportunities.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/crm">Back to CRM</Link>
        </Button>
      </div>

      {error ? <AdminErrorState message={error} action={{ label: "Retry", onAction: () => void loadOpportunities() }} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Create Opportunity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-2">
            <Input placeholder="Customer ID" value={customerId} onChange={(event) => setCustomerId(event.target.value)} />
            <Input placeholder="Opportunity title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <Input
              placeholder="Find customer by name/email"
              value={customerSearch}
              onChange={(event) => setCustomerSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void searchCustomers();
                }
              }}
            />
            <Button variant="outline" onClick={() => void searchCustomers()}>
              Find
            </Button>
          </div>
          {customerMatches.length > 0 ? (
            <div className="rounded-md border p-2 text-sm">
              <p className="mb-2 text-xs text-muted-foreground">Click a customer to set customer ID</p>
              <div className="space-y-1">
                {customerMatches.map((customer) => (
                  <button
                    key={customer.id}
                    className="flex w-full items-center justify-between rounded px-2 py-1 text-left hover:bg-muted"
                    onClick={() => setCustomerId(customer.id)}
                  >
                    <span>{customer.name ?? customer.email ?? customer.id}</span>
                    <span className="text-xs text-muted-foreground">{customer.id}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="grid gap-2 md:grid-cols-3">
            <Input placeholder="Source (web/referral/call)" value={source} onChange={(event) => setSource(event.target.value)} />
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={ownerUserId}
              onChange={(event) => setOwnerUserId(event.target.value)}
            >
              <option value="">Unassigned owner</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {(owner.name ?? owner.email ?? owner.id) + ` (${owner.role})`}
                </option>
              ))}
            </select>
            <Input placeholder="Estimated value" value={estimatedValue} onChange={(event) => setEstimatedValue(event.target.value)} />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <Input placeholder="Expected close (ISO date/time)" value={expectedCloseAt} onChange={(event) => setExpectedCloseAt(event.target.value)} />
          </div>
          <Textarea placeholder="Description" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
          <Button onClick={() => void createOpportunity()}>Create</Button>
        </CardContent>
      </Card>

      {loading ? (
        <AdminLoadingState message="Loading pipeline..." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          {stages.map((stage) => (
            <Card key={stage}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="capitalize">{stage}</span>
                  <Badge variant="outline">{grouped[stage].length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {grouped[stage].map((item) => (
                  <div key={item.id} className="rounded-md border p-3 text-sm">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.customerName ?? item.userId}</p>
                    <p className="text-xs text-muted-foreground">Owner: {item.ownerName ?? "Unassigned"}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(item.estimatedValue)}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {stages
                        .filter((targetStage) => targetStage !== stage)
                        .map((targetStage) => (
                          <Button
                            key={targetStage}
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            onClick={() => void moveOpportunity(item.id, targetStage)}
                          >
                            {targetStage}
                          </Button>
                        ))}
                    </div>
                  </div>
                ))}
                {grouped[stage].length === 0 ? (
                  <p className="text-xs text-muted-foreground">No opportunities.</p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
