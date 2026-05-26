import { CrmCustomersTable } from "@/components/admin/CrmCustomersTable";
import { CrmAudienceBuilder } from "@/components/admin/CrmAudienceBuilder";

export default function AdminCrmPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">CRM</h1>
        <p className="text-sm text-muted-foreground">
          Customer search, 360 profiles, notes, and internal task coordination.
        </p>
      </div>

      <CrmCustomersTable />
      <CrmAudienceBuilder />
    </div>
  );
}