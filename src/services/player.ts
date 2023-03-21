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
    readonly connection: VoiceConnection,
    @inject(TYPES.Logger) private readonly logger: Logger,
  ) {}

  private create(connection: VoiceConnection) {
    const player = createAudioPlayer()
    const subscription = connection.subscribe(player)
    invariant(subscription, 'subscription should not be undefined')
    return subscription
  }

  get status() {
    if (this._subscription) {
      return this._subscription.player.state.status
    }
    return null
  }

  /**
   * Attach player to new connection if required
   */
  attach(connection: VoiceConnection) {
    // Create new subscription if one doesn't exist
    if (!this._subscription) {
      this._subscription = this.create(connection)
      return
    }
    // If connection is not same then re-attach
    if (this._subscription.connection !== connection) {
      this._subscription.player.stop()
      this._subscription.connection.destroy()
      this._subscription.unsubscribe()
      this._subscription = this.create(connection)
    }
  }

  private get subscription() {
    if (!this._subscription) {
      this._subscription = this.create(this.connection)
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

  pause() {
    if (!this._subscription) {
      return
    }
    this._subscription.player.pause()
  }

  resume() {
    if (!this._subscription) {
      return
    }
    this._subscription.player.unpause()
  }
}
