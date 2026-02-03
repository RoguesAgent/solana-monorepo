use anchor_lang::prelude::*;
use crate::state::Counter;

#[derive(Accounts)]
pub struct InitializeAccountConstraints<'info> {
    #[account(
        init,
        payer = authority,
        space = Counter::DISCRIMINATOR.len() + Counter::INIT_SPACE,
        seeds = [b"counter", authority.key().as_ref()],
        bump
    )]
    pub counter: Account<'info, Counter>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn initialize(context: Context<InitializeAccountConstraints>) -> Result<()> {
    let counter = &mut context.accounts.counter;
    counter.authority = context.accounts.authority.key();
    counter.count = 0;
    counter.bump = context.bumps.counter;
    Ok(())
}
