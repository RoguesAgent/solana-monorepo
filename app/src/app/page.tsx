"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const LAMPORTS_PER_SOL = 1_000_000_000;

interface RoundInfo {
  roundNumber: number;
  players: Array<string>;
  totalPot: number;
  startTime: number;
  status: string;
  winner: string;
}

interface GameInfo {
  admin: string;
  wagerAmount: number;
  maxPlayersPerRound: number;
  roundDuration: number;
  currentRoundNumber: number;
  feeBasisPoints: number;
}

interface HistoryEntry {
  roundNumber: number;
  winner: string;
  pot: number;
  playerCount: number;
}

export default function Home() {
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();

  const [game, setGame] = useState<GameInfo | null>(null);
  const [currentRound, setCurrentRound] = useState<RoundInfo | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [roundHistory, setRoundHistory] = useState<Array<HistoryEntry>>([]);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Placeholder: In production, this would fetch from the program
  const formatSol = useCallback((lamports: number): string => {
    return (lamports / LAMPORTS_PER_SOL).toFixed(4);
  }, []);

  const truncateAddress = useCallback((address: string): string => {
    if (address.length <= 8) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!currentRound || !game) return;

    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const endTime = currentRound.startTime + game.roundDuration;
      const remaining = Math.max(0, endTime - now);
      setTimeRemaining(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentRound, game]);

  const formatTime = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const isRoundCloseable =
    currentRound &&
    game &&
    (currentRound.players.length >= game.maxPlayersPerRound ||
      timeRemaining === 0) &&
    currentRound.players.length >= 2 &&
    currentRound.status === "open";

  const hasPlayerJoined =
    currentRound &&
    publicKey &&
    currentRound.players.some((player) => player === publicKey.toBase58());

  const handlePlaceWager = async () => {
    if (!connected || !publicKey) {
      setStatusMessage("Please connect your wallet first");
      return;
    }
    setIsLoading(true);
    setStatusMessage("Placing wager... (connect to localnet with program deployed)");
    // TODO: Integrate with actual program via Codama client
    setTimeout(() => setIsLoading(false), 1000);
  };

  const handleCloseRound = async () => {
    if (!connected || !publicKey) {
      setStatusMessage("Please connect your wallet first");
      return;
    }
    setIsLoading(true);
    setStatusMessage("Closing round... (connect to localnet with program deployed)");
    // TODO: Integrate with actual program via Codama client
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-8 p-8">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
        ⚡ Solana Wager
      </h1>

      <WalletMultiButton />

      {connected ? (
        <div className="flex flex-col items-center gap-6 w-full max-w-lg">
          {/* Current Round Status */}
          <div className="w-full p-6 rounded-2xl bg-gray-900 border border-gray-800">
            <h2 className="text-xl font-semibold mb-4 text-yellow-400">
              Current Round {game ? `#${game.currentRoundNumber}` : ""}
            </h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 rounded-xl bg-gray-800">
                <p className="text-sm text-gray-400">Players</p>
                <p className="text-2xl font-bold">
                  {currentRound
                    ? `${currentRound.players.length}/${game?.maxPlayersPerRound ?? "?"}`
                    : "0/10"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-gray-800">
                <p className="text-sm text-gray-400">Prize Pool</p>
                <p className="text-2xl font-bold text-green-400">
                  {currentRound
                    ? `${formatSol(currentRound.totalPot)} SOL`
                    : "0 SOL"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-gray-800">
                <p className="text-sm text-gray-400">Wager Amount</p>
                <p className="text-lg font-bold">
                  {game ? `${formatSol(game.wagerAmount)} SOL` : "0.1 SOL"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-gray-800">
                <p className="text-sm text-gray-400">Time Remaining</p>
                <p
                  className={`text-lg font-bold ${timeRemaining < 60 ? "text-red-400" : "text-white"}`}
                >
                  {formatTime(timeRemaining)}
                </p>
              </div>
            </div>

            {/* Players List */}
            {currentRound && currentRound.players.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-400 mb-2">Players in round:</p>
                <div className="flex flex-wrap gap-2">
                  {currentRound.players.map((player) => (
                    <span
                      key={player}
                      className={`px-2 py-1 rounded-lg text-xs font-mono ${
                        player === publicKey?.toBase58()
                          ? "bg-yellow-600 text-white"
                          : "bg-gray-700 text-gray-300"
                      }`}
                    >
                      {truncateAddress(player)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handlePlaceWager}
                disabled={isLoading || hasPlayerJoined === true}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {hasPlayerJoined ? "✓ Wagered" : "🎰 Place Wager"}
              </button>

              <button
                onClick={handleCloseRound}
                disabled={isLoading || !isRoundCloseable}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🏆 Close Round
              </button>
            </div>
          </div>

          {/* Winner Announcement */}
          {currentRound?.status === "closed" && currentRound.winner && (
            <div className="w-full p-6 rounded-2xl bg-gradient-to-r from-yellow-900/50 to-orange-900/50 border border-yellow-600">
              <h2 className="text-xl font-semibold text-yellow-400 mb-2">
                🎉 Winner!
              </h2>
              <p className="font-mono text-lg">
                {truncateAddress(currentRound.winner)}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Won {formatSol(currentRound.totalPot)} SOL
              </p>
            </div>
          )}

          {/* Round History */}
          {roundHistory.length > 0 && (
            <div className="w-full p-6 rounded-2xl bg-gray-900 border border-gray-800">
              <h2 className="text-xl font-semibold mb-4 text-purple-400">
                Round History
              </h2>
              <div className="space-y-2">
                {roundHistory.map((entry) => (
                  <div
                    key={entry.roundNumber}
                    className="flex justify-between items-center p-3 rounded-xl bg-gray-800"
                  >
                    <span className="text-gray-400">
                      Round #{entry.roundNumber}
                    </span>
                    <span className="font-mono text-sm">
                      {truncateAddress(entry.winner)}
                    </span>
                    <span className="text-green-400">
                      {formatSol(entry.pot)} SOL
                    </span>
                    <span className="text-gray-500 text-sm">
                      {entry.playerCount} players
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Message */}
          {statusMessage && (
            <p className="text-sm text-yellow-400 text-center">
              {statusMessage}
            </p>
          )}

          <p className="text-xs text-gray-600 text-center">
            Deploy the wager program to localnet and refresh to interact.
            Frontend integration via Codama client is a TODO.
          </p>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-gray-400 mb-2">
            Connect your wallet to join the wager
          </p>
          <p className="text-sm text-gray-600">
            Each round, players pool SOL and one lucky winner takes the pot!
          </p>
        </div>
      )}
    </main>
  );
}
