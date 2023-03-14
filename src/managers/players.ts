import { Collection, Guild, Snowflake } from 'discord.js'
import { inject, injectable } from 'inversify'
import invariant from 'tiny-invariant'
import Player, { PlayerFactory } from '../services/player'
import TYPES from '../types'

@injectable()
export default class Players {
  private readonly players = new Collection<Snowflake, Player>()
  constructor(@inject(TYPES.PlayerFactory) private readonly playerFactory: PlayerFactory) {}

  get(guildId: Guild['id']) {
    // Create new player if one doesn't exist
    if (!this.players.has(guildId)) {
      this.players.set(guildId, this.playerFactory(guildId))
    }
    // Find and return existing player for guild
    const player = this.players.get(guildId)
    invariant(player, 'player should exist for guild')
    return player
  }
}
