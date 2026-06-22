"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  User,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import {
  stepAccountSchema,
  stepAccountGuestSchema,
  type StepAccountData,
} from "@/lib/validations/booking-wizard";
import { toast } from "sonner";

interface StepAccountProps {
  data: Partial<StepAccountData>;
  onUpdate: (data: Partial<StepAccountData>) => void;
  onNext: () => void;
  onBack: () => void;
  onCancel?: () => void;
}

export function StepAccount({
  data,
  onUpdate,
  onNext,
  onBack,
  onCancel,
}: StepAccountProps) {
  const { data: session, status } = useSession();
  const [firstName, setFirstName] = useState(data.firstName || "");
  const [lastName, setLastName] = useState(data.lastName || "");
  const [phone, setPhone] = useState(data.phone || "");
  const [email, setEmail] = useState(data.email || session?.user?.email || "");

  const isAuthenticated = status === "authenticated";
  const isLoading = status === "loading";

  const sessionDefaults = useMemo(() => {
    const fullName = session?.user?.name?.trim() || "";
    const [givenName, ...rest] = fullName ? fullName.split(/\s+/) : [""];

    return {
      email: session?.user?.email || "",
      firstName: givenName || "",
      lastName: rest.join(" ") || givenName || "",
    };
  }, [session?.user?.email, session?.user?.name]);

  const resolvedFirstName = firstName || sessionDefaults.firstName;
  const resolvedLastName = lastName || sessionDefaults.lastName;
  const resolvedEmail = email || sessionDefaults.email;

  const handleNext = () => {
    const accountData = {
      firstName: resolvedFirstName.trim(),
      lastName: resolvedLastName.trim(),
      email: resolvedEmail.trim(),
      phone: phone.trim(),
    };

    const validation = stepAccountSchema.safeParse(accountData);

    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      return;
    }

    onUpdate(accountData);

    if (!isAuthenticated) {
      toast.success(
        "Proceeding as guest. You can sign in later to manage your booking.",
      );
    }

    onNext();
  };

  const handleContinueAsGuest = () => {
    const guestData = {
      email: resolvedEmail.trim(),
    };

    const validation = stepAccountGuestSchema.safeParse(guestData);

    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      return;
    }

    // Use available data, providing defaults for optional fields
    const accountData = {
      firstName: resolvedFirstName || "Guest",
      lastName: resolvedLastName || "User",
      email: resolvedEmail.trim(),
      phone: phone.trim() || "0000000000",
    };

    onUpdate(accountData);
    onNext();
  };

  if (isLoading) {
    return (
      <Card className="border-border/70 bg-background">
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/70 bg-background">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Account & Contact
        </CardTitle>
        <CardDescription>
          {isAuthenticated
            ? "You're signed in and ready to book"
            : "Sign in or continue as a guest"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              value={resolvedFirstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="focus-ring"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              value={resolvedLastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="focus-ring"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="3155551234"
              required
              className="focus-ring"
            />
          </div>
        </div>

        {isAuthenticated ? (
          <>
            {/* Authenticated User View */}
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                <div className="flex flex-col gap-1">
                  <span className="font-semibold">
                    Signed in as {session.user?.name || "User"}
                  </span>
                  <span className="text-sm">{session.user?.email}</span>
                </div>
              </AlertDescription>
            </Alert>

            <div className="rounded-lg border p-4">
              <h3 className="mb-2 font-semibold">Account Benefits</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                  <span>View and manage bookings from your dashboard</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                  <span>Saved pet profiles for faster future bookings</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                  <span>Real-time activity updates and photos</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                  <span>Booking history and loyalty rewards</span>
                </li>
              </ul>
            </div>
          </>
        ) : (
          <>
            {/* Not Authenticated View */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={resolvedEmail}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="focus-ring"
                />
              </div>

              <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
                <AlertDescription className="text-blue-800 dark:text-blue-200">
                  Sign in with your email/password or Google account to manage bookings in your dashboard.
                </AlertDescription>
              </Alert>

              <Button asChild className="focus-ring w-full" variant="outline">
                <Link href="/auth/signin?callbackUrl=/dashboard/bookings">Sign In to Existing Account</Link>
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-dashed p-4">
                <h3 className="mb-2 font-semibold">Continue as Guest</h3>
                <p className="mb-3 text-sm text-muted-foreground">
                  You can complete your booking without signing in. We&apos;ll
                  send confirmation to your email. To access your booking
                  dashboard later, you can create an account anytime.
                </p>
                <Button
                  onClick={handleContinueAsGuest}
                  disabled={!resolvedEmail}
                  variant="secondary"
                  className="focus-ring w-full"
                >
                  Continue as Guest
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4">
          <div className="flex gap-2">
            <Button variant="outline" className="focus-ring" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {onCancel && (
              <Button variant="destructive" className="focus-ring" onClick={onCancel}>
                Cancel Booking
              </Button>
            )}
          </div>
          <Button
            className="focus-ring"
            onClick={handleNext}
            disabled={
              !resolvedEmail || !resolvedFirstName || !resolvedLastName || !phone
            }
          >
            Continue to Pet Profiles
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
