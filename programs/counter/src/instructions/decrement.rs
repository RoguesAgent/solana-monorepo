use anchor_lang::prelude::*;
use crate::state::Counter;

#[derive(Accounts)]
pub struct DecrementAccountConstraints<'info> {
    #[account(
        mut,
        seeds = [b"counter", authority.key().as_ref()],
        bump = counter.bump,
        has_one = authority,
    )]
    pub counter: Account<'info, Counter>,

    pub authority: Signer<'info>,
}

pub fn decrement(context: Context<DecrementAccountConstraints>) -> Result<()> {
    let counter = &mut context.accounts.counter;
    counter.count = counter.count.checked_sub(1).ok_or(DecrementError::Underflow)?;
    Ok(())
}

#[error_code]
pub enum DecrementError {
    #[msg("Counter underflow")]
    Underflow,
}
