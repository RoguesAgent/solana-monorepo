#!/bin/bash
set -e

echo "🔧 Installing Solana CLI..."
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

echo "⚓ Installing Anchor via AVM..."
cargo install --git https://github.com/coral-xyz/anchor avm --force
avm install 0.32.1
avm use 0.32.1
export PATH="$HOME/.avm/bin:$PATH"

echo "📦 Installing npm dependencies..."
npm install

echo "🔑 Generating Solana keypair (if needed)..."
if [ ! -f "$HOME/.config/solana/id.json" ]; then
  solana-keygen new --no-bip39-passphrase -o "$HOME/.config/solana/id.json"
fi

solana config set --url devnet

echo "✅ Setup complete!"
echo "  Rust:    $(rustc --version)"
echo "  Solana:  $(solana --version)"
echo "  Anchor:  $(anchor --version)"
echo "  Node:    $(node --version)"
