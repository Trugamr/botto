import { AudioPlayerStatus } from '@discordjs/voice'
import { Client, Events, GuildChannel, VoiceState } from 'discord.js'
import { inject, injectable } from 'inversify'
import invariant from 'tiny-invariant'
import Players from '../managers/players'
import { Logger } from '../services/logger'
import { Voice } from '../services/voice'
import Event from '../structs/event'
import TYPES from '../types'

@injectable()
export default class VoiceStateUpdate implements Event<Events.VoiceStateUpdate> {
  readonly type = Events.VoiceStateUpdate
  readonly once = false

  constructor(
    @inject(TYPES.Logger) private readonly logger: Logger,
    @inject(TYPES.Voice) private readonly voice: Voice,
    @inject(TYPES.Client) private readonly client: Client,
    @inject(TYPES.Players) private readonly players: Players,
  ) {}

  readonly listener = async (prev: VoiceState, current: VoiceState) => {
    invariant(this.client.user, 'client user should not be null')

    const channel = prev.channel ?? current.channel
    if (!channel) {
      return
    }

    let payload: { channel: GuildChannel; action: 'pause' | 'resume' } | undefined

    // Bot is alone in the channel that user left
    if (
      prev.channel &&
      prev.channel.members.has(this.client.user.id) &&
      prev.channel.members.size === 1
    ) {
      payload = { channel: prev.channel, action: 'pause' }
    }

    // Bot is not alone anymore in the channel that user joined
    if (
      current.channel &&
      current.channel.members.has(this.client.user.id) &&
      current.channel.members.size > 1
    ) {
      payload = { channel: current.channel, action: 'resume' }
    }

    if (!payload) {
      return
    }

    const connection = this.voice.get(channel.guild.id)
    if (!connection) {
      return
    }

    const player = this.players.get(connection)

    if (
      payload.action === 'pause' &&
      player.status &&
      [AudioPlayerStatus.Playing, AudioPlayerStatus.Buffering].includes(player.status)
    ) {
      player.pause({ by: 'system' })
      this.logger.debug(`Pausing as bot is the only one left in the channel: ${channel.name}`)
    } else if (payload.action === 'resume' && player.paused && player.paused.by === 'system') {
      player.resume()
      this.logger.debug(`Resuming as bot now has company in the channel: ${channel.name}`)
    }
  }
}
