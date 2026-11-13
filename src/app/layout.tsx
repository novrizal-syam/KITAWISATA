import type { Metadata } from "next";
// Self-hosted (OFL-1.1) so builds never depend on reaching Google Fonts.
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "KITA WISATA",
  description: "Corporate and leisure travel booking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
