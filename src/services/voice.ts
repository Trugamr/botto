import {
  VoiceConnection,
  VoiceConnectionStatus,
  getVoiceConnection,
  joinVoiceChannel,
} from '@discordjs/voice'
import { VoiceChannel } from 'discord.js'
import { inject, injectable } from 'inversify'
import TYPES from '../types.js'
import { Logger } from './logger.js'

@injectable()
export class Voice {
  constructor(@inject(TYPES.Logger) private readonly logger: Logger) {}

  join(channel: VoiceChannel) {
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
    })

    // Setup event listeners
    this.setup(connection)

    return connection
  }

  disconnect(guildId: string) {
    const connection = this.get(guildId)
    if (connection && connection.state.status !== VoiceConnectionStatus.Destroyed) {
      connection.destroy()
    }
  }

  setup = (connection: VoiceConnection) => {
    connection.on('stateChange', (previous, current) => {
      this.logger.debug(
        `Voice connection state changed: ${previous.status} -> ${current.status}`,
      )

      // If connection is disconnected, destroy it
      if (VoiceConnectionStatus.Disconnected === current.status) {
        this.logger.debug(
          `Destroying voice connection for guild ${connection.joinConfig.guildId} due to state change: ${previous.status} -> ${current.status}`,
        )
        connection.destroy()
      }
    })
  }

  get(guildId: string) {
    return getVoiceConnection(guildId)
  }
}
