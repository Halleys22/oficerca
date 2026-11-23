import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { currentUser } from "@/lib/auth";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "OFICERCA · Tu problema, en buenas manos", template: "%s · OFICERCA" },
  description:
    "Encuentra ayuda para tu hogar, aunque no sepas qué ocurre. Fontanería doméstica en Cáceres. Alpha local.",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <html lang="es">
      <body>
        <a className="skip-link" href="#contenido">
          Saltar al contenido
        </a>
        <Header user={user} />
        <main id="contenido">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
