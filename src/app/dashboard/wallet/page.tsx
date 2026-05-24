import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAdminSettings } from "@/lib/api/admin-settings";
import { isDatabaseConfigured } from "@/lib/prisma";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardUnavailableState } from "@/components/dashboard/dashboard-states";
import { WalletManager } from "./wallet-manager";
import { PawPointsWidget } from "@/components/loyalty/PawPointsWidget";
import { getFeatureFlag } from "@/lib/feature-flags";
import { getPointsBalance, getLoyaltyTransactions } from "@/lib/loyalty/paw-points";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Wallet | Dashboard",
  description: "Manage payment methods and your Paw Points loyalty balance.",
};

export default async function WalletPage() {
  const session = await auth();
  if (!session?.user?.id) return redirect("/auth/signin");

  const settings = await getAdminSettings();
  const loyaltyEnabled =
    getFeatureFlag("loyalty-program", session.user.id) &&
    settings.loyaltyProgramSettings.enabled;

  // Fetch loyalty data server-side when enabled
  let loyaltyData: {
    balance: number;
    tier: string;
    transactions: Awaited<ReturnType<typeof getLoyaltyTransactions>>;
  } | null = null;

  if (loyaltyEnabled && isDatabaseConfigured()) {
    const [balance, transactions, user] = await Promise.all([
      getPointsBalance(session.user.id),
      getLoyaltyTransactions(session.user.id, 10),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { loyaltyTier: true },
      }),
    ]);
    loyaltyData = {
      balance,
      tier: user?.loyaltyTier ?? "pup",
      transactions,
    };
  }

  if (!settings.stripeCapabilityFlags.savedPaymentMethodsEnabled && !loyaltyEnabled) {
    return (
      <DashboardUnavailableState
        title="Wallet unavailable"
        description="Saved payment methods are not enabled in this environment."
      />
    );
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow="Billing"
        title="Wallet"
        description="Manage payment methods and your Paw Points loyalty rewards."
        className="luxury-shell"
      />

      {/* Loyalty section */}
      {loyaltyEnabled && loyaltyData && (
        <PawPointsWidget
          balance={loyaltyData.balance}
          tier={loyaltyData.tier}
          transactions={loyaltyData.transactions}
          loyaltySettings={settings.loyaltyProgramSettings}
        />
      )}

      {/* Payment wallet section */}
      {settings.stripeCapabilityFlags.savedPaymentMethodsEnabled && (
        <div className="rounded-2xl border border-border/70 bg-card/70 p-4 md:p-5">
          <WalletManager />
        </div>
      )}
    </div>
  );
}

