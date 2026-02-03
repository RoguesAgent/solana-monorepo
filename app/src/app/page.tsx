"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function Home() {
  const { connected } = useWallet();

  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-8 p-8">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
        Solana Counter
      </h1>

      <WalletMultiButton />

      {connected ? (
        <div className="flex flex-col items-center gap-6 p-8 rounded-2xl bg-gray-900 border border-gray-800">
          <p className="text-6xl font-mono font-bold">0</p>
          <div className="flex gap-4">
            <button className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 transition font-semibold">
              - Decrement
            </button>
            <button className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 transition font-semibold">
              + Increment
            </button>
          </div>
          <p className="text-sm text-gray-500">
            Connect to devnet and interact with the counter program
          </p>
        </div>
      ) : (
        <p className="text-gray-400">Connect your wallet to get started</p>
      )}
    </main>
  );
}
