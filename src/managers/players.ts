import { VoiceConnection } from '@discordjs/voice'
import { Collection, Snowflake } from 'discord.js'
import { injectable } from 'inversify'
import invariant from 'tiny-invariant'
import { Logger } from 'winston'
import container from '../container'
import Player from '../services/player'
import TYPES from '../types'

@injectable()
export default class Players {
  private readonly players = new Collection<Snowflake, Player>()

  get(connection: VoiceConnection) {
    const id = connection.joinConfig.guildId
    // Create new player if one doesn't exist
    if (!this.players.has(id)) {
      const logger = container.get<Logger>(TYPES.Logger)
      const player = new Player(connection, logger)
      this.players.set(id, player)
    }
    // Find and return existing player for guild
    const player = this.players.get(id)
    invariant(player, 'player should exist for guild')
    return player
  }
}
