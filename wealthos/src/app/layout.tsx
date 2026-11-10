import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { cookies, headers } from "next/headers";
import "./globals.css";
import { ServiceWorker } from "@/components/app/service-worker";
import { BRAND } from "@/lib/brand";
import { APPEARANCE_SCRIPT, DEPTH_COOKIE, THEME_COOKIE, isDepth, isTheme, themeColor } from "@/lib/appearance";
import { LAUNCH_SCRIPT, LaunchScreen } from "@/components/pwa/launch-screen";
import { LaunchHandoff } from "@/components/pwa/launch-handoff";
import { UpdateNudge } from "@/components/pwa/update-nudge";
import { ConnectionStatus } from "@/components/pwa/connection";
import { PressFeedback } from "@/components/app/press-feedback";

export const metadata: Metadata = {
  title: { default: `${BRAND} — financial intelligence for your wealth`, template: `%s · ${BRAND}` },
  description: "Track every account, holding and liability; measure performance properly; research and plan with evidence. Non-custodial. Built for Nigeria first.",
  robots: { index: false, follow: false },
  applicationName: BRAND,
  icons: { icon: [{ url: "/icons/favicon-48.png", sizes: "48x48", type: "image/png" }, { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }], apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: BRAND, statusBarStyle: "default" },
};

export async function generateViewport(): Promise<Viewport> {
  const jar = await cookies();
  const theme = jar.get(THEME_COOKIE)?.value;
  const depth = jar.get(DEPTH_COOKIE)?.value;
  return { themeColor: themeColor(theme === "light" ? "light" : "dark", isDepth(depth) ? depth : "night") };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const raw = jar.get(THEME_COOKIE)?.value;
  // Dark is the default for every visitor (Paruto standard); light and System are opt-in.
  const pref = isTheme(raw) ? raw : "dark";
  const depthRaw = jar.get(DEPTH_COOKIE)?.value;
  const depth = isDepth(depthRaw) ? depthRaw : "night";
  return (
    <html lang="en" data-theme={pref === "light" ? "light" : "dark"} data-theme-pref={pref} data-depth={depth} suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: APPEARANCE_SCRIPT + LAUNCH_SCRIPT }} />
      </head>
      <body className="min-h-dvh">
        <LaunchScreen />
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
        <div className="aura" aria-hidden />
        <div className="grain" aria-hidden />
        <ServiceWorker />
        <ConnectionStatus />
        <UpdateNudge />
        <Suspense fallback={null}>
          <PressFeedback />
        </Suspense>
        <LaunchHandoff />
      </body>
    </html>
  );
}
