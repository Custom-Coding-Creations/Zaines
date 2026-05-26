import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { getRecentContactSubmissions } from "@/lib/api/issue26";

async function main() {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const submissions = await getRecentContactSubmissions(5000);
  let importedCount = 0;
  let skippedCount = 0;

  for (const submission of submissions) {
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: submission.email,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (!user) {
      skippedCount += 1;
      continue;
    }

    for (const message of submission.conversation) {
      const sourceReference = `${submission.submissionId}:${message.messageId}`;
      const existing = await prisma.crmInteraction.findFirst({
        where: {
          sourceSystem: "contact_submission",
          sourceReference,
        },
        select: { id: true },
      });

      if (existing) {
        continue;
      }

      await prisma.crmInteraction.create({
        data: {
          userId: user.id,
          channel: "contact_form",
          direction: message.senderType === "staff" ? "outbound" : "inbound",
          content: message.content,
          subject: null,
          sourceSystem: "contact_submission",
          sourceReference,
          occurredAt: new Date(message.createdAt),
        },
      });
      importedCount += 1;
    }
  }

  console.log(`Imported CRM interactions: ${importedCount}`);
  console.log(`Skipped submissions without user match: ${skippedCount}`);
}

main()
  .catch((error) => {
    console.error("CRM contact submission backfill failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
