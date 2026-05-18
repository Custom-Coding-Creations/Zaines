import { isDatabaseConfigured, prisma } from "../src/lib/prisma";

type Candidate = {
  id: string;
  email: string;
  normalizedEmail: string;
};

function parseApplyFlag(argv: string[]): boolean {
  return argv.includes("--apply");
}

async function main() {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured. Set it before running this script.");
  }

  const apply = parseApplyFlag(process.argv.slice(2));

  const users = await prisma.user.findMany({
    where: {
      email: {
        not: null,
      },
    },
    select: {
      id: true,
      email: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const candidates: Candidate[] = users
    .filter((user): user is { id: string; email: string } => Boolean(user.email))
    .map((user) => ({
      id: user.id,
      email: user.email,
      normalizedEmail: user.email.trim().toLowerCase(),
    }))
    .filter((user) => user.email !== user.normalizedEmail);

  const idsByNormalized = new Map<string, string[]>();
  for (const user of users) {
    if (!user.email) continue;
    const normalized = user.email.trim().toLowerCase();
    const current = idsByNormalized.get(normalized) ?? [];
    current.push(user.id);
    idsByNormalized.set(normalized, current);
  }

  const conflicts = candidates.filter((candidate) => {
    const ids = idsByNormalized.get(candidate.normalizedEmail) ?? [];
    return ids.some((id) => id !== candidate.id);
  });

  const conflictIds = new Set(conflicts.map((candidate) => candidate.id));
  const updatable = candidates.filter((candidate) => !conflictIds.has(candidate.id));

  let updatedCount = 0;
  const updateFailures: Array<{ id: string; from: string; to: string; error: string }> = [];

  if (apply) {
    for (const candidate of updatable) {
      try {
        await prisma.user.update({
          where: { id: candidate.id },
          data: { email: candidate.normalizedEmail },
        });
        updatedCount += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        updateFailures.push({
          id: candidate.id,
          from: candidate.email,
          to: candidate.normalizedEmail,
          error: message,
        });
      }
    }
  }

  const summary = {
    mode: apply ? "apply" : "dry-run",
    totalUsersWithEmail: users.length,
    mixedCaseOrTrimmedEmails: candidates.length,
    eligibleForNormalization: updatable.length,
    conflicts: conflicts.length,
    updated: updatedCount,
    failedUpdates: updateFailures.length,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (conflicts.length > 0) {
    console.log("\nConflicts (manual resolution required before normalization):");
    for (const candidate of conflicts) {
      const ids = idsByNormalized.get(candidate.normalizedEmail) ?? [];
      console.log(
        JSON.stringify(
          {
            id: candidate.id,
            from: candidate.email,
            normalizedEmail: candidate.normalizedEmail,
            conflictingUserIds: ids.filter((id) => id !== candidate.id),
          },
          null,
          2,
        ),
      );
    }
  }

  if (updateFailures.length > 0) {
    console.log("\nFailed updates:");
    for (const failure of updateFailures) {
      console.log(JSON.stringify(failure, null, 2));
    }
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("Email normalization failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
