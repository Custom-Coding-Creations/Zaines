import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { readFileSync } from "fs";

for (const line of readFileSync(".env", "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq === -1) continue;
  let val = t.slice(eq + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
  process.env[t.slice(0, eq).trim()] = val;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const photoDigestHtml = `
<div style="font-family: Georgia, serif; color: #18212a; line-height: 1.6; max-width: 620px; margin: 0 auto;">
  <h1 style="margin-bottom: 8px;">📸 Buddy's Daily Photos</h1>
  <p style="color: #4e5a67; margin-top: 0;">Here are today's photos from Buddy's stay — Jun 22, 2026.</p>
  <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
    <tr>
      <td style="padding: 4px; width: 33.3%;">
        <img src="https://placehold.co/280x200/dbeafe/3b82f6?text=Morning+Play" alt="Morning playtime" style="width: 100%; border-radius: 8px; display: block;" />
        <p style="margin: 6px 0 0; font-size: 13px; color: #64748b; text-align: center;">Morning playtime</p>
      </td>
      <td style="padding: 4px; width: 33.3%;">
        <img src="https://placehold.co/280x200/dcfce7/16a34a?text=Afternoon+Nap" alt="Afternoon nap" style="width: 100%; border-radius: 8px; display: block;" />
        <p style="margin: 6px 0 0; font-size: 13px; color: #64748b; text-align: center;">Afternoon nap</p>
      </td>
      <td style="padding: 4px; width: 33.3%;">
        <img src="https://placehold.co/280x200/fef3c7/d97706?text=Evening+Walk" alt="Evening walk" style="width: 100%; border-radius: 8px; display: block;" />
        <p style="margin: 6px 0 0; font-size: 13px; color: #64748b; text-align: center;">Evening walk</p>
      </td>
    </tr>
  </table>
  <p style="text-align: center; margin: 24px 0;">
    <a href="#" style="display: inline-block; background: #111827; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600;">View All Photos in Dashboard</a>
  </p>
  <p style="font-size: 13px; color: #64748b; text-align: center;">
    3 photos · Zaine's Stay &amp; Play · Jun 22, 2026
  </p>
</div>
`;

const result = await prisma.emailLog.updateMany({
  where: { resendId: "ad5fd68f-ace1-4880-874d-931b6d342bac" },
  data: { html: photoDigestHtml.trim() },
});

console.log(`Updated ${result.count} photo_digest record(s)`);
await prisma.$disconnect();
await pool.end();
