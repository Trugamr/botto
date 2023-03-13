import {
  VoiceConnectionStatus,
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
} from '@discordjs/voice'
import { VoiceChannel } from 'discord.js'
import { inject, injectable } from 'inversify'
import TYPES from '../types'
import { Logger } from './logger'

const MAX_STATUS_TRANSITION_TIME = 5_000

@injectable()
export class Voice {
  constructor(@inject(TYPES.Logger) private readonly logger: Logger) {}

  async join(channel: VoiceChannel, force = false) {
    // Get existing voice connection else create a new one
    let connection = this.getConnection(channel.guild.id)

    // If force is "true" disconnect and force new connection
    if (connection && force) {
      // TODO: Shoud we await state to transition to disconnect here ?
      connection.destroy()
      connection = undefined
    }

    if (!connection) {
      connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
      })
    }

    // TODO: Cleanup
    connection.on('stateChange', (prev, next) => {
      this.logger.debug(`Connection state update ${prev.status} -> ${next.status}`)
    })

    // TODO: Send error messsage if fails
    // Ensure connection
    await entersState(connection, VoiceConnectionStatus.Ready, MAX_STATUS_TRANSITION_TIME)

    return connection
  }

  async disconnect(guildId: string) {
    const connection = this.getConnection(guildId)
    if (connection) {
      connection.destroy()
      await entersState(connection, VoiceConnectionStatus.Destroyed, MAX_STATUS_TRANSITION_TIME)
    }
  }

  getConnection(guildId: string) {
    return getVoiceConnection(guildId)
  }
}
