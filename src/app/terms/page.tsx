 
import { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import {
  CANCELLATION_POLICY_COPY,
} from "@/config/trust-copy";
import { getAdminSettings } from "@/lib/api/admin-settings";
import { simplePageMetadataFromSettings } from "@/lib/seo-page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return simplePageMetadataFromSettings({
    title: "Terms of Service | Zaine's Stay & Play",
    description:
      "Read our terms of service governing use of Zaine's Stay & Play private boarding services and website.",
    canonicalPath: "/terms",
  });
}

export default async function TermsPage() {
  const settings = await getAdminSettings();
  const cancellationSettings = settings.cancellationPolicySettings;
  const fullRefundLine = `${cancellationSettings.fullRefundHours}+ hours before check-in: full refund.`;
  const partialRefundLine = `${cancellationSettings.partialRefundHours}-${cancellationSettings.fullRefundHours} hours before check-in: ${cancellationSettings.partialRefundPercent}% refund.`;
  const noRefundLine = `Less than ${cancellationSettings.partialRefundHours} hours before check-in: no refund.`;
  const noShowLine =
    cancellationSettings.noShowRefundPercent > 0
      ? `${cancellationSettings.noShowRefundPercent}% refund.`
      : CANCELLATION_POLICY_COPY.noShow.replace("No-show: ", "");

  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-gray-50 to-slate-50 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4">Legal</Badge>
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Terms of Service
            </h1>
            <p className="mb-8 text-xl text-muted-foreground">
              Please read these terms carefully before using our services
            </p>
            <p className="mb-4 text-sm text-muted-foreground md:text-base">
              {settings.trustCopySettings.trustEvidenceClaim}
            </p>
            <p className="text-sm text-muted-foreground">
              Last updated: February 6, 2026 • Effective Date: January 1, 2026
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="prose prose-slate mx-auto max-w-4xl">
            {/* Introduction */}
            <div className="mb-12">
              <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold">
                <FileText className="h-6 w-6" />
                1. Agreement to Terms
              </h2>
              <p className="text-muted-foreground">
                These Terms of Service (&quot;Terms&quot;) constitute a legally
                binding agreement between you (&quot;Client,&quot;
                &quot;you,&quot; or &quot;your&quot;) and Zaine's Stay &amp;
                Play (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or
                &quot;our&quot;) governing your use of our website and private
                dog boarding services.
              </p>
              <p className="text-muted-foreground">
                By accessing our website, booking services, or using our
                facilities, you agree to be bound by these Terms. If you
                disagree with any part of these Terms, you may not access our
                services.
              </p>
            </div>

            {/* Services */}
            <div className="mb-12">
              <h2 className="mb-4 text-2xl font-bold">2. Services Offered</h2>
              <p className="mb-4 text-muted-foreground">
                Zaine's Stay &amp; Play provides the following services:
              </p>
              <ul className="ml-6 list-disc space-y-2 text-muted-foreground">
                <li>
                  <strong>Dog Boarding:</strong> Overnight and extended stay
                  accommodations
                </li>
                <li>
                  <strong>Suite Selection:</strong> Standard, deluxe, and luxury
                  suite options
                </li>
                <li>
                  <strong>Care Add-Ons:</strong> Optional care enhancements
                  during a boarding stay
                </li>
                <li>
                  <strong>Customer Support:</strong> Booking assistance and
                  policy clarification
                </li>
              </ul>
              <p className="mt-4 text-muted-foreground">
                Services are subject to availability and may be modified or
                discontinued at our discretion with advance notice.
              </p>
            </div>
                {settings.trustCopySettings.cancellationProcessing ||
                  CANCELLATION_POLICY_COPY.processing}
            {/* Booking and Reservations */}
            <div className="mb-12">
              <h2 className="mb-4 text-2xl font-bold">
                3. Booking and Reservations
              </h2>

              <h3 className="mb-3 text-xl font-semibold">
                3.1 Account Creation
              </h3>
              <p className="mb-4 text-muted-foreground">
                To book services, you must create an account providing accurate
                and complete information. You are responsible for maintaining
                the confidentiality of your account credentials.
              </p>

              <h3 className="mb-3 text-xl font-semibold">
                3.2 Booking Confirmation
              </h3>
              <p className="mb-4 text-muted-foreground">
                A booking is confirmed only after we receive full payment and
                send you a written confirmation. We reserve the right to refuse
                service at our sole discretion.
              </p>

              <h3 className="mb-3 text-xl font-semibold">3.3 Waitlist</h3>
              <p className="mb-4 text-muted-foreground">
                During peak periods, bookings may be placed on a waitlist.
                Waitlist placement does not guarantee service and is fulfilled
                on a first-come, first-served basis.
              </p>
            </div>

            {/* Client Responsibilities */}
            <div className="mb-12">
              <h2 className="mb-4 text-2xl font-bold">
                4. Client Responsibilities
              </h2>
              <p className="mb-4 text-muted-foreground">
                As a client, you agree to:
              </p>
              <ul className="ml-6 list-disc space-y-2 text-muted-foreground">
                <li>
                  Provide complete and accurate information about your
                  pet&apos;s health, behavior, and needs
                </li>
                <li>
                  Ensure your pet meets all vaccination and health requirements
                  before arrival
                </li>
                <li>
                  Provide sufficient food for your pet&apos;s entire stay (plus
                  1-2 extra days)
                </li>
                <li>
                  Disclose any behavioral issues, aggression history, or special
                  needs
                </li>
                <li>
                  Provide emergency contact information and authorize emergency
                  veterinary care
                </li>
                <li>Pick up your pet by the agreed check-out time</li>
                <li>Pay all fees promptly according to our payment terms</li>
              </ul>
            </div>

            {/* Health and Safety */}
            <div className="mb-12">
              <h2 className="mb-4 text-2xl font-bold">
                5. Health and Safety Requirements
              </h2>

              <h3 className="mb-3 text-xl font-semibold">5.1 Vaccinations</h3>
              <p className="mb-4 text-muted-foreground">
                All pets must be current on required vaccinations: Rabies, DHPP
                (Distemper, Hepatitis, Parvovirus, Parainfluenza), and
                Bordetella. Proof of vaccination must be provided before first
                visit.
              </p>

              <h3 className="mb-3 text-xl font-semibold">
                5.2 Health Requirements
              </h3>
              <p className="mb-4 text-muted-foreground">
                Pets must be in good health, free from contagious illnesses, and
                current on flea/tick prevention. We reserve the right to refuse
                service to pets showing signs of illness or infestation.
              </p>

              <h3 className="mb-3 text-xl font-semibold">
                5.3 Behavioral Standards
              </h3>
              <p className="mb-4 text-muted-foreground">
                Pets must demonstrate appropriate temperament and non-aggressive
                behavior toward people and other animals. Aggressive pets may be
                refused service or discharged immediately.
              </p>
            </div>

            {/* Payment Terms */}
            <div className="mb-12">
              <h2 className="mb-4 text-2xl font-bold">6. Payment Terms</h2>

              <h3 className="mb-3 text-xl font-semibold">
                6.1 Payment Methods
              </h3>
              <p className="mb-4 text-muted-foreground">
                We accept major credit cards, debit cards, and digital wallets.
                Payment is processed through Stripe, a secure third-party
                payment processor. We do not store credit card information on
                our servers.
              </p>

              <h3 className="mb-3 text-xl font-semibold">
                6.2 Payment Schedule
              </h3>
              <ul className="mb-4 ml-6 list-disc space-y-2 text-muted-foreground">
                <li>Boarding: Full payment due at booking</li>
                <li>
                  Add-ons: Payment due at booking or added to the active
                  reservation
                </li>
                <li>
                  Extended stays (14+ nights): Discount applied at checkout
                  summary
                </li>
                <li>
                  Multi-dog stays: Same-family discount applied to approved
                  suite combinations
                </li>
              </ul>

              <h3 className="mb-3 text-xl font-semibold">
                6.3 Additional Fees
              </h3>
              <p className="mb-4 text-muted-foreground">
                Late pickup fees ($25 per 30 minutes after 8 PM), early drop-off
                fees ($15), and holiday surcharges (20%) apply as stated in our
                Policies and are disclosed before processing whenever added to a
                booking. Emergency veterinary care costs are the client&apos;s
                responsibility.
              </p>
              <p className="mb-4 text-muted-foreground">
                {settings.trustCopySettings.pricingDisclosure}
              </p>

              <h3 className="mb-3 text-xl font-semibold">
                6.4 Returned Payments
              </h3>
              <p className="mb-4 text-muted-foreground">
                Returned payments due to insufficient funds or closed accounts
                will incur a $35 fee. Services may be suspended until payment is
                resolved.
              </p>
            </div>

            {/* Cancellation and Refunds */}
            <div className="mb-12">
              <h2 className="mb-4 text-2xl font-bold">
                7. Cancellation and Refund Policy
              </h2>
              <ul className="ml-6 list-disc space-y-2 text-muted-foreground">
                <li>
                  <strong>{cancellationSettings.fullRefundHours}+ hours notice:</strong>{" "}
                  {fullRefundLine.replace(`${cancellationSettings.fullRefundHours}+ hours before check-in: `, "")}
                </li>
                <li>
                  <strong>{cancellationSettings.partialRefundHours}-{cancellationSettings.fullRefundHours} hours notice:</strong>{" "}
                  {partialRefundLine.replace(`${cancellationSettings.partialRefundHours}-${cancellationSettings.fullRefundHours} hours before check-in: `, "")}
                </li>
                <li>
                  <strong>Less than {cancellationSettings.partialRefundHours} hours:</strong>{" "}
                  {noRefundLine.replace(`Less than ${cancellationSettings.partialRefundHours} hours before check-in: `, "")}
                </li>
                <li>
                  <strong>No-show:</strong>{" "}
                  {noShowLine}
                </li>
              </ul>
              <p className="mt-4 text-muted-foreground">
                {CANCELLATION_POLICY_COPY.processing}
              </p>
            </div>

            {/* Liability and Insurance */}
            <div className="mb-12">
              <h2 className="mb-4 text-2xl font-bold">
                8. Liability and Insurance
              </h2>

              <h3 className="mb-3 text-xl font-semibold">
                8.1 Limitation of Liability
              </h3>
              <p className="mb-4 text-muted-foreground">
                While we maintain high safety standards, dogs at play may
                sustain minor injuries (scratches, scrapes, bumps). We will
                notify you of any injuries and provide necessary first aid.
                Zaine&apos;s Stay & Play is not liable for injuries resulting
                from normal dog behavior during supervised play.
              </p>

              <h3 className="mb-3 text-xl font-semibold">8.2 Emergency Care</h3>
              <p className="mb-4 text-muted-foreground">
                You authorize Zaine&apos;s Stay & Play to seek emergency
                veterinary care if necessary. We will make reasonable efforts to
                contact you first. All veterinary expenses are your
                responsibility. We are not liable for treatment decisions made
                by veterinary professionals.
              </p>

              <h3 className="mb-3 text-xl font-semibold">
                8.3 Property Damage
              </h3>
              <p className="mb-4 text-muted-foreground">
                You are liable for any damage your pet causes to our facility,
                equipment, or other pets. You agree to reimburse us for repair
                or replacement costs.
              </p>

              <h3 className="mb-3 text-xl font-semibold">
                8.4 Loss of Personal Items
              </h3>
              <p className="mb-4 text-muted-foreground">
                We are not responsible for lost, stolen, or damaged personal
                property including collars, leashes, toys, or bedding. Label all
                items and do not bring valuable or sentimental items.
              </p>

              <h3 className="mb-3 text-xl font-semibold">
                8.5 Maximum Liability
              </h3>
              <p className="mb-4 text-muted-foreground">
                Our total liability for any claim shall not exceed the amount
                paid for services during the 30 days preceding the incident. We
                maintain commercial liability insurance, but coverage is subject
                to policy terms and limitations.
              </p>
            </div>

            {/* Intellectual Property */}
            <div className="mb-12">
              <h2 className="mb-4 text-2xl font-bold">
                9. Intellectual Property
              </h2>
              <p className="mb-4 text-muted-foreground">
                All content on our website including text, graphics, logos,
                images, videos, and software is owned by Zaine's Stay & Play and
                protected by copyright and trademark laws. You may not
                reproduce, distribute, or create derivative works without
                written permission.
              </p>
              <p className="text-muted-foreground">
                By providing photos, videos, or testimonials, you grant us a
                non-exclusive, royalty-free license to use this content for
                marketing purposes on our website, social media, and promotional
                materials.
              </p>
            </div>

            {/* Privacy */}
            <div className="mb-12">
              <h2 className="mb-4 text-2xl font-bold">10. Privacy</h2>
              <p className="text-muted-foreground">
                Your use of our services is also governed by our Privacy Policy,
                which explains how we collect, use, and protect your personal
                information. By using our services, you consent to our privacy
                practices as described in the Privacy Policy.
              </p>
            </div>

            {/* Termination */}
            <div className="mb-12">
              <h2 className="mb-4 text-2xl font-bold">
                11. Termination of Services
              </h2>
              <p className="mb-4 text-muted-foreground">
                We reserve the right to refuse or terminate services at any time
                for the following reasons:
              </p>
              <ul className="ml-6 list-disc space-y-2 text-muted-foreground">
                <li>Violation of these Terms or our Policies</li>
                <li>Aggressive or dangerous behavior by pet or owner</li>
                <li>Non-payment or repeated late payments</li>
                <li>
                  Providing false information about pet&apos;s health or
                  behavior
                </li>
                <li>Abusive or inappropriate conduct toward staff</li>
              </ul>
              <p className="mt-4 text-muted-foreground">
                Upon termination, you must immediately pick up your pet. Prepaid
                services will be refunded on a prorated basis, minus any fees
                owed.
              </p>
            </div>

            {/* Dispute Resolution */}
            <div className="mb-12">
              <h2 className="mb-4 text-2xl font-bold">
                12. Dispute Resolution
              </h2>

              <h3 className="mb-3 text-xl font-semibold">
                12.1 Informal Resolution
              </h3>
              <p className="mb-4 text-muted-foreground">
                If you have a dispute, please contact us first to attempt
                informal resolution. We&apos;re committed to resolving issues
                fairly and quickly.
              </p>

              <h3 className="mb-3 text-xl font-semibold">12.2 Arbitration</h3>
              <p className="mb-4 text-muted-foreground">
                Any disputes not resolved informally shall be resolved through
                binding arbitration in accordance with the rules of the American
                Arbitration Association. Arbitration will take place in
                Syracuse, New York.
              </p>

              <h3 className="mb-3 text-xl font-semibold">
                12.3 Class Action Waiver
              </h3>
              <p className="mb-4 text-muted-foreground">
                You agree to resolve disputes on an individual basis only. You
                waive any right to participate in class action lawsuits or
                class-wide arbitration.
              </p>
            </div>

            {/* General Provisions */}
            <div className="mb-12">
              <h2 className="mb-4 text-2xl font-bold">
                13. General Provisions
              </h2>

              <h3 className="mb-3 text-xl font-semibold">13.1 Governing Law</h3>
              <p className="mb-4 text-muted-foreground">
                These Terms are governed by the laws of the State of New York,
                without regard to conflict of law principles.
              </p>

              <h3 className="mb-3 text-xl font-semibold">13.2 Severability</h3>
              <p className="mb-4 text-muted-foreground">
                If any provision of these Terms is found to be unenforceable,
                the remaining provisions shall continue in effect.
              </p>

              <h3 className="mb-3 text-xl font-semibold">
                13.3 Entire Agreement
              </h3>
              <p className="mb-4 text-muted-foreground">
                These Terms, along with our Privacy Policy and Policies page,
                constitute the entire agreement between you and Zaine&apos;s
                Stay & Play regarding our services.
              </p>

              <h3 className="mb-3 text-xl font-semibold">13.4 Amendments</h3>
              <p className="mb-4 text-muted-foreground">
                We reserve the right to modify these Terms at any time. Changes
                will be effective upon posting to our website with an updated
                &quot;Last Updated&quot; date. Continued use of our services
                after changes constitutes acceptance of the updated Terms.
              </p>

              <h3 className="mb-3 text-xl font-semibold">13.5 Waiver</h3>
              <p className="mb-4 text-muted-foreground">
                Our failure to enforce any provision of these Terms does not
                constitute a waiver of that provision or our right to enforce it
                in the future.
              </p>
            </div>

            {/* Contact */}
            <div>
              <h2 className="mb-4 text-2xl font-bold">
                14. Contact Information
              </h2>
              <p className="mb-4 text-muted-foreground">
                For questions about these Terms of Service, please contact us:
              </p>
              <div className="rounded-lg bg-muted p-6">
                <p className="mb-2">
                  <strong>Zaine&apos;s Stay & Play LLC</strong>
                </p>
                <p className="mb-2">Syracuse, NY</p>
                <p className="mb-2">Email: legal@zainesstayandplay.com</p>
                <p>Phone: (315) 765-7297</p>
              </div>
            </div>

            {/* Acknowledgment */}
            <div className="mt-12 rounded-lg border-2 border-primary bg-primary/5 p-6">
              <h3 className="mb-3 text-xl font-bold">Acknowledgment</h3>
              <p className="text-muted-foreground">
                BY BOOKING SERVICES WITH ZAINE&apos;S STAY & PLAY, YOU
                ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE
                BOUND BY THESE TERMS OF SERVICE.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-16 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold">
            Questions About Our Terms?
          </h2>
          <p className="mb-8 text-lg opacity-90">
            We&apos;re here to clarify any questions you may have
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
              <Link href="/privacy">View Privacy Policy</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
