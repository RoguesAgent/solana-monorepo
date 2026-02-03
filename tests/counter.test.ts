import { before, describe, test } from "node:test";
import assert from "node:assert";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import type { Counter } from "../target/types/counter";

describe("counter", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Counter as Program<Counter>;
  const authority = provider.wallet;

  const [counterPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("counter"), authority.publicKey.toBuffer()],
    program.programId
  );

  test("initializes the counter", async () => {
    const signature = await program.methods
      .initialize()
      .accounts({
        authority: authority.publicKey,
      })
      .rpc();

    assert.ok(signature, "Transaction signature should exist");

    const counterAccount = await program.account.counter.fetch(counterPda);
    assert.strictEqual(counterAccount.count.toNumber(), 0);
    assert.ok(
      counterAccount.authority.equals(authority.publicKey),
      "Authority should match"
    );
  });

  test("increments the counter", async () => {
    await program.methods
      .increment()
      .accounts({
        authority: authority.publicKey,
      })
      .rpc();

    const counterAccount = await program.account.counter.fetch(counterPda);
    assert.strictEqual(counterAccount.count.toNumber(), 1);
  });

  test("decrements the counter", async () => {
    await program.methods
      .decrement()
      .accounts({
        authority: authority.publicKey,
      })
      .rpc();

    const counterAccount = await program.account.counter.fetch(counterPda);
    assert.strictEqual(counterAccount.count.toNumber(), 0);
  });
});
