use anchor_lang::prelude::*;

#[derive(InitSpace)]
#[account]
pub struct Counter {
    pub authority: Pubkey,
    pub count: u64,
    pub bump: u8,
}
