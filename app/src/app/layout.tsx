import type { Metadata } from "next";
import "./globals.css";
import { WalletProviders } from "./providers";

export const metadata: Metadata = {
  title: "Solana Counter",
  description: "A simple Solana counter dApp",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white min-h-screen">
        <WalletProviders>{children}</WalletProviders>
      </body>
    </html>
  );
}
