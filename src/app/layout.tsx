import type { Metadata } from "next";
// Open Sans, the closest open-licence match to the kitawisata wordmark. Self-hosted (OFL-1.1)
// so builds never depend on reaching Google Fonts.
import "@fontsource-variable/open-sans";
import "./globals.css";
import { getLocale } from "@/i18n/server";
import { I18nProvider } from "@/i18n/client";

export const metadata: Metadata = {
  title: "kitawisata",
  description: "Corporate and leisure travel booking · Pemesanan perjalanan dinas dan wisata",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className="font-sans antialiased">
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
