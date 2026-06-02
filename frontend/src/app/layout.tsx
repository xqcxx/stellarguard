import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SecureExternalLink } from "@/components/SecureExternalLink";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import { FreighterProvider } from "@/context/FreighterProvider";
import { WalletConnect } from "@/components/WalletConnect";
import dynamic from "next/dynamic";

const DiagnosticsPanel = dynamic(() => import("@/components/DiagnosticsPanel").then(mod => ({ default: mod.DiagnosticsPanel })), {
  ssr: false,
});
import { ToastContainer } from "@/components/Toast";
import { NetworkMismatchBanner } from "@/components/NetworkMismatchBanner";
import { MobileNav } from "@/components/MobileNav";
import { RouteTracker } from "@/components/RouteTracker";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "StellarGuard — Decentralized Treasury Management",
  description:
    "Multi-signature treasury and DAO governance platform built on Stellar Soroban. Manage shared funds with configurable approval thresholds, proposal voting, and on-chain transparency.",
  keywords: [
    "Stellar",
    "Soroban",
    "DAO",
    "Treasury",
    "Multi-sig",
    "Governance",
    "DeFi",
    "Smart Contracts",
    "Blockchain",
  ],
  authors: [{ name: "StellarGuard Team" }],
  manifest: "/manifest.json",
  themeColor: "#1a2332",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "StellarGuard",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "StellarGuard — Decentralized Treasury Management",
    description: "Manage shared funds with configurable approval thresholds on Stellar Soroban.",
    type: "website",
    url: "https://stellarguard.io",
    siteName: "StellarGuard",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "StellarGuard - Decentralized Treasury Management",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "StellarGuard — Decentralized Treasury Management",
    description: "Manage shared funds with configurable approval thresholds on Stellar Soroban.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon-180.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetBrainsMono.variable} dark`}
    >
      <body className="min-h-screen bg-stellar-darker font-sans text-gray-100 selection:bg-stellar-blue/30">
        <a href="#main-content" className="skip-to-content">Skip to content</a>
        <FreighterProvider>
          <RouteTracker />
          <nav className="border-b border-white/5 bg-stellar-darker/60 backdrop-blur-xl sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-20 items-center">
                <Link href="/" className="flex items-center space-x-3 group cursor-pointer">
                  <div className="w-10 h-10 rounded-xl overflow-hidden shadow-stellar group-hover:scale-110 transition-transform duration-300">
                    <Image
                      src="/stellarguard-mark.svg"
                      alt="StellarGuard"
                      width={40}
                      height={40}
                      priority
                    />
                  </div>
                  <span className="text-2xl font-bold gradient-text tracking-tight">
                    StellarGuard
                  </span>
                </Link>
                
                <div className="hidden md:flex items-center space-x-1">
                  <Link href="/" className="nav-link px-4">Dashboard</Link>
                  <Link href="/treasury" className="nav-link px-4">Treasury</Link>
                  <Link href="/governance" className="nav-link px-4">Governance</Link>
                </div>

                <div className="flex items-center space-x-4">
                  <WalletConnect />
                  <MobileNav />
                </div>
              </div>
            </div>
          </nav>
          <NetworkMismatchBanner />
          
          <main id="main-content" tabIndex={-1} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 focus:outline-none">
            {children}
          </main>

          <footer className="border-t border-white/5 py-12 bg-stellar-darker">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center opacity-50 text-sm">
              <p>© 2026 StellarGuard. Built on Stellar Soroban.</p>
              <div className="flex space-x-8 mt-4 md:mt-0">
                <SecureExternalLink href="https://github.com/xqcxx/stellarguard#readme" className="hover:text-white transition-colors">Documentation</SecureExternalLink>
                <SecureExternalLink href="https://github.com/xqcxx/stellarguard" className="hover:text-white transition-colors">Github</SecureExternalLink>
                <SecureExternalLink href="https://github.com/xqcxx/stellarguard/discussions" className="hover:text-white transition-colors">Support</SecureExternalLink>
              </div>
            </div>
          </footer>
          <Toaster position="bottom-right" />
          <DiagnosticsPanel />
          <ToastContainer />
        </FreighterProvider>
      </body>
    </html>
  );
}
