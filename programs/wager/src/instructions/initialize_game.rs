use anchor_lang::prelude::*;
use crate::state::{Game, Round, RoundStatus};

const FIRST_ROUND_NUMBER: u64 = 1;

#[derive(Accounts)]
pub struct InitializeGameAccountConstraints<'info> {
    #[account(
        init,
        payer = admin,
        space = Game::DISCRIMINATOR.len() + Game::INIT_SPACE,
        seeds = [b"game", admin.key().as_ref()],
        bump
    )]
    pub game: Account<'info, Game>,

    #[account(
        init,
        payer = admin,
        space = Round::DISCRIMINATOR.len() + Round::INIT_SPACE,
        seeds = [b"round", game.key().as_ref(), &FIRST_ROUND_NUMBER.to_le_bytes()],
        bump
    )]
    pub round: Account<'info, Round>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_game(
    context: Context<InitializeGameAccountConstraints>,
    wager_amount: u64,
    max_players_per_round: u8,
    round_duration: i64,
    fee_basis_points: u16,
) -> Result<()> {
    require!(wager_amount > 0, WagerError::InvalidWagerAmount);
    require!(max_players_per_round >= 2, WagerError::TooFewPlayers);
    require!(round_duration > 0, WagerError::InvalidRoundDuration);

    let basis_points_max: u16 = 10_000;
    require!(fee_basis_points <= basis_points_max, WagerError::FeeTooHigh);

    let clock = Clock::get()?;

    let game = &mut context.accounts.game;
    game.admin = context.accounts.admin.key();
    game.wager_amount = wager_amount;
    game.max_players_per_round = max_players_per_round;
    game.round_duration = round_duration;
    game.current_round_number = FIRST_ROUND_NUMBER;
    game.fee_basis_points = fee_basis_points;
    game.bump = context.bumps.game;

    let round = &mut context.accounts.round;
    round.game = game.key();
    round.round_number = FIRST_ROUND_NUMBER;
    round.players = Vec::new();
    round.total_pot = 0;
    round.start_time = clock.unix_timestamp;
    round.status = RoundStatus::Open;
    round.winner = Pubkey::default();
    round.bump = context.bumps.round;

    Ok(())
}

#[error_code]
pub enum WagerError {
    #[msg("Wager amount must be greater than zero")]
    InvalidWagerAmount,

    #[msg("Need at least 2 players per round")]
    TooFewPlayers,

    #[msg("Round duration must be positive")]
    InvalidRoundDuration,

    #[msg("Fee basis points cannot exceed 10000")]
    FeeTooHigh,
}
