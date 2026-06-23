"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, PenLine, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmailSenderTab } from "./EmailSenderTab";
import { EmailSignatureTab } from "./EmailSignatureTab";
import { EmailTemplatesTab } from "./EmailTemplatesTab";

type Section = "sender" | "signature" | "templates";

const SECTIONS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: "sender", label: "Sender Identity", icon: <Mail className="h-4 w-4" /> },
  { id: "signature", label: "Email Signature", icon: <PenLine className="h-4 w-4" /> },
  { id: "templates", label: "Templates", icon: <FileText className="h-4 w-4" /> },
];

export function EmailInboxSettingsPanel() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const section = (searchParams.get("section") as Section) ?? "sender";

  function setSection(s: Section) {
    router.push(`/admin/inbox/settings?section=${s}`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/inbox">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Inbox
          </Link>
        </Button>
      </div>
      <div>
        <h1 className="text-2xl font-semibold">Email Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure sender identity, email signature, and manage templates.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <nav className="md:w-48 shrink-0">
          <ul className="space-y-1">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => setSection(s.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                    section === s.id
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {s.icon}
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {section === "sender" && <EmailSenderTab />}
          {section === "signature" && <EmailSignatureTab />}
          {section === "templates" && <EmailTemplatesTab />}
        </div>
      </div>
    </div>
  );
}
