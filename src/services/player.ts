import {
  AudioPlayerStatus,
  AudioResource,
  PlayerSubscription,
  createAudioPlayer,
  entersState,
} from '@discordjs/voice'
import { Guild } from 'discord.js'
import { inject } from 'inversify'
import invariant from 'tiny-invariant'
import TYPES from '../types'
import { Logger } from './logger'
import { Voice } from './voice'

export type PlayerFactory = (guildId: Guild['id']) => Player

const MAX_STATUS_TRANSITION_TIME = 5_000

export default class Player {
  private readonly subscription: PlayerSubscription

  constructor(
    private readonly guildId: Guild['id'],
    @inject(TYPES.Logger) private readonly logger: Logger,
    @inject(TYPES.Voice) private readonly voice: Voice,
  ) {
    // Get active voice connection
    // TODO: Join voice channel if not joined ?
    const connection = this.voice.getConnection(this.guildId)
    invariant(connection, 'voice connection should be present')

    // Create inner audio player
    const player = createAudioPlayer({
      debug: true,
    })

    // TODO: Cleanup
    player.on('stateChange', (prev, next) => {
      this.logger.debug(`Player state update ${prev.status} -> ${next.status}`)
    })

    player.on('debug', message => {
      this.logger.debug(`Player: ${message}`)
    })

    // Make connection subscribe to player
    const subscription = connection.subscribe(player)
    invariant(subscription, 'subscribing to player should return subscription')
    this.subscription = subscription

    this.logger.debug(`New player created for guild: ${this.guildId}`)
  }

  async play(resource: AudioResource) {
    // Send resource to player to play
    this.subscription.player.play(resource)

    // Ensure player has started playing
    await entersState(
      this.subscription.player,
      AudioPlayerStatus.Playing,
      MAX_STATUS_TRANSITION_TIME,
    )

    this.logger.debug(`Playing requsted resource for guild: ${this.guildId}`)
  }
}
