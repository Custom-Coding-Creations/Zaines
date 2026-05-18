"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { ShieldCheck, Sparkles, KeyRound, PawPrint, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { deriveSignInSurface } from "@/lib/auth/signin-surface";
import { resolvePostRegisterOutcome } from "@/lib/auth/signin-flow";

type UiMode = "sign_in" | "create_account";

type AuthCapability = {
  id: string;
  kind: "oauth" | "credentials" | "guest";
  label: string;
  enabled: boolean;
  reasonDisabled?: string;
};

type CapabilitiesResponse = {
  capabilities: AuthCapability[];
  authOperational?: boolean;
  authIssues?: string[];
  oauthSchemaIssues?: string[];
};

type RegisterResponse = {
  errorCode?: string;
  message?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function providerGlyph(providerId: string) {
  if (providerId === "google") {
    return (
      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    );
  }

  if (providerId === "facebook") {
    return (
      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M24 12.073c0-6.627-5.373-12-12-12S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    );
  }

  return null;
}

function SignInForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [mode, setMode] = useState<UiMode>("sign_in");
  const [capabilities, setCapabilities] = useState<AuthCapability[]>([]);
  const [providerIds, setProviderIds] = useState<Set<string>>(new Set());
  const [loadingCapabilities, setLoadingCapabilities] = useState(true);
  const [authOperational, setAuthOperational] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [busy, setBusy] = useState(false);

  const [message, setMessage] = useState("");
  const [correlationId, setCorrelationId] = useState<string | null>(null);

  // Reset busy state when page is restored from bfcache (e.g. user navigates
  // back after an interrupted OAuth redirect to Google).
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setBusy(false);
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadAuthSurface = async () => {
      try {
        const [capabilityResponse, providerResponse] = await Promise.all([
          fetch("/api/auth/capabilities", { cache: "no-store" }),
          fetch("/api/auth/providers", { cache: "no-store" }),
        ]);

        if (!mounted) return;

        if (capabilityResponse.ok) {
          const payload = (await capabilityResponse.json()) as CapabilitiesResponse;
          setCapabilities(payload.capabilities || []);

          const issueCodes = Array.isArray(payload.authIssues) ? payload.authIssues : [];

          if (issueCodes.includes("oauth_schema_unavailable")) {
            setMessage(
              "Social sign-in is temporarily unavailable while account storage is being repaired. Please use email/password sign-in.",
            );
            setCorrelationId("oauth_schema_unavailable");
          }

          if (payload.authOperational === false) {
            setAuthOperational(false);
            const issueSummary = issueCodes.length > 0
              ? issueCodes.join(",")
              : "configuration";
            setMessage(
              "Sign-in is temporarily unavailable due to an authentication configuration issue. Please contact support.",
            );
            setCorrelationId(issueSummary);
          }
        }

        if (providerResponse.ok) {
          const providerPayload = (await providerResponse.json()) as Record<string, unknown>;
          setProviderIds(new Set(Object.keys(providerPayload || {})));
        }
      } finally {
        if (mounted) {
          setLoadingCapabilities(false);
        }
      }
    };

    void loadAuthSurface();

    return () => {
      mounted = false;
    };
  }, []);

  const { oauthProviders, hasCredentials, hasGuest } = useMemo(
    () => deriveSignInSurface({ capabilities, providerIds }),
    [capabilities, providerIds],
  );

  const capabilityById = useMemo(
    () => new Map(capabilities.map((capability) => [capability.id, capability])),
    [capabilities],
  );

  const credentialsReason = capabilityById.get("credentials")?.reasonDisabled;

  const credentialsUnavailableMessage = useMemo(() => {
    if (!credentialsReason) return "Account creation is temporarily unavailable. Please retry.";
    switch (credentialsReason) {
      case "credential_store_unavailable":
        return "Account setup is temporarily unavailable while account storage is being repaired. Please use social sign-in.";
      case "database_unavailable":
        return "Account setup is temporarily unavailable because the account database is offline.";
      case "password_login_disabled":
        return "Email/password account creation is disabled in this environment.";
      default:
        return "Account creation is temporarily unavailable. Please retry.";
    }
  }, [credentialsReason]);

  useEffect(() => {
    if (!hasCredentials && mode === "create_account") {
      setMode("sign_in");
    }
  }, [hasCredentials, mode]);

  const updateError = (value: string, supportId?: string) => {
    setMessage(value);
    setCorrelationId(supportId ?? null);
  };

  const handleCredentialsSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    setCorrelationId(null);

    if (!authOperational) {
      updateError("Sign-in is temporarily unavailable. Please contact support.");
      return;
    }

    if (!EMAIL_PATTERN.test(email.trim())) {
      updateError("Enter a valid email address.");
      return;
    }

    if (!password) {
      updateError("Enter your password.");
      return;
    }

    setBusy(true);
    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
        callbackUrl,
      });

      if (!result || result.error) {
        updateError("We could not sign you in. Check your email and password.");
        return;
      }

      window.location.assign(result.url || callbackUrl);
    } catch {
      updateError("We could not sign you in right now. Please retry.");
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    setCorrelationId(null);

    if (!hasCredentials) {
      updateError(credentialsUnavailableMessage);
      return;
    }

    if (!authOperational) {
      updateError("Account creation is temporarily unavailable. Please contact support.");
      return;
    }

    if (!EMAIL_PATTERN.test(email.trim())) {
      updateError("Enter a valid email address.");
      return;
    }

    if (password.length < 10) {
      updateError("Use a stronger password with at least 10 characters.");
      return;
    }

    setBusy(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as RegisterResponse;
        updateError(payload.message || "Unable to create account right now.");
        return;
      }

      const signInResult = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
        callbackUrl,
      });

      const outcome = resolvePostRegisterOutcome({ signInResult, callbackUrl });
      if (outcome.kind === "fallback_signin") {
        setMode("sign_in");
        updateError(outcome.message);
        return;
      }

      window.location.assign(outcome.targetUrl);
    } catch {
      updateError("Unable to create account right now. Please retry.");
    } finally {
      setBusy(false);
    }
  };

  const handleOAuth = async (providerId: string) => {
    if (!authOperational) {
      updateError("Social sign-in is temporarily unavailable. Please contact support.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const result = await signIn(providerId, { callbackUrl, redirect: false });
      if (result?.error) {
        console.error("[auth] OAuth signIn error:", result.error, result.code, result.status);
        updateError("Unable to continue with that provider. Please retry.");
        setBusy(false);
        return;
      }
      if (result?.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      console.error("[auth] OAuth signIn exception:", err);
      updateError("Unable to continue with that provider. Please retry.");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[oklch(0.93_0.04_212)] via-[oklch(0.99_0.008_90)] to-white">
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center text-sm text-[oklch(0.52_0.05_230)] transition hover:text-[oklch(0.22_0.05_240)]">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
          {hasGuest ? (
            <Button asChild variant="outline" className="paw-button-secondary">
              <Link href="/book">Continue as Guest 🐾</Link>
            </Button>
          ) : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <Card className="paw-card">
            <CardHeader className="space-y-4">
              <div className="inline-flex w-fit items-center rounded-full border border-[oklch(0.78_0.13_208)] bg-[oklch(0.93_0.04_212)] px-3 py-1 text-xs font-semibold tracking-wide text-[oklch(0.78_0.13_208)]">
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                Secure Sign In 🔒
              </div>
              <CardTitle className="heading-playful text-3xl sm:text-4xl">
                Welcome Back to the Pack! 🐾
              </CardTitle>
              <CardDescription className="max-w-xl text-base text-[oklch(0.52_0.05_230)]">
                Manage your pup's stays, health records, photo updates, and more in your secure dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-[oklch(0.93_0.04_212)] bg-white p-3 text-sm text-[oklch(0.22_0.05_240)]">
                  <ShieldCheck className="mb-2 h-4 w-4 text-[oklch(0.74_0.14_152)]" />
                  Secure & Safe
                </div>
                <div className="rounded-xl border border-[oklch(0.93_0.04_212)] bg-white p-3 text-sm text-[oklch(0.22_0.05_240)]">
                  <PawPrint className="mb-2 h-4 w-4 text-[oklch(0.78_0.13_208)]" />
                  Quick Access
                </div>
                <div className="rounded-xl border border-[oklch(0.93_0.04_212)] bg-white p-3 text-sm text-[oklch(0.22_0.05_240)]">
                  <KeyRound className="mb-2 h-4 w-4 text-[oklch(0.88_0.17_90)]" />
                  Easy Sign In
                </div>
              </div>

              <div className="rounded-2xl border border-[oklch(0.93_0.04_212)] bg-white p-4">
                <div className="mb-4 grid grid-cols-2 rounded-lg border border-[oklch(0.93_0.04_212)] bg-[oklch(0.97_0.03_212)] p-1 text-sm">
                  <button
                    type="button"
                    className={`rounded-md px-3 py-2 font-semibold transition ${
                      mode === "sign_in" ? "bg-white text-[oklch(0.22_0.05_240)] shadow" : "text-[oklch(0.52_0.05_230)]"
                    }`}
                    onClick={() => setMode("sign_in")}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    className={`rounded-md px-3 py-2 font-semibold transition ${
                      mode === "create_account"
                        ? "bg-white text-[oklch(0.22_0.05_240)] shadow"
                        : hasCredentials
                          ? "text-[oklch(0.52_0.05_230)]"
                          : "text-[oklch(0.52_0.05_230)] opacity-60"
                    }`}
                    onClick={() => setMode("create_account")}
                  >
                    Create Account
                  </button>
                </div>

                {mode === "create_account" && !hasCredentials ? (
                  <Alert>
                    <AlertDescription>{credentialsUnavailableMessage}</AlertDescription>
                  </Alert>
                ) : null}

                {message ? (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {message}
                      {correlationId ? ` (Support code: ${correlationId})` : ""}
                    </AlertDescription>
                  </Alert>
                ) : null}

                <form
                  className="mt-4 space-y-4"
                  onSubmit={mode === "sign_in" ? handleCredentialsSignIn : handleRegister}
                >
                  {mode === "create_account" ? (
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Alex Morgan"
                        disabled={busy || loadingCapabilities || !authOperational}
                      />
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      disabled={busy || loadingCapabilities || !authOperational}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={mode === "create_account" ? "Create a strong password" : "Enter your password"}
                      disabled={busy || loadingCapabilities || !authOperational || (mode === "create_account" && !hasCredentials)}
                      required={mode === "sign_in" || hasCredentials}
                    />
                  </div>

                  {mode === "sign_in" ? (
                    <div className="flex items-center justify-between text-sm">
                      <label className="inline-flex items-center gap-2 text-[oklch(0.52_0.05_230)]">
                        <Checkbox
                          checked={rememberMe}
                          onCheckedChange={(value) => setRememberMe(value === true)}
                        />
                        Remember me
                      </label>
                      <Link href="/auth/reset-password" className="text-[oklch(0.78_0.13_208)] hover:text-[oklch(0.70_0.13_208)] font-medium">
                        Need password help?
                      </Link>
                    </div>
                  ) : null}

                  <Button type="submit" className="paw-button-primary w-full" disabled={busy || loadingCapabilities || !authOperational || (mode === "create_account" && !hasCredentials)}>
                    {busy ? "Working... 🐾" : mode === "sign_in" ? "Sign In Securely 🔒" : "Join the Pack! 🎉"}
                  </Button>
                </form>

                {oauthProviders.length > 0 ? (
                  <>
                    <div className="my-5 relative">
                      <div className="absolute inset-0 flex items-center">
                        <Separator />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase tracking-wide">
                        <span className="bg-white px-2 text-[oklch(0.52_0.05_230)] font-medium">or continue with</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {oauthProviders.map((provider) => (
                        <Button
                          key={provider.id}
                          type="button"
                          variant="outline"
                          className="paw-button-secondary w-full"
                          onClick={() => handleOAuth(provider.id)}
                          disabled={busy || loadingCapabilities || !authOperational}
                        >
                          {providerGlyph(provider.id)}
                          {provider.label}
                        </Button>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="paw-card">
            <CardHeader>
              <CardTitle className="heading-playful text-xl">Your Pup's Data is Safe 🔒</CardTitle>
              <CardDescription className="text-[oklch(0.52_0.05_230)]">
                Your account keeps all your pup's details, stays, health records, and photo updates secure and private.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-[oklch(0.22_0.05_240)]">
              <div className="rounded-xl border border-[oklch(0.93_0.04_212)] bg-[oklch(0.97_0.03_212)] p-4">
                🐾 We only show sign-in options that are fully working and ready to wag!
              </div>
              <div className="rounded-xl border border-[oklch(0.93_0.04_212)] bg-[oklch(0.97_0.03_212)] p-4">
                ⚡ Need to book fast? Use guest checkout and create your account after your reservation is confirmed.
              </div>
              <div className="rounded-xl border border-[oklch(0.93_0.04_212)] bg-[oklch(0.97_0.03_212)] p-4">
                💕 Need help? <Link href="/contact" className="font-semibold text-[oklch(0.78_0.13_208)] hover:underline">Contact our pack</Link> and we'll get you sorted!
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[oklch(0.99_0.008_90)]">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[oklch(0.78_0.13_208)] border-t-transparent" />
            <p className="text-sm text-[oklch(0.52_0.05_230)] font-medium">Loading secure sign-in... 🐾</p>
          </div>
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
