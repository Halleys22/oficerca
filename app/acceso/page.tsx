import { AuthForm } from "@/components/auth-form";
import { demoAllowed } from "@/lib/accounts";
export const metadata = { title: "Tu espacio" };
export default async function Access({
  searchParams,
}: {
  searchParams: Promise<{ modo?: string; rol?: string; next?: string }>;
}) {
  const q = await searchParams;
  return (
    <AuthForm register={q.modo === "registro"} role={q.rol} next={q.next} demo={demoAllowed()} />
  );
}
