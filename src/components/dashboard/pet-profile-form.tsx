"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { safeJsonResponse } from "@/lib/safe-json-response";

type PetProfileDefaults = {
  name: string;
  breed: string;
  age: number;
  weight: number;
  gender: string;
  spayedNeutered: boolean;
  specialNeeds: string;
  feedingInstructions: string;
};

interface PetProfileFormProps {
  mode: "create" | "edit";
  petId?: string;
  defaults?: Partial<PetProfileDefaults>;
}

const DEFAULT_VALUES: PetProfileDefaults = {
  name: "",
  breed: "",
  age: 0,
  weight: 0,
  gender: "",
  spayedNeutered: false,
  specialNeeds: "",
  feedingInstructions: "",
};

export function PetProfileForm({ mode, petId, defaults }: PetProfileFormProps) {
  const router = useRouter();
  const initialValues: PetProfileDefaults = {
    ...DEFAULT_VALUES,
    ...defaults,
  };
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gender, setGender] = useState(initialValues.gender);
  const [spayedNeutered, setSpayedNeutered] = useState(initialValues.spayedNeutered);

  const isEditMode = mode === "edit";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!gender) {
      setError("Please select a gender.");
      return;
    }

    setIsSaving(true);

    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get("name") as string,
      breed: form.get("breed") as string,
      age: parseInt(form.get("age") as string, 10),
      weight: parseFloat(form.get("weight") as string),
      gender,
      spayedNeutered,
      specialNeeds: (form.get("specialNeeds") as string) || undefined,
      feedingInstructions: (form.get("feedingInstructions") as string) || undefined,
    };

    const response = await fetch(isEditMode ? `/api/pets/${petId}` : "/api/pets", {
      method: isEditMode ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      router.push(isEditMode && petId ? `/dashboard/pets/${petId}` : "/dashboard/pets");
      return;
    }

      const body = await safeJsonResponse<{ error?: string }>(response, {});
    setError(body.error ?? "Failed to save pet profile.");
    setIsSaving(false);
  }

  return (
    <Card className="paw-card mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base font-semibold">{isEditMode ? "Update Pet Profile" : "Add a Pet"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-1">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" defaultValue={initialValues.name} required className="focus-ring" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="breed">Breed *</Label>
            <Input id="breed" name="breed" defaultValue={initialValues.breed} required className="focus-ring" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="age">Age (years) *</Label>
              <Input
                id="age"
                name="age"
                type="number"
                min="0"
                max="30"
                defaultValue={initialValues.age || undefined}
                required
                className="focus-ring"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="weight">Weight (lbs) *</Label>
              <Input
                id="weight"
                name="weight"
                type="number"
                step="0.1"
                min="0.1"
                defaultValue={initialValues.weight || undefined}
                required
                className="focus-ring"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="gender">Gender *</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger id="gender" className="focus-ring">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="spayedNeutered"
              checked={spayedNeutered}
              onCheckedChange={(value) => setSpayedNeutered(value === true)}
            />
            <Label htmlFor="spayedNeutered">Spayed / Neutered</Label>
          </div>

          <div className="space-y-1">
            <Label htmlFor="specialNeeds">Special Needs</Label>
            <Textarea
              id="specialNeeds"
              name="specialNeeds"
              rows={2}
              defaultValue={initialValues.specialNeeds}
              className="focus-ring"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="feedingInstructions">Feeding Instructions</Label>
            <Textarea
              id="feedingInstructions"
              name="feedingInstructions"
              rows={2}
              defaultValue={initialValues.feedingInstructions}
              className="focus-ring"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : isEditMode ? "Save Changes" : "Add Pet"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(isEditMode && petId ? `/dashboard/pets/${petId}` : "/dashboard/pets")}
              disabled={isSaving}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
