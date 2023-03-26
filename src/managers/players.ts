import { VoiceConnection } from '@discordjs/voice'
import { Collection, Snowflake } from 'discord.js'
import { injectable } from 'inversify'
import invariant from 'tiny-invariant'
import { Logger } from 'winston'
import container from '../container'
import Player from '../services/player'
import { YtDlp } from '../services/yt-dlp'
import TYPES from '../types'

@injectable()
export default class Players {
  private readonly players = new Collection<Snowflake, Player>()

  get(connection: VoiceConnection) {
    const id = connection.joinConfig.guildId
    // Create new player if one doesn't exist
    if (!this.players.has(id)) {
      const logger = container.get<Logger>(TYPES.Logger)
      const ytDlp = container.get<YtDlp>(TYPES.YtDlp)
      const player = new Player(connection, logger, ytDlp)
      this.players.set(id, player)
    }
    // If player exists but the connection is different
    const player = this.players.get(id)
    invariant(player, 'player should exist for guild')
    // Attach player to connection if it's new
    player.attach(connection)
    return player
  }
}
