use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum RoundStatus {
    Open,
    Closed,
}

#[derive(InitSpace)]
#[account]
pub struct Round {
    pub game: Pubkey,

    pub round_number: u64,

    #[max_len(10)]
    pub players: Vec<Pubkey>,

    /// Total lamports wagered this round
    pub total_pot: u64,

    /// Unix timestamp when the round started
    pub start_time: i64,

    pub status: RoundStatus,

    /// Winner's pubkey (default until round closes)
    pub winner: Pubkey,

    pub bump: u8,
}
