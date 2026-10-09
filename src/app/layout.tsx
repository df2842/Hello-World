import type { Metadata } from "next";
import { Anton, Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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

const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Humor Project",
  description: "COMS E6998 - Design for Generative AI",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${anton.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <NavBar />
        {children}
        <footer className="border-t border-border py-6 text-center text-xs text-muted">
          <p>Built with Next.js, Supabase, Gemini Flash-Lite and Vercel</p>
          <p className="mt-2 space-x-3">
            <Link href="/jokes" className="hover:text-primary">
              Week 2: Jokes table
            </Link>
            <Link href="/profile" className="hover:text-primary">
              Week 3: Profile
            </Link>
            <a href="https://github.com/df2842/Hello-World" className="hover:text-primary">
              Source on GitHub
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}
