import { CrmCustomerProfile } from "@/components/admin/CrmCustomerProfile";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminCrmCustomerPage({ params }: PageProps) {
  const { id } = await params;

  return <CrmCustomerProfile customerId={id} />;
}