'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Save, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useInvalidateSettings } from '@/providers/settings-provider';
import type { ServiceTier, AddOn, ServiceTiersSettings, AddOnsSettings } from '@/types/admin';

function createClientId(prefix: string): string {
  const randomPart = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);
  return `${prefix}-${randomPart}`;
}

// Validation schemas
const serviceTierSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().min(1, 'Description is required').max(500),
  baseNightlyRate: z.number().min(0, 'Price must be positive'),
  capacity: z.number().int().min(1, 'Capacity must be at least 1').max(100),
  imageUrl: z.string().min(1, 'Image URL is required'),
  isActive: z.boolean(),
  displayOrder: z.number().min(0, 'Order must be non-negative'),
});

const addOnSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().min(1, 'Description is required').max(500),
  price: z.number().min(0, 'Price must be positive'),
  applicableTiers: z.array(z.string()).min(1, 'Select at least one service tier'),
  isActive: z.boolean(),
});

const serviceFormSchema = z.object({
  serviceTiers: z.array(serviceTierSchema).min(1, 'At least one service tier is required'),
});

const addOnsFormSchema = z.object({
  addOns: z.array(addOnSchema),
});

interface ServiceTiersAndAddOnsCardProps {
  initialServiceSettings?: ServiceTiersSettings;
  initialAddOnsSettings?: AddOnsSettings;
}

