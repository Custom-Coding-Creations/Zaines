'use client';

import { useEffect, useState } from 'react';
import { useFieldArray } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Save, Trash2, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useSettingsSectionForm } from '@/hooks/use-settings-section-form';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { servicesSettingsSchema } from '@/lib/validations/admin-settings';
import { servicesSettingsDefaults } from '@/lib/config/admin-settings-defaults';

type ServicesTabProps = {
  onDirtyChange?: (isDirty: boolean) => void;
};

const sectionKeys: (keyof import('@/types/admin').AdminSettings)[] = ['serviceSettings', 'addOnsSettings'];

function createClientId(prefix: string): string {
  const randomPart = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);
  return `${prefix}-${randomPart}`;
}

export function ServicesTab({ onDirtyChange }: ServicesTabProps) {
  const [activeSubTab, setActiveSubTab] = useState('tiers');
  
  const { form, isLoading, isSaving, isDirty, error, onSubmit, onReset } =
    useSettingsSectionForm({
      schema: servicesSettingsSchema,
      sectionKeys,
      defaults: servicesSettingsDefaults,
    });

  // Enable keyboard shortcuts (Ctrl+S to save, Esc to discard)
  useKeyboardShortcuts({
    onSave: () => {
      if (!isSaving && isDirty && form.formState.isValid) {
        onSubmit(form.getValues());
      }
    },
    onDiscard: () => {
      if (isDirty && !isSaving) {
        onReset();
      }
    },
    enabled: !isLoading,
  });

  const {
    fields: tierFields,
    append: appendTier,
    remove: removeTier,
  } = useFieldArray({
    control: form.control as any,
    name: 'serviceSettings.serviceTiers',
  });

  const {
    fields: addOnFields,
    append: appendAddOn,
    remove: removeAddOn,
  } = useFieldArray({
    control: form.control as any,
    name: 'addOnsSettings.addOns',
  });

  // Notify parent of dirty state changes
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  function addServiceTier() {
    appendTier({
      id: createClientId('tier'),
      name: '',
      description: '',
      baseNightlyRate: 0,
      capacity: 1,
      imageUrl: '',
      isActive: true,
      displayOrder: tierFields.length,
    });
  }

  function addAddOn() {
    appendAddOn({
      id: createClientId('addon'),
      name: '',
      description: '',
      price: 0,
      isIncluded: false,
      applicableTiers: [],
      isActive: true,
    });
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Services</CardTitle>
          <CardDescription>Manage service tiers and add-ons</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get tier names for add-on dropdowns
  const tierNames = form.watch('serviceSettings.serviceTiers' as any)?.map((t: any) => t.name) || [];

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Services</CardTitle>
              <CardDescription>Manage service tiers and add-ons</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="tiers">Service Tiers</TabsTrigger>
                  <TabsTrigger value="addons">Add-Ons</TabsTrigger>
                </TabsList>

                {/* Service Tiers Tab */}
                <TabsContent value="tiers" className="space-y-4 mt-4">
                  {tierFields.map((field, index) => (
                    <div key={field.id} className="rounded-lg border p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Service Tier {index + 1}</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={tierFields.length <= 1}
                          onClick={() => removeTier(index)}
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Remove
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control as any}
                          name={`serviceSettings.serviceTiers.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Standard Suite" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control as any}
                          name={`serviceSettings.serviceTiers.${index}.baseNightlyRate`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Base Nightly Rate ($)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="65.00"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control as any}
                        name={`serviceSettings.serviceTiers.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Comfortable suite with..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control as any}
                          name={`serviceSettings.serviceTiers.${index}.capacity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Capacity (dogs)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="2"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control as any}
                          name={`serviceSettings.serviceTiers.${index}.imageUrl`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Image URL</FormLabel>
                              <FormControl>
                                <Input placeholder="/images/tier.jpg" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control as any}
                        name={`serviceSettings.serviceTiers.${index}.isActive`}
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="!mt-0">Active (visible on site)</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}

                  <Button type="button" variant="outline" onClick={addServiceTier}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Service Tier
                  </Button>
                </TabsContent>

                {/* Add-Ons Tab */}
                <TabsContent value="addons" className="space-y-4 mt-4">
                  {addOnFields.map((field, index) => (
                    (() => {
                      const isIncluded = Boolean(form.watch(`addOnsSettings.addOns.${index}.isIncluded` as any));
                      return (
                    <div key={field.id} className="rounded-lg border p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Add-On {index + 1}</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeAddOn(index)}
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Remove
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control as any}
                          name={`addOnsSettings.addOns.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Extra Playtime" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control as any}
                          name={`addOnsSettings.addOns.${index}.price`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Price ($)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="15.00"
                                  disabled={isIncluded}
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control as any}
                        name={`addOnsSettings.addOns.${index}.isIncluded`}
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={Boolean(field.value)}
                                onCheckedChange={(checked) => {
                                  const nextValue = Boolean(checked);
                                  field.onChange(nextValue);

                                  if (nextValue) {
                                    form.setValue(`addOnsSettings.addOns.${index}.price` as any, 0, {
                                      shouldDirty: true,
                                      shouldTouch: true,
                                      shouldValidate: true,
                                    });
                                  }
                                }}
                              />
                            </FormControl>
                            <FormLabel className="!mt-0">Included Add-On (no separate charge)</FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control as any}
                        name={`addOnsSettings.addOns.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Additional 30 minutes of playtime..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control as any}
                        name={`addOnsSettings.addOns.${index}.applicableTiers`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Applicable Tiers</FormLabel>
                            <FormDescription>Select which service tiers can use this add-on</FormDescription>
                            <div className="space-y-2">
                              {tierNames.map((tierName: string) => (
                                <div key={tierName} className="flex items-center gap-2">
                                  <Checkbox
                                    checked={field.value?.includes(tierName)}
                                    onCheckedChange={(checked) => {
                                      const newValue = checked
                                        ? [...(field.value || []), tierName]
                                        : (field.value || []).filter((t: string) => t !== tierName);
                                      field.onChange(newValue);
                                    }}
                                  />
                                  <span className="text-sm">{tierName}</span>
                                </div>
                              ))}
                              {tierNames.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                  Create service tiers first
                                </p>
                              )}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control as any}
                        name={`addOnsSettings.addOns.${index}.isActive`}
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="!mt-0">Active (visible on site)</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                      );
                    })()
                  ))}

                  <Button type="button" variant="outline" onClick={addAddOn}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Add-On
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Save/Discard Buttons */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
            <div className="text-sm">
              {isDirty ? (
                <span className="text-amber-600 dark:text-amber-500">Unsaved changes</span>
              ) : (
                <span className="text-muted-foreground">No changes</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!isDirty || isSaving || !form.formState.isValid}
                onClick={onReset}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Discard
              </Button>
              <Button type="submit" disabled={!isDirty || isSaving || !form.formState.isValid}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
