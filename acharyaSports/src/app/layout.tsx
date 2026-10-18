import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/sports/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "acharyaSports — Live Sports Streaming",
  description:
    "Watch live sports, upcoming matches and 24/7 sports channels from around the world. Free, fast and modern — powered by acharyaSports.",
  keywords: [
    "acharyaSports",
    "live sports",
    "streaming",
    "live TV",
    "football",
    "soccer",
    "basketball",
    "motorsport",
    "24/7 channels",
  ],
  authors: [{ name: "acharyaSports" }],
  openGraph: {
    title: "acharyaSports — Live Sports Streaming",
    description: "Live matches, upcoming events and 24/7 sports channels.",
    siteName: "acharyaSports",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "acharyaSports — Live Sports Streaming",
    description: "Live matches, upcoming events and 24/7 sports channels.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
