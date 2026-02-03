use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{Game, Round, RoundStatus};

#[derive(Accounts)]
pub struct PlaceWagerAccountConstraints<'info> {
    #[account(
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

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn place_wager(context: Context<PlaceWagerAccountConstraints>) -> Result<()> {
    let round = &context.accounts.round;
    let game = &context.accounts.game;

    require!(round.status == RoundStatus::Open, PlaceWagerError::RoundNotOpen);

    let max_players = game.max_players_per_round as usize;
    require!(round.players.len() < max_players, PlaceWagerError::RoundFull);

    let player_key = context.accounts.player.key();
    require!(
        !round.players.contains(&player_key),
        PlaceWagerError::AlreadyInRound
    );

    // Transfer wager from player to the round PDA (vault)
    system_program::transfer(
        CpiContext::new(
            context.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: context.accounts.player.to_account_info(),
                to: context.accounts.round.to_account_info(),
            },
        ),
        game.wager_amount,
    )?;

    let round = &mut context.accounts.round;
    round.players.push(player_key);
    round.total_pot = round
        .total_pot
        .checked_add(game.wager_amount)
        .ok_or(PlaceWagerError::PotOverflow)?;

    Ok(())
}

#[error_code]
pub enum PlaceWagerError {
    #[msg("This round is not open for wagers")]
    RoundNotOpen,

    #[msg("This round is already full")]
    RoundFull,

    #[msg("Player already placed a wager in this round")]
    AlreadyInRound,

    #[msg("Pot overflow")]
    PotOverflow,
}
