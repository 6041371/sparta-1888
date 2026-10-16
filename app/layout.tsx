import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Literata, Outfit } from "next/font/google";
import "./globals.css";

const ui = Outfit({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-ui" });
const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});
const serif = Literata({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: "Sparta Rotterdam — Het Geheim van 1888",
  description: "Een interactieve reis door de geschiedenis van Sparta Rotterdam. De verdwijning en de verdachten zijn fictie.",
  robots: { index: false, follow: false },
  applicationName: "Het Geheim van 1888",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#8D1D2C",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`${ui.variable} ${display.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
