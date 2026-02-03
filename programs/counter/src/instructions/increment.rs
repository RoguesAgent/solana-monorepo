use anchor_lang::prelude::*;
use crate::state::Counter;

#[derive(Accounts)]
pub struct IncrementAccountConstraints<'info> {
    #[account(
        mut,
        seeds = [b"counter", authority.key().as_ref()],
        bump = counter.bump,
        has_one = authority,
    )]
    pub counter: Account<'info, Counter>,

    pub authority: Signer<'info>,
}

pub fn increment(context: Context<IncrementAccountConstraints>) -> Result<()> {
    let counter = &mut context.accounts.counter;
    counter.count = counter.count.checked_add(1).ok_or(ErrorCode::Overflow)?;
    Ok(())
}

#[error_code]
pub enum ErrorCode {
    #[msg("Counter overflow")]
    Overflow,
}
