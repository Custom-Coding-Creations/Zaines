import { prisma } from "@/lib/prisma";

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
      update: SuiteSeed;
      create: SuiteSeed;
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

  const activeSuiteCount = await suiteDelegate.count({
    where: { isActive: true },
  });

  if (activeSuiteCount > 0) {
    return activeSuiteCount;
  }

  await Promise.all(
    DEFAULT_SUITES.map((suite) =>
      suiteDelegate.upsert({
        where: { id: suite.id },
        update: suite,
        create: suite,
      }),
    ),
  );

  return DEFAULT_SUITES.length;
}