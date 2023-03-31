import { AudioPlayerStatus } from '@discordjs/voice'
import { Client, Events, VoiceState } from 'discord.js'
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

    if (
      prev.channel &&
      prev.channel.members.has(this.client.user.id) &&
      prev.channel.members.size === 1
    ) {
      // Pause as bot is the only one left in the channel
      const connection = this.voice.get(prev.channel.guild.id)
      if (!connection) {
        return
      }

      const player = this.players.get(connection)
      if (
        player.status &&
        [AudioPlayerStatus.Playing, AudioPlayerStatus.Buffering].includes(player.status)
      ) {
        player.pause()

        this.logger.debug(
          `Pausing as bot is the only one left in the channel: ${prev.channel.name}`,
        )
      }
    }

    if (
      current.channel &&
      current.channel.members.has(this.client.user.id) &&
      current.channel.members.size > 1
    ) {
      // Resume as bot is not the only one left in the channel
      // TODO: Check if bot was paused automatically before resuming
      this.logger.debug(
        `Resuming as bot now has company in the channel: ${current.channel.name}`,
      )
    }
  }
}
