import { prisma } from "@/lib/prisma";
import { getAdminSettings } from "@/lib/api/admin-settings";

type SuiteSeed = {
  id: string;
  name: string;
  tier: string;
  size: string;
  capacity: number;
  pricePerNight: number;
  amenities: string[];
  isActive: boolean;
};

type SuiteBootstrapPrisma = {
  suite: {
    count: (args: { where: { isActive: boolean } }) => Promise<number>;
    upsert: (args: {
      where: { id: string };
      update: Partial<SuiteSeed>;
      create: SuiteSeed;
    }) => Promise<unknown>;
    updateMany: (args: {
      where: { id: { notIn: string[] }; isActive: boolean };
      data: { isActive: boolean };
    }) => Promise<unknown>;
  };
};

export const DEFAULT_SUITES: SuiteSeed[] = [
  {
    id: "suite-standard-1",
    name: "Standard Suite",
    tier: "standard",
    size: "medium",
    capacity: 3,
    pricePerNight: 65,
    amenities: ["raised_bed"],
    isActive: true,
  },
];

/**
 * Syncs the Suite table with the current Settings configuration.
 * Creates/updates Suite rows to match active service tiers from Settings,
 * and deactivates any Suite rows that no longer correspond to a configured tier.
 */
export async function ensureDefaultSuites(
  prismaClient: SuiteBootstrapPrisma = prisma as unknown as SuiteBootstrapPrisma,
): Promise<number> {
  const suiteDelegate = prismaClient?.suite;
  if (
    !suiteDelegate ||
    typeof suiteDelegate.count !== "function" ||
    typeof suiteDelegate.upsert !== "function"
  ) {
    // Some unit tests provide partial prisma mocks without suite support.
    // Skip bootstrap in that scenario instead of throwing.
    return 0;
  }

  // Try to read Settings for the authoritative tier configuration
  let suitesToSync: SuiteSeed[] = DEFAULT_SUITES;
  try {
    const settings = await getAdminSettings();
    const activeTiers = settings.serviceSettings.serviceTiers.filter((t) => t.isActive);
    if (activeTiers.length > 0) {
      suitesToSync = activeTiers.map((tier) => ({
        id: `suite-${tier.id.replace('-suite', '')}-1`,
        name: tier.name,
        tier: tier.id.replace('-suite', ''),
        size: tier.id.includes('luxury') ? 'large' : tier.id.includes('deluxe') ? 'large' : 'medium',
        capacity: tier.capacity || 1,
        pricePerNight: tier.baseNightlyRate,
        amenities: ["raised_bed"],
        isActive: true,
      }));
    }
  } catch {
    // If Settings can't be read (e.g., during initial bootstrap), use hardcoded defaults
  }

  // Upsert all configured suites
  await Promise.all(
    suitesToSync.map((suite) =>
      suiteDelegate.upsert({
        where: { id: suite.id },
        update: {
          name: suite.name,
          tier: suite.tier,
          size: suite.size,
          capacity: suite.capacity,
          pricePerNight: suite.pricePerNight,
          isActive: suite.isActive,
        },
        create: suite,
      }),
    ),
  );

  // Deactivate any suites that are no longer in Settings
  const activeSuiteIds = suitesToSync.map((s) => s.id);
  if (typeof suiteDelegate.updateMany === 'function') {
    await suiteDelegate.updateMany({
      where: { id: { notIn: activeSuiteIds }, isActive: true },
      data: { isActive: false },
    });
  }

  return suitesToSync.length;
}