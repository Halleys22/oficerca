import { Explorer } from "@/components/professionals";
import { publicProfessionals } from "@/lib/queries";
export const metadata = { title: "Encuentra un profesional" };
export default async function Professionals({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  return <Explorer professionals={publicProfessionals()} query={(await searchParams).q} />;
}
