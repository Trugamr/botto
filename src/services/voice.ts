import { getVoiceConnection, joinVoiceChannel } from '@discordjs/voice'
import { VoiceChannel } from 'discord.js'
import { injectable } from 'inversify'

@injectable()
export class Voice {
  join(channel: VoiceChannel) {
    return joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
    })
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
