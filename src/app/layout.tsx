import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

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
    // The font variable must sit on <html>: the theme's --font-sans is resolved there.
    <html lang="en" className={jakarta.variable}>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
