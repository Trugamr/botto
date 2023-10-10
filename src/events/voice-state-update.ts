import { AudioPlayerStatus } from '@discordjs/voice'
import { Client, Events, GuildChannel, VoiceState } from 'discord.js'
import { inject, injectable } from 'inversify'
import invariant from 'tiny-invariant'
import Players from '../managers/players.js'
import { Logger } from '../services/logger.js'
import { Voice } from '../services/voice.js'
import Event from '../structs/event.js'
import TYPES from '../types.js'

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

  readonly listener = async (previous: VoiceState, current: VoiceState) => {
    invariant(this.client.user, 'client user should not be null')

    const channel = previous.channel ?? current.channel
    if (!channel) {
      return
    }

    let payload: { channel: GuildChannel; action: 'pause' | 'resume' } | undefined

    // Bot is alone in the channel that user left
    if (
      previous.channel &&
      previous.channel.members.has(this.client.user.id) &&
      previous.channel.members.size === 1
    ) {
      payload = { channel: previous.channel, action: 'pause' }
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

    const player = this.players.get(connection, true)
    invariant(player, 'player should exist if connection exists')

    if (
      payload.action === 'pause' &&
      player.status &&
      [AudioPlayerStatus.Playing, AudioPlayerStatus.Buffering].includes(player.status)
    ) {
      player.pause({ by: 'system' })
      this.logger.debug(`Pausing as bot is the only one left in the channel`)
    } else if (payload.action === 'resume' && player.paused && player.paused.by === 'system') {
      player.resume()
      this.logger.debug(`Resuming as bot now has company in the channel`)
    }
  }
}
