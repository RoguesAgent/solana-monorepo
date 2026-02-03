use anchor_lang::prelude::*;
use crate::state::{Game, Round, RoundStatus};

const BASIS_POINTS_DENOMINATOR: u64 = 10_000;
const MINIMUM_PLAYERS_TO_CLOSE: usize = 2;

#[derive(Accounts)]
pub struct CloseRoundAccountConstraints<'info> {
    #[account(
        mut,
        seeds = [b"game", game.admin.as_ref()],
        bump = game.bump,
    )]
    pub game: Account<'info, Game>,

    #[account(
        mut,
        seeds = [b"round", game.key().as_ref(), &game.current_round_number.to_le_bytes()],
        bump = round.bump,
        has_one = game,
    )]
    pub round: Account<'info, Round>,

    /// The next round PDA, created when closing the current one
    #[account(
        init,
        payer = caller,
        space = Round::DISCRIMINATOR.len() + Round::INIT_SPACE,
        seeds = [
            b"round",
            game.key().as_ref(),
            &(game.current_round_number.checked_add(1).unwrap()).to_le_bytes()
        ],
        bump
    )]
    pub next_round: Account<'info, Round>,

    /// CHECK: Winner account receives lamports, validated by program logic
    #[account(mut)]
    pub winner: AccountInfo<'info>,

    /// CHECK: Admin fee recipient, validated against game.admin
    #[account(
        mut,
        constraint = fee_recipient.key() == game.admin @ CloseRoundError::InvalidFeeRecipient,
    )]
    pub fee_recipient: AccountInfo<'info>,

    #[account(mut)]
    pub caller: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn close_round(context: Context<CloseRoundAccountConstraints>) -> Result<()> {
    let round = &context.accounts.round;
    let game = &context.accounts.game;
    let clock = Clock::get()?;

    require!(round.status == RoundStatus::Open, CloseRoundError::RoundAlreadyClosed);
    require!(
        round.players.len() >= MINIMUM_PLAYERS_TO_CLOSE,
        CloseRoundError::NotEnoughPlayers
    );

    let is_full = round.players.len() >= game.max_players_per_round as usize;
    let is_expired = clock.unix_timestamp >= round.start_time + game.round_duration;
    require!(is_full || is_expired, CloseRoundError::RoundNotCloseable);

    // Pseudo-random winner selection
    // NOTE: For production use Switchboard VRF or another verifiable randomness source
    let player_count = round.players.len() as u64;
    let slot = clock.slot;
    let timestamp = clock.unix_timestamp as u64;
    let random_seed = slot
        .wrapping_mul(timestamp)
        .wrapping_add(round.total_pot);
    let winner_index = (random_seed % player_count) as usize;
    let winner_pubkey = round.players[winner_index];

    require!(
        context.accounts.winner.key() == winner_pubkey,
        CloseRoundError::WinnerMismatch
    );

    // Calculate fee and payout
    let fee_amount = round
        .total_pot
        .checked_mul(game.fee_basis_points as u64)
        .ok_or(CloseRoundError::MathOverflow)?
        .checked_div(BASIS_POINTS_DENOMINATOR)
        .ok_or(CloseRoundError::MathOverflow)?;

    let winner_payout = round
        .total_pot
        .checked_sub(fee_amount)
        .ok_or(CloseRoundError::MathOverflow)?;

    // Transfer from round PDA to winner
    let round_account_info = context.accounts.round.to_account_info();
    let winner_account_info = context.accounts.winner.to_account_info();
    let fee_recipient_info = context.accounts.fee_recipient.to_account_info();

    **round_account_info.try_borrow_mut_lamports()? -= winner_payout;
    **winner_account_info.try_borrow_mut_lamports()? += winner_payout;

    if fee_amount > 0 {
        **round_account_info.try_borrow_mut_lamports()? -= fee_amount;
        **fee_recipient_info.try_borrow_mut_lamports()? += fee_amount;
    }

    // Update round state
    let round = &mut context.accounts.round;
    round.status = RoundStatus::Closed;
    round.winner = winner_pubkey;

    // Initialize next round
    let next_round_number = game
        .current_round_number
        .checked_add(1)
        .ok_or(CloseRoundError::MathOverflow)?;

    let next_round = &mut context.accounts.next_round;
    next_round.game = game.key();
    next_round.round_number = next_round_number;
    next_round.players = Vec::new();
    next_round.total_pot = 0;
    next_round.start_time = clock.unix_timestamp;
    next_round.status = RoundStatus::Open;
    next_round.winner = Pubkey::default();
    next_round.bump = context.bumps.next_round;

    // Advance game to next round
    let game = &mut context.accounts.game;
    game.current_round_number = next_round_number;

    Ok(())
}

#[error_code]
pub enum CloseRoundError {
    #[msg("Round is already closed")]
    RoundAlreadyClosed,

    #[msg("Need at least 2 players to close a round")]
    NotEnoughPlayers,

    #[msg("Round is not yet full or expired")]
    RoundNotCloseable,

    #[msg("Winner account does not match selected winner")]
    WinnerMismatch,

    #[msg("Fee recipient must be the game admin")]
    InvalidFeeRecipient,

    #[msg("Math overflow")]
    MathOverflow,
}
