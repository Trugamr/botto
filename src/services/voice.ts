import { getVoiceConnection, joinVoiceChannel } from '@discordjs/voice'
import { VoiceChannel } from 'discord.js'
import { inject, injectable } from 'inversify'
import TYPES from '../types'
import { Logger } from './logger'

@injectable()
export class Voice {
  constructor(@inject(TYPES.Logger) private readonly logger: Logger) {}

  join(channel: VoiceChannel) {
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
    })

    connection.on('stateChange', (prev, current) => {
      this.logger.info(`Voice connection state changed: ${prev.status} -> ${current.status}`)
    })

    return connection
  }

  disconnect(guildId: string) {
    const connection = this.get(guildId)
    if (connection) {
      connection.destroy()
    }
  }

  get(guildId: string) {
    return getVoiceConnection(guildId)
  }
}
