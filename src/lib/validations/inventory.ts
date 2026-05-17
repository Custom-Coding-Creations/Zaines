import { z } from 'zod';

export const inventoryItemSchema = z.object({
  name: z.string().min(1).max(150),
  category: z.enum(['food', 'treats', 'cleaning', 'medical', 'supplies']),
  unit: z.string().min(1).max(50),
  currentStock: z.number().min(0),
  reorderLevel: z.number().min(0),
  reorderQuantity: z.number().min(0),
  costPerUnit: z.number().min(0).optional(),
  supplier: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  isActive: z.boolean().default(true),
});

export const inventoryItemUpdateSchema = inventoryItemSchema
  .partial()
  .refine((payload) => Object.keys(payload).length > 0, 'At least one field is required');

export const inventoryLogSchema = z.object({
  itemId: z.string().min(1),
  changeType: z.enum(['restock', 'used', 'adjustment', 'waste']),
  quantity: z.number(),
  performedBy: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

export type InventoryItemInput = z.infer<typeof inventoryItemSchema>;
export type InventoryItemUpdateInput = z.infer<typeof inventoryItemUpdateSchema>;
export type InventoryLogInput = z.infer<typeof inventoryLogSchema>;
