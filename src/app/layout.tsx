import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { spectral, plexMono } from "@/lib/fonts";
import { ThemeProvider } from "@/lib/theme";
import { DEFAULT_THEME, THEME_COOKIE, type Theme } from "@/lib/theme-config";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "@/i18n/config";
import { RegisterServiceWorker } from "@/components/layout/RegisterServiceWorker";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reading Tracker",
  description: "Личный учёт чтения книг",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Reading Tracker",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#a2461f", // --accent, light theme
};

function readTheme(value: string | undefined): Theme {
  return value === "dark" ? "dark" : DEFAULT_THEME;
}

export default async function RootLayout({
  children,
}: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const theme = readTheme(cookieStore.get(THEME_COOKIE)?.value);
  const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeCookie) ? localeCookie : DEFAULT_LOCALE;

  return (
    <html
      lang={locale}
      data-theme={theme}
      className={`${spectral.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="h-full">
        <ThemeProvider initialTheme={theme}>
          <LocaleProvider initialLocale={locale}>
            {children}
            <RegisterServiceWorker />
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
