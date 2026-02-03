use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("11111111111111111111111111111111");

#[program]
pub mod wager {
    use super::*;

    pub fn initialize_game(
        context: Context<InitializeGameAccountConstraints>,
        wager_amount: u64,
        max_players_per_round: u8,
        round_duration: i64,
        fee_basis_points: u16,
    ) -> Result<()> {
        instructions::initialize_game(
            context,
            wager_amount,
            max_players_per_round,
            round_duration,
            fee_basis_points,
        )
    }

    pub fn place_wager(context: Context<PlaceWagerAccountConstraints>) -> Result<()> {
        instructions::place_wager(context)
    }

    pub fn close_round(context: Context<CloseRoundAccountConstraints>) -> Result<()> {
        instructions::close_round(context)
    }
}
