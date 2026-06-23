import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { readFileSync } from "fs";

// Load .env
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

// Use the shared generator so compose templates always have {{variable}} placeholders
const { getAllTemplateTypes } = await import("../src/lib/email-template-html.js");
const templates = getAllTemplateTypes();

let upserted = 0;
for (const t of templates) {
  await prisma.emailTemplate.upsert({
    where: { type: t.type },
    update: { subject: t.subject, html: t.html }, // update on re-seed so {{variable}} templates propagate
    create: {
      type: t.type,
      name: t.name,
      subject: t.subject,
      html: t.html,
      isSystem: true,
      isEnabled: true,
    },
  });
  upserted++;
  console.log(`  ✓ ${t.type}: ${t.name}`);
}

console.log(`\nUpserted ${upserted} email templates ({{variable}} placeholders)`);
await prisma.$disconnect();
await pool.end();
