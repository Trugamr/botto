import { VoiceConnection, VoiceConnectionStatus } from '@discordjs/voice'
import { Collection, Snowflake } from 'discord.js'
import { injectable } from 'inversify'
import { Logger } from 'winston'
import container from '../container.js'
import Player from '../services/player.js'
import { YtDlp } from '../services/yt-dlp.js'
import TYPES from '../types.js'

@injectable()
export default class Players {
  private readonly players = new Collection<Snowflake, Player>()

  /**
   * @param connection Voice connection
   * @param create Create new player if one doesn't exist
   */
  get(connection: VoiceConnection, create: boolean = false) {
    const id = connection.joinConfig.guildId
    // Create new player if one doesn't exist
    if (!this.players.has(id) && create) {
      const player = this.create(connection)
      // Setup event listeners
      this.setup(player)
      // Add player to cache
      this.players.set(id, player)
    }

    const player = this.players.get(id)
    // Attach player to connection if it's new
    if (player) {
      player.attach(connection)
    }

    return player
  }

  private create(connection: VoiceConnection) {
    // Get dependencies
    const logger = container.get<Logger>(TYPES.Logger)
    const ytDlp = container.get<YtDlp>(TYPES.YtDlp)
    // Create new player
    return new Player(connection, logger, ytDlp)
  }

  private setup(player: Player) {
    player.connection.on('stateChange', (previous, current) => {
      const guildId = player.connection.joinConfig.guildId
      // Remove player if connection is disconnected or destroyed
      if (
        [VoiceConnectionStatus.Disconnected, VoiceConnectionStatus.Destroyed].includes(
          current.status,
        )
      ) {
        player.logger.debug(
          `Removing player for guild ${guildId} due to voice connection state change: ${previous.status} -> ${current.status}`,
        )
        // Destroy player
        player.disconnect()
        // Remove player from cache
        this.players.delete(guildId)
      }
    })
  }
}
