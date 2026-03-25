import type { Metadata } from "next";
import "./globals.css";
import { FreighterProvider } from "@/context/FreighterProvider";
import { WalletConnect } from "@/components/WalletConnect";


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
  openGraph: {
    title: "StellarGuard — Decentralized Treasury Management",
    description: "Manage shared funds with configurable approval thresholds on Stellar Soroban.",
    type: "website",
    url: "https://stellarguard.io",
    siteName: "StellarGuard",
  },
  twitter: {
    card: "summary_large_image",
    title: "StellarGuard — Decentralized Treasury Management",
    description: "Manage shared funds with configurable approval thresholds on Stellar Soroban.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-stellar-darker text-gray-100 selection:bg-stellar-blue/30">
        <FreighterProvider>
          <nav className="border-b border-white/5 bg-stellar-darker/60 backdrop-blur-xl sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-20 items-center">
                <div className="flex items-center space-x-3 group cursor-pointer">
                  <div className="w-10 h-10 bg-stellar-gradient rounded-xl flex items-center justify-center shadow-stellar group-hover:scale-110 transition-transform duration-300">
                    <span className="text-xl">🛡️</span>
                  </div>
                  <span className="text-2xl font-bold gradient-text tracking-tight">
                    StellarGuard
                  </span>
                </div>
                
                <div className="hidden md:flex items-center space-x-1">
                  <a href="/" className="nav-link px-4">Dashboard</a>
                  <a href="/treasury" className="nav-link px-4">Treasury</a>
                  <a href="/governance" className="nav-link px-4">Governance</a>
                </div>

                <div className="flex items-center space-x-6">
                  <WalletConnect />
                </div>
              </div>
            </div>
          </nav>
          
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {children}
          </main>

          <footer className="border-t border-white/5 py-12 bg-stellar-darker">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center opacity-50 text-sm">
              <p>© 2026 StellarGuard. Built on Stellar Soroban.</p>
              <div className="flex space-x-8 mt-4 md:mt-0">
                <a href="#" className="hover:text-white transition-colors">Documentation</a>
                <a href="#" className="hover:text-white transition-colors">Github</a>
                <a href="#" className="hover:text-white transition-colors">Support</a>
              </div>
            </div>
          </footer>
        </FreighterProvider>
      </body>
    </html>
  );
}
