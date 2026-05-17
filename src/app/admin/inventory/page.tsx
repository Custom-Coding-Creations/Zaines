'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type InventoryLog = {
  id: string;
  changeType: string;
  quantity: number;
  performedBy: string | null;
  notes: string | null;
  createdAt: string;
};

type InventoryItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  reorderLevel: number;
  reorderQuantity: number;
  costPerUnit: number | null;
  supplier: string | null;
  notes: string | null;
  isActive: boolean;
  logs: InventoryLog[];
};

export default function AdminInventoryPage() {
  const [rows, setRows] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stockAdjustments, setStockAdjustments] = useState<Record<string, string>>({});

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/inventory');
      if (!response.ok) throw new Error('Failed to load inventory');
      const payload = (await response.json()) as { data?: InventoryItem[] };
      setRows(payload.data ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  async function createItem(formData: FormData) {
    try {
      setSaving(true);
      setError(null);
      const payload = {
        name: String(formData.get('name') ?? ''),
        category: String(formData.get('category') ?? 'supplies'),
        unit: String(formData.get('unit') ?? ''),
        currentStock: Number(formData.get('currentStock') ?? 0),
        reorderLevel: Number(formData.get('reorderLevel') ?? 0),
        reorderQuantity: Number(formData.get('reorderQuantity') ?? 0),
        costPerUnit: formData.get('costPerUnit') ? Number(formData.get('costPerUnit')) : undefined,
        supplier: String(formData.get('supplier') ?? ''),
        notes: String(formData.get('notes') ?? ''),
        isActive: true,
      };

      const response = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to create inventory item');
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create inventory item');
    } finally {
      setSaving(false);
    }
  }

  async function applyAdjustment(itemId: string, changeType: 'restock' | 'used') {
    try {
      setError(null);
      const quantity = Number(stockAdjustments[itemId] || 0);
      if (!quantity) {
        throw new Error('Enter a quantity before applying an adjustment');
      }

      const response = await fetch(`/api/admin/inventory/${itemId}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          changeType,
          quantity,
          performedBy: 'staff',
          notes: changeType === 'restock' ? 'Quick restock from admin inventory page' : 'Quick usage adjustment from admin inventory page',
        }),
      });

      if (!response.ok) throw new Error('Failed to update inventory');

      setStockAdjustments((current) => ({ ...current, [itemId]: '' }));
      await load();
    } catch (adjustmentError) {
      setError(adjustmentError instanceof Error ? adjustmentError.message : 'Failed to update inventory');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Inventory</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track consumables, reorder thresholds, and quick stock adjustments.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Inventory Item</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createItem} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select id="category" name="category" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue="supplies">
                <option value="food">Food</option>
                <option value="treats">Treats</option>
                <option value="cleaning">Cleaning</option>
                <option value="medical">Medical</option>
                <option value="supplies">Supplies</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input id="unit" name="unit" placeholder="bag, bottle, count" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentStock">Current Stock</Label>
              <Input id="currentStock" name="currentStock" type="number" min={0} step="0.01" defaultValue={0} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reorderLevel">Reorder Level</Label>
              <Input id="reorderLevel" name="reorderLevel" type="number" min={0} step="0.01" defaultValue={0} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reorderQuantity">Reorder Quantity</Label>
              <Input id="reorderQuantity" name="reorderQuantity" type="number" min={0} step="0.01" defaultValue={0} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="costPerUnit">Cost Per Unit</Label>
              <Input id="costPerUnit" name="costPerUnit" type="number" min={0} step="0.01" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Input id="supplier" name="supplier" />
            </div>
            <div className="space-y-2 md:col-span-2 lg:col-span-3">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={3} />
            </div>
            {error ? <p className="text-sm text-destructive md:col-span-2 lg:col-span-3">{error}</p> : null}
            <div className="md:col-span-2 lg:col-span-3">
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add Inventory Item'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p>Loading inventory...</p> : null}
          {!loading && rows.length === 0 ? <p>No inventory items yet.</p> : null}
          {rows.map((item) => {
            const lowStock = item.currentStock <= item.reorderLevel;
            return (
              <article key={item.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.category} · {item.currentStock} {item.unit} on hand · reorder at {item.reorderLevel}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={lowStock ? 'destructive' : 'outline'}>
                      {lowStock ? 'Low Stock' : 'In Stock'}
                    </Badge>
                    <Badge variant={item.isActive ? 'default' : 'secondary'}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap items-end gap-2">
                  <div className="w-32 space-y-2">
                    <Label htmlFor={`qty-${item.id}`}>Quantity</Label>
                    <Input
                      id={`qty-${item.id}`}
                      type="number"
                      min={0}
                      step="0.01"
                      value={stockAdjustments[item.id] ?? ''}
                      onChange={(event) =>
                        setStockAdjustments((current) => ({
                          ...current,
                          [item.id]: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <Button variant="outline" onClick={() => void applyAdjustment(item.id, 'restock')}>
                    Restock
                  </Button>
                  <Button variant="outline" onClick={() => void applyAdjustment(item.id, 'used')}>
                    Mark Used
                  </Button>
                </div>

                {item.logs.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Recent activity</p>
                    {item.logs.map((log) => (
                      <p key={log.id} className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()} · {log.changeType} {log.quantity}
                        {log.notes ? ` · ${log.notes}` : ''}
                      </p>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}