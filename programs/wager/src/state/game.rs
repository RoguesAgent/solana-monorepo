use anchor_lang::prelude::*;

#[derive(InitSpace)]
#[account]
pub struct Game {
    pub admin: Pubkey,

    /// Fixed wager amount in lamports
    pub wager_amount: u64,

    /// Maximum players per round before auto-close
    pub max_players_per_round: u8,

    /// Round duration in seconds
    pub round_duration: i64,

    /// Current round number (increments each round)
    pub current_round_number: u64,

    /// Fee basis points taken from pot (e.g. 250 = 2.5%)
    pub fee_basis_points: u16,

    pub bump: u8,
}
