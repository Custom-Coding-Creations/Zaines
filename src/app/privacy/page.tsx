import { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Eye, UserCheck, Database, Mail } from "lucide-react";
import { PRIVACY_SECURITY_DISCLOSURE } from "@/config/trust-copy";
import { getAdminSettings } from "@/lib/api/admin-settings";
import { simplePageMetadataFromSettings } from "@/lib/seo-page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return simplePageMetadataFromSettings({
    title: "Privacy Policy | Zaine's Stay & Play",
    description:
      "Learn how Zaine's Stay & Play collects, uses, and protects your personal information and data.",
    canonicalPath: "/privacy",
  });
}

export default async function PrivacyPage() {
  const settings = await getAdminSettings();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-50 to-indigo-50 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4">Privacy & Security</Badge>
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Privacy Policy
            </h1>
            <p className="mb-8 text-xl text-muted-foreground">
              Your privacy matters to us. Learn how we collect, use, and protect
              your information.
            </p>
            <p className="text-sm text-muted-foreground">
              Last updated: February 6, 2026 • Effective Date: January 1, 2026
            </p>
          </div>
        </div>
      </section>

      {/* Key Highlights */}
      <section className="border-b py-12">
        <div className="container mx-auto px-4">
          <h2 className="mb-8 text-center text-2xl font-bold">
            Privacy at a Glance
          </h2>
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                  <Shield className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle className="text-lg">
                  We Don&apos;t Sell Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  We never sell your personal information to third parties. Your
                  data stays private.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                  <Lock className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">Secure Storage</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Payment details are handled by Stripe, and booking data is
                  protected with access controls and secure transmission.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                  <UserCheck className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle className="text-lg">
                  You&apos;re in Control
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Access, update, or delete your data anytime. We respect your
                  privacy rights.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="prose prose-slate mx-auto max-w-4xl">
            {/* Introduction */}
            <div className="mb-12">
              <h2 className="mb-4 text-2xl font-bold">Introduction</h2>
              <p className="text-muted-foreground">
                Zaine&apos;s Stay &amp; Play (&quot;we,&quot; &quot;us,&quot; or
                &quot;our&quot;) provides private dog boarding services. This
                Privacy Policy explains how we collect, use, disclose, and
                safeguard your information when you visit our website or use our
                services.
              </p>
              <p className="text-muted-foreground">
                By using our website and services, you consent to the data
                practices described in this policy. If you do not agree with
                this policy, please discontinue use of our services.
              </p>
            </div>

            {/* Information We Collect */}
            <div className="mb-12">
              <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold">
                <Database className="h-6 w-6" />
                Information We Collect
              </h2>

              <h3 className="mb-3 text-xl font-semibold">
                Personal Information
              </h3>
              <p className="mb-4 text-muted-foreground">
                When you create an account, book services, or contact us, we may
                collect:
              </p>
              <ul className="mb-6 ml-6 list-disc space-y-2 text-muted-foreground">
                <li>Name, email address, phone number</li>
                <li>Home address and emergency contact information</li>
                <li>Payment information (processed securely through Stripe)</li>
                <li>Account credentials (username, password - encrypted)</li>
              </ul>

              <h3 className="mb-3 text-xl font-semibold">Pet Information</h3>
              <ul className="mb-6 ml-6 list-disc space-y-2 text-muted-foreground">
                <li>Pet name, breed, age, weight, and gender</li>
                <li>Vaccination records and health history</li>
                <li>Behavioral information and special needs</li>
                <li>Veterinarian contact information</li>
                <li>Photos and videos of your pet (taken during stay)</li>
              </ul>

              <h3 className="mb-3 text-xl font-semibold">
                Automatically Collected Information
              </h3>
              <ul className="mb-6 ml-6 list-disc space-y-2 text-muted-foreground">
                <li>IP address, browser type, operating system</li>
                <li>Pages visited, time spent on pages, clickstream data</li>
                <li>Cookies and similar tracking technologies</li>
                <li>Device information and unique identifiers</li>
              </ul>
            </div>

            {/* How We Use Your Information */}
            <div className="mb-12">
              <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold">
                <Eye className="h-6 w-6" />
                How We Use Your Information
              </h2>
              <p className="mb-4 text-muted-foreground">
                We use the collected information for the following purposes:
              </p>
              <ul className="ml-6 list-disc space-y-2 text-muted-foreground">
                <li>
                  Providing and managing private boarding reservations and
                  approved add-ons
                </li>
                <li>Processing payments and maintaining financial records</li>
                <li>
                  Sending booking confirmations, reminders, and updates about
                  your pet
                </li>
                <li>
                  Communicating important information about schedule changes or
                  emergencies
                </li>
                <li>
                  Improving our services based on user feedback and usage
                  patterns
                </li>
                <li>
                  Marketing communications (with your consent - you can opt-out
                  anytime)
                </li>
                <li>Ensuring safety and security of our facility and guests</li>
                <li>
                  Complying with legal obligations and protecting our legal
                  rights
                </li>
              </ul>
            </div>

            {/* Information Sharing */}
            <div className="mb-12">
              <h2 className="mb-4 text-2xl font-bold">
                Information Sharing and Disclosure
              </h2>
              <p className="mb-4 text-muted-foreground">
                We may share your information in the following circumstances:
              </p>

              <h3 className="mb-3 text-xl font-semibold">Service Providers</h3>
              <p className="mb-4 text-muted-foreground">
                We work with trusted third-party service providers who assist us
                in operating our business:
              </p>
              <ul className="mb-6 ml-6 list-disc space-y-2 text-muted-foreground">
                <li>
                  Payment processors (Stripe) - for secure payment processing
                </li>
                <li>
                  Email service providers (Resend) - for transactional emails
                </li>
                <li>Cloud storage providers - for secure data storage</li>
                <li>Analytics providers - to understand website usage</li>
              </ul>

              <h3 className="mb-3 text-xl font-semibold">
                Emergency Situations
              </h3>
              <p className="mb-4 text-muted-foreground">
                We may share pet health information with veterinarians in case
                of medical emergencies.
              </p>

              <h3 className="mb-3 text-xl font-semibold">Legal Requirements</h3>
              <p className="mb-4 text-muted-foreground">
                We may disclose information if required by law, court order, or
                government request, or to protect the rights, property, or
                safety of Zaine&apos;s Stay & Play, our users, or others.
              </p>

              <h3 className="mb-3 text-xl font-semibold">Business Transfers</h3>
              <p className="mb-4 text-muted-foreground">
                If we are involved in a merger, acquisition, or sale of assets,
                your information may be transferred as part of that transaction.
              </p>
            </div>

            {/* Data Security */}
            <div className="mb-12">
              <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold">
                <Lock className="h-6 w-6" />
                Data Security
              </h2>
              <p className="mb-4 text-muted-foreground">
                We implement appropriate technical and organizational measures
                to protect your information:
              </p>
              <ul className="ml-6 list-disc space-y-2 text-muted-foreground">
                <li>SSL/TLS encryption for data transmission</li>
                <li>Stripe payment processing for card details</li>
                <li>
                  Restricted access to personal information (need-to-know basis)
                </li>
                <li>
                  Booking, health, and message data used only for care,
                  operations, safety, and customer communication
                </li>
              </ul>
              <p className="mt-4 text-muted-foreground">
                {settings.trustCopySettings.privacySecurityDisclosure ||
                  PRIVACY_SECURITY_DISCLOSURE}
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                However, no method of transmission over the internet or
                electronic storage is 100% secure. While we strive to protect
                your information, we cannot guarantee absolute security.
              </p>
            </div>

            {/* Your Privacy Rights */}
            <div className="mb-12">
              <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold">
                <UserCheck className="h-6 w-6" />
                Your Privacy Rights
              </h2>
              <p className="mb-4 text-muted-foreground">
                You have the following rights regarding your personal
                information:
              </p>
              <ul className="ml-6 list-disc space-y-2 text-muted-foreground">
                <li>
                  <strong>Access:</strong> Request a copy of the personal
                  information we hold about you
                </li>
                <li>
                  <strong>Correction:</strong> Update or correct inaccurate
                  information
                </li>
                <li>
                  <strong>Deletion:</strong> Request deletion of your personal
                  information (subject to legal obligations)
                </li>
                <li>
                  <strong>Opt-Out:</strong> Unsubscribe from marketing emails at
                  any time
                </li>
                <li>
                  <strong>Data Portability:</strong> Receive your data in a
                  structured, machine-readable format
                </li>
                <li>
                  <strong>Objection:</strong> Object to processing of your
                  personal information
                </li>
              </ul>
              <p className="mt-4 text-muted-foreground">
                To exercise these rights, please contact us at
                privacy@zainesstayandplay.com or call (315) 765-7297.
              </p>
            </div>

            {/* Cookies */}
            <div className="mb-12">
              <h2 className="mb-4 text-2xl font-bold">
                Cookies and Tracking Technologies
              </h2>
              <p className="mb-4 text-muted-foreground">
                We use cookies and similar technologies to enhance your
                experience:
              </p>
              <ul className="ml-6 list-disc space-y-2 text-muted-foreground">
                <li>
                  <strong>Essential Cookies:</strong> Required for basic website
                  functionality
                </li>
                <li>
                  <strong>Performance Cookies:</strong> Help us understand how
                  visitors use our website
                </li>
                <li>
                  <strong>Functional Cookies:</strong> Remember your preferences
                  (e.g., language)
                </li>
                <li>
                  <strong>Advertising Cookies:</strong> Deliver relevant ads
                  (with your consent)
                </li>
              </ul>
              <p className="mt-4 text-muted-foreground">
                You can control cookies through your browser settings. Note that
                disabling cookies may affect website functionality.
              </p>
            </div>

            {/* Children&apos;s Privacy */}
            <div className="mb-12">
              <h2 className="mb-4 text-2xl font-bold">
                Children&apos;s Privacy
              </h2>
              <p className="text-muted-foreground">
                Our services are not directed to children under 18. We do not
                knowingly collect personal information from children. If you
                believe we have collected information from a child, please
                contact us immediately.
              </p>
            </div>

            {/* Changes to Policy */}
            <div className="mb-12">
              <h2 className="mb-4 text-2xl font-bold">
                Changes to This Policy
              </h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time. We will
                notify you of significant changes by posting the new policy on
                this page and updating the &quot;Last Updated&quot; date.
                Continued use of our services after changes constitutes
                acceptance of the updated policy.
              </p>
            </div>

            {/* Contact */}
            <div>
              <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold">
                <Mail className="h-6 w-6" />
                Contact Us
              </h2>
              <p className="mb-4 text-muted-foreground">
                If you have questions or concerns about this Privacy Policy or
                our data practices, please contact us:
              </p>
              <div className="rounded-lg bg-muted p-6">
                <p className="mb-2">
                  <strong>Zaine&apos;s Stay & Play</strong>
                </p>
                <p className="mb-2">Syracuse, NY</p>
                <p className="mb-2">Email: privacy@zainesstayandplay.com</p>
                <p>Phone: (315) 765-7297</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-16 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold">Your Privacy Is Protected</h2>
          <p className="mb-8 text-lg opacity-90">
            We&apos;re committed to keeping your information safe and secure
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/contact">Contact Us</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground bg-transparent text-primary-foreground hover:bg-primary-foreground hover:text-primary"
              asChild
            >
              <Link href="/terms">View Terms of Service</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
