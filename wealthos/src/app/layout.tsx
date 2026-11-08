import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { ServiceWorker } from "@/components/app/service-worker";
import { THEME_COOKIE } from "@/server/auth/context";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: { default: `${BRAND} — financial intelligence for your wealth`, template: `%s · ${BRAND}` },
  description: "Track every account, holding and liability; measure performance properly; research and plan with evidence. Non-custodial. Built for Nigeria first.",
  robots: { index: false, follow: false },
  applicationName: BRAND,
  icons: { icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }, { url: "/icons/icon-192.png", sizes: "192x192" }], apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: BRAND, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  // Dark is the default for every visitor (Paruto standard); light is opt-in.
  themeColor: "#060608",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = (await cookies()).get(THEME_COOKIE)?.value;
  const dataTheme = theme === "light" ? "light" : "dark";
  return (
    <html lang="en" data-theme={dataTheme} suppressHydrationWarning>
      <body className="min-h-dvh">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
        <div className="aura" aria-hidden />
        <div className="grain" aria-hidden />
        <ServiceWorker />
      </body>
    </html>
  );
}
