import {
  AudioResource,
  PlayerSubscription,
  VoiceConnection,
  createAudioPlayer,
} from '@discordjs/voice'
import { inject } from 'inversify'
import invariant from 'tiny-invariant'
import TYPES from '../types'
import { Logger } from './logger'

export default class Player {
  private _subscription: PlayerSubscription | undefined

  constructor(
    private readonly connection: VoiceConnection,
    @inject(TYPES.Logger) private readonly logger: Logger,
  ) {}

  private get subscription() {
    if (!this._subscription) {
      // Create player
      const player = createAudioPlayer()
      // Create subscription
      const subscription = this.connection.subscribe(player)
      invariant(subscription, 'subscription should not be undefined')
      this._subscription = subscription
    }
    return this._subscription
  }

  /**
   * Play audio resource
   */
  async play(resource: AudioResource) {
    // Send resource to player to play
    this.subscription.player.play(resource)
  }

  disconnect() {
    if (!this._subscription) {
      return
    }
    this.stop()
    this._subscription.connection.destroy()
    this._subscription.unsubscribe()
    this._subscription = undefined
  }

  stop() {
    if (!this._subscription) {
      return
    }
    this._subscription.player.stop()
  }
}
