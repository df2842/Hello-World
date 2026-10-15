import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import NavBar from "@/components/NavBar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Humor Project",
  description: "COMS E6998 - Design for Generative AI",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

/**
 * One-screen app shell: nav on top, the page fills exactly the rest of the
 * viewport. Pages size their content to fit instead of scrolling.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex h-dvh flex-col">
        <NavBar />
        {/* Pages are built to fit; on an unusually tiny window a thin scrollbar
            appears instead of hiding content. */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto [scrollbar-width:thin]">{children}</div>
      </body>
    </html>
  );
}
