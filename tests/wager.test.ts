import { before, describe, test } from "node:test";
import assert from "node:assert";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import type { Wager } from "../target/types/wager";

const LAMPORTS_PER_SOL = 1_000_000_000;
const WAGER_AMOUNT = LAMPORTS_PER_SOL / 10; // 0.1 SOL
const MAX_PLAYERS_PER_ROUND = 10;
const ROUND_DURATION_SECONDS = 300; // 5 minutes
const FEE_BASIS_POINTS = 250; // 2.5%
const FIRST_ROUND_NUMBER = 1;
const AIRDROP_AMOUNT = 10 * LAMPORTS_PER_SOL;

const ensureError = function (thrownObject: unknown): Error {
  if (thrownObject instanceof Error) {
    return thrownObject;
  }
  return new Error(`Non-Error thrown: ${String(thrownObject)}`);
};

describe("wager", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Wager as Program<Wager>;
  const admin = provider.wallet;

  const [gamePda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("game"), admin.publicKey.toBuffer()],
    program.programId,
  );

  const getRoundPda = (roundNumber: number) => {
    const roundNumberBuffer = Buffer.alloc(8);
    roundNumberBuffer.writeBigUInt64LE(BigInt(roundNumber));
    return anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("round"), gamePda.toBuffer(), roundNumberBuffer],
      program.programId,
    );
  };

  const [firstRoundPda] = getRoundPda(FIRST_ROUND_NUMBER);

  const createFundedKeypair = async (): Promise<anchor.web3.Keypair> => {
    const keypair = anchor.web3.Keypair.generate();
    const signature = await provider.connection.requestAirdrop(
      keypair.publicKey,
      AIRDROP_AMOUNT,
    );
    await provider.connection.confirmTransaction(signature);
    return keypair;
  };

  test("initializes the game and first round", async () => {
    const signature = await program.methods
      .initializeGame(
        new anchor.BN(WAGER_AMOUNT),
        MAX_PLAYERS_PER_ROUND,
        new anchor.BN(ROUND_DURATION_SECONDS),
        FEE_BASIS_POINTS,
      )
      .accounts({
        admin: admin.publicKey,
      })
      .rpc();

    assert.ok(signature, "Transaction signature should exist");

    const gameAccount = await program.account.game.fetch(gamePda);
    assert.strictEqual(gameAccount.wagerAmount.toNumber(), WAGER_AMOUNT);
    assert.strictEqual(gameAccount.maxPlayersPerRound, MAX_PLAYERS_PER_ROUND);
    assert.strictEqual(
      gameAccount.roundDuration.toNumber(),
      ROUND_DURATION_SECONDS,
    );
    assert.strictEqual(
      gameAccount.currentRoundNumber.toNumber(),
      FIRST_ROUND_NUMBER,
    );
    assert.strictEqual(gameAccount.feeBasisPoints, FEE_BASIS_POINTS);
    assert.ok(gameAccount.admin.equals(admin.publicKey));

    const roundAccount = await program.account.round.fetch(firstRoundPda);
    assert.strictEqual(
      roundAccount.roundNumber.toNumber(),
      FIRST_ROUND_NUMBER,
    );
    assert.strictEqual(roundAccount.players.length, 0);
    assert.strictEqual(roundAccount.totalPot.toNumber(), 0);
    assert.deepStrictEqual(roundAccount.status, { open: {} });
  });

  test("player places a wager", async () => {
    const player = await createFundedKeypair();

    const balanceBefore = await provider.connection.getBalance(
      player.publicKey,
    );

    await program.methods
      .placeWager()
      .accounts({
        game: gamePda,
        round: firstRoundPda,
        player: player.publicKey,
      })
      .signers([player])
      .rpc();

    const roundAccount = await program.account.round.fetch(firstRoundPda);
    assert.strictEqual(roundAccount.players.length, 1);
    assert.ok(roundAccount.players[0].equals(player.publicKey));
    assert.strictEqual(roundAccount.totalPot.toNumber(), WAGER_AMOUNT);

    const balanceAfter = await provider.connection.getBalance(
      player.publicKey,
    );
    assert.ok(
      balanceBefore - balanceAfter >= WAGER_AMOUNT,
      "Player balance should decrease by at least the wager amount",
    );
  });

  test("rejects duplicate wager from same player", async () => {
    const player = await createFundedKeypair();

    await program.methods
      .placeWager()
      .accounts({
        game: gamePda,
        round: firstRoundPda,
        player: player.publicKey,
      })
      .signers([player])
      .rpc();

    try {
      await program.methods
        .placeWager()
        .accounts({
          game: gamePda,
          round: firstRoundPda,
          player: player.publicKey,
        })
        .signers([player])
        .rpc();
      assert.fail("Should have thrown an error for duplicate wager");
    } catch (thrownObject) {
      const error = ensureError(thrownObject);
      assert.ok(
        error.message.includes("AlreadyInRound"),
        `Expected AlreadyInRound error, got: ${error.message}`,
      );
    }
  });

  test("rejects closing round with insufficient players", async () => {
    // Create a fresh game for this test so we have a round with only 1 player
    const freshAdmin = await createFundedKeypair();

    const [freshGamePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("game"), freshAdmin.publicKey.toBuffer()],
      program.programId,
    );

    const freshRoundNumberBuffer = Buffer.alloc(8);
    freshRoundNumberBuffer.writeBigUInt64LE(BigInt(FIRST_ROUND_NUMBER));
    const [freshRoundPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("round"), freshGamePda.toBuffer(), freshRoundNumberBuffer],
      program.programId,
    );

    await program.methods
      .initializeGame(
        new anchor.BN(WAGER_AMOUNT),
        MAX_PLAYERS_PER_ROUND,
        new anchor.BN(1), // 1 second so it expires fast
        FEE_BASIS_POINTS,
      )
      .accounts({
        admin: freshAdmin.publicKey,
      })
      .signers([freshAdmin])
      .rpc();

    const singlePlayer = await createFundedKeypair();
    await program.methods
      .placeWager()
      .accounts({
        game: freshGamePda,
        round: freshRoundPda,
        player: singlePlayer.publicKey,
      })
      .signers([singlePlayer])
      .rpc();

    // Wait for expiry
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const nextRoundNumberBuffer = Buffer.alloc(8);
    nextRoundNumberBuffer.writeBigUInt64LE(BigInt(2));
    const [nextRoundPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("round"), freshGamePda.toBuffer(), nextRoundNumberBuffer],
      program.programId,
    );

    try {
      await program.methods
        .closeRound()
        .accounts({
          game: freshGamePda,
          round: freshRoundPda,
          nextRound: nextRoundPda,
          winner: singlePlayer.publicKey,
          feeRecipient: freshAdmin.publicKey,
          caller: freshAdmin.publicKey,
        })
        .signers([freshAdmin])
        .rpc();
      assert.fail("Should have thrown an error for not enough players");
    } catch (thrownObject) {
      const error = ensureError(thrownObject);
      assert.ok(
        error.message.includes("NotEnoughPlayers"),
        `Expected NotEnoughPlayers error, got: ${error.message}`,
      );
    }
  });

  test("fills round and closes with winner selection", async () => {
    // Add players until round from first test (which already has 2) is full
    const roundAccountBefore = await program.account.round.fetch(firstRoundPda);
    const playersNeeded =
      MAX_PLAYERS_PER_ROUND - roundAccountBefore.players.length;
    const allPlayers = [...roundAccountBefore.players];

    for (let i = 0; i < playersNeeded; i++) {
      const player = await createFundedKeypair();
      await program.methods
        .placeWager()
        .accounts({
          game: gamePda,
          round: firstRoundPda,
          player: player.publicKey,
        })
        .signers([player])
        .rpc();
      allPlayers.push(player.publicKey);
    }

    const fullRound = await program.account.round.fetch(firstRoundPda);
    assert.strictEqual(fullRound.players.length, MAX_PLAYERS_PER_ROUND);

    // Determine winner using the same pseudo-random logic as the program
    const clock = await provider.connection.getSlot();
    // We can't perfectly predict the winner since slot changes, but we can
    // close the round and verify the result
    const secondRoundNumber = 2;
    const [secondRoundPda] = getRoundPda(secondRoundNumber);

    // We need to try closing — the program determines the winner
    // Since we can't predict which player wins, we need to attempt close
    // and handle the WinnerMismatch if our guess is wrong.
    // In a real scenario, a client would simulate first to find the winner.

    // Try each player as potential winner (brute force for test)
    let closedSuccessfully = false;
    for (const potentialWinner of fullRound.players) {
      try {
        await program.methods
          .closeRound()
          .accounts({
            game: gamePda,
            round: firstRoundPda,
            nextRound: secondRoundPda,
            winner: potentialWinner,
            feeRecipient: admin.publicKey,
            caller: admin.publicKey,
          })
          .rpc();
        closedSuccessfully = true;
        break;
      } catch (thrownObject) {
        const error = ensureError(thrownObject);
        if (!error.message.includes("WinnerMismatch")) {
          throw error;
        }
      }
    }

    assert.ok(closedSuccessfully, "Should have closed the round successfully");

    const closedRound = await program.account.round.fetch(firstRoundPda);
    assert.deepStrictEqual(closedRound.status, { closed: {} });
    assert.ok(
      fullRound.players.some((player) => player.equals(closedRound.winner)),
      "Winner should be one of the players",
    );

    // Verify next round was created
    const gameAccount = await program.account.game.fetch(gamePda);
    assert.strictEqual(
      gameAccount.currentRoundNumber.toNumber(),
      secondRoundNumber,
    );

    const nextRound = await program.account.round.fetch(secondRoundPda);
    assert.strictEqual(nextRound.roundNumber.toNumber(), secondRoundNumber);
    assert.strictEqual(nextRound.players.length, 0);
    assert.deepStrictEqual(nextRound.status, { open: {} });
  });
});
