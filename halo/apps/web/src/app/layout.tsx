import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Nav } from "@/components/nav";

// BlueWell Typography - Inter for calm, readable text
const inter = Inter({ 
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BlueWell - Wellness Made Simple",
  description: "A calm, minimal wellness assistant for extremely busy people",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased bg-neutral-bg text-neutral-text">
        <Providers>
          {children}
          <Nav />
        </Providers>
      </body>
    </html>
  );
}