export function ServiceTiersAndAddOnsCard({
  initialServiceSettings,
  initialAddOnsSettings,
}: ServiceTiersAndAddOnsCardProps) {
  const [isLoadingTiers, setIsLoadingTiers] = useState(false);
  const [isLoadingAddOns, setIsLoadingAddOns] = useState(false);
  const [activeTab, setActiveTab] = useState('tiers');
  const invalidateSettings = useInvalidateSettings();

  // Service Tiers Form
  const tiersForm = useForm<z.infer<typeof serviceFormSchema>>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      serviceTiers: initialServiceSettings?.serviceTiers || [],
    },
  });

  const {
    fields: tierFields,
    append: appendTier,
    remove: removeTier,
  } = useFieldArray({
    control: tiersForm.control,
    name: 'serviceTiers',
  });

  // Add-Ons Form
  const addOnsForm = useForm<z.infer<typeof addOnsFormSchema>>({
    resolver: zodResolver(addOnsFormSchema),
    defaultValues: {
      addOns: initialAddOnsSettings?.addOns || [],
    },
  });

  const {
    fields: addOnFields,
    append: appendAddOn,
    remove: removeAddOn,
  } = useFieldArray({
    control: addOnsForm.control,
    name: 'addOns',
  });

  // Submit service tiers
  async function onSubmitTiers(values: z.infer<typeof serviceFormSchema>) {
    setIsLoadingTiers(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceSettings: {
            serviceTiers: values.serviceTiers,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update service tiers');
      }

      toast.success('Service tiers updated successfully');
      await invalidateSettings.invalidate();
    } catch (error) {
      console.error('Error updating service tiers:', error);
      toast.error('Failed to update service tiers');
    } finally {
      setIsLoadingTiers(false);
    }
  }

  // Submit add-ons
  async function onSubmitAddOns(values: z.infer<typeof addOnsFormSchema>) {
    setIsLoadingAddOns(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addOnsSettings: {
            addOns: values.addOns,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update add-ons');
      }

      toast.success('Add-ons updated successfully');
      await invalidateSettings.invalidate();
    } catch (error) {
      console.error('Error updating add-ons:', error);
      toast.error('Failed to update add-ons');
    } finally {
      setIsLoadingAddOns(false);
    }
  }

  // Generate unique ID for new tiers/add-ons
  const generateId = (prefix: string) => createClientId(prefix);

  const handleAddTier = () => {
    appendTier({
      id: generateId('tier'),
      name: '',
      description: '',
      baseNightlyRate: 0,
      capacity: 1,
      imageUrl: '/images/suites/standard-suite-default.webp',
      isActive: true,
      displayOrder: tierFields.length,
    });
  };

  const handleAddAddOn = () => {
    appendAddOn({
      id: generateId('addon'),
      name: '',
      description: '',
      price: 0,
      applicableTiers: [],
      isActive: true,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Service Tiers & Add-Ons</CardTitle>
        <CardDescription>Configure your service offerings and optional add-ons</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tiers">Service Tiers</TabsTrigger>
            <TabsTrigger value="addons">Add-Ons</TabsTrigger>
          </TabsList>

          {/* Service Tiers Tab */}
          <TabsContent value="tiers" className="space-y-4">
            <Form {...tiersForm}>
              <form onSubmit={tiersForm.handleSubmit(onSubmitTiers)} className="space-y-4">
                <div className="space-y-4">
                  {tierFields.map((field, index) => (
                    <div key={field.id} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Service Tier {index + 1}</h4>
                        <div className="flex items-center gap-2">
                          <a
                            href={`/#suite-${tiersForm.watch(`serviceTiers.${index}.id`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary underline underline-offset-2"
                          >
                            Inspect on site
                          </a>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeTier(index)}
                            disabled={tierFields.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <FormField
                          control={tiersForm.control}
                          name={`serviceTiers.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Standard Suite" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={tiersForm.control}
                          name={`serviceTiers.${index}.baseNightlyRate`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nightly Rate ($)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="65.00"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={tiersForm.control}
                          name={`serviceTiers.${index}.capacity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Capacity</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  placeholder="3"
                                  value={field.value ?? 1}
                                  onChange={(e) => field.onChange(parseInt(e.target.value || '1', 10))}
                                />
                              </FormControl>
                              <FormDescription>Max pets/slots for this tier.</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={tiersForm.control}
                        name={`serviceTiers.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Describe this service tier"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={tiersForm.control}
                        name={`serviceTiers.${index}.imageUrl`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Image URL</FormLabel>
                            <FormControl>
                              <Input placeholder="/images/suites/deluxe-suite-default.webp" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={tiersForm.control}
                          name={`serviceTiers.${index}.displayOrder`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Display Order</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={tiersForm.control}
                          name={`serviceTiers.${index}.isActive`}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 pt-4">
                              <FormLabel>Active</FormLabel>
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTier}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service Tier
                </Button>

                <Button
                  type="submit"
                  disabled={isLoadingTiers}
                  className="w-full"
                >
                  {isLoadingTiers && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" />
                  Save Service Tiers
                </Button>
              </form>
            </Form>
          </TabsContent>

          {/* Add-Ons Tab */}
          <TabsContent value="addons" className="space-y-4">
            <Form {...addOnsForm}>
              <form onSubmit={addOnsForm.handleSubmit(onSubmitAddOns)} className="space-y-4">
                <div className="space-y-4">
                  {addOnFields.map((field, index) => (
                    <div key={field.id} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Add-On {index + 1}</h4>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeAddOn(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={addOnsForm.control}
                          name={`addOns.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Premium Treats" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={addOnsForm.control}
                          name={`addOns.${index}.price`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Price ($)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="15.00"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={addOnsForm.control}
                        name={`addOns.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Describe this add-on"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormItem>
                        <FormLabel>Applicable Service Tiers</FormLabel>
                        <div className="space-y-2 pt-2">
                          {tiersForm.watch('serviceTiers').map((tier) => (
                            <FormField
                              key={tier.id}
                              control={addOnsForm.control}
                              name={`addOns.${index}.applicableTiers`}
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(tier.id) || false}
                                      onCheckedChange={(checked) => {
                                        const updated = checked
                                          ? [...(field.value || []), tier.id]
                                          : field.value?.filter((id) => id !== tier.id) || [];
                                        field.onChange(updated);
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">{tier.name}</FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>

                      <FormField
                        control={addOnsForm.control}
                        name={`addOns.${index}.isActive`}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <FormLabel>Active</FormLabel>
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddAddOn}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Add-On
                </Button>

                <Button
                  type="submit"
                  disabled={isLoadingAddOns}
                  className="w-full"
                >
                  {isLoadingAddOns && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" />
                  Save Add-Ons
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
