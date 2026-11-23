import { pageUser } from "@/lib/auth";
import { workspace } from "@/lib/queries";
import { Dashboard } from "@/components/dashboard";
export const metadata = { title: "Mi espacio" };
export default async function Panel({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await pageUser();
  return <Dashboard data={workspace(user)} tab={(await searchParams).tab} />;
}
