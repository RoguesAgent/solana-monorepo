# Solana Monorepo

A monorepo containing a Solana Anchor program and a Next.js frontend.

## Structure

```
solana-monorepo/
├── app/                    # Next.js frontend
├── programs/
│   └── counter/            # Solana Anchor program
├── tests/                  # Integration tests
├── Anchor.toml             # Anchor configuration
└── package.json            # Root workspace config
```

## Prerequisites

- Node.js 22+
- Rust & Cargo
- Solana CLI (Agave)
- Anchor CLI

## Getting Started

### Install dependencies

```bash
npm install
```

### Build the Anchor program

```bash
anchor build
```

### Run tests

```bash
anchor test
```

### Start the frontend

```bash
npm run dev
```

## Programs

### Counter

A simple counter program demonstrating Anchor best practices:
- Initialize a counter account
- Increment the counter
- Decrement the counter

## Frontend

Next.js app with Solana wallet adapter integration for interacting with the counter program.
