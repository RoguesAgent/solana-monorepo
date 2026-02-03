use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("11111111111111111111111111111111");

#[program]
pub mod counter {
    use super::*;

    pub fn initialize(context: Context<InitializeAccountConstraints>) -> Result<()> {
        instructions::initialize(context)
    }

    pub fn increment(context: Context<IncrementAccountConstraints>) -> Result<()> {
        instructions::increment(context)
    }

    pub fn decrement(context: Context<DecrementAccountConstraints>) -> Result<()> {
        instructions::decrement(context)
    }
}
