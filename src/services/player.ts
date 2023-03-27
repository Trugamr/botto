import {
  AudioPlayer,
  AudioPlayerStatus,
  PlayerSubscription,
  StreamType,
  VoiceConnection,
  createAudioPlayer,
  createAudioResource,
} from '@discordjs/voice'
import { execa } from 'execa'
import { inject } from 'inversify'
import invariant from 'tiny-invariant'
import TYPES from '../types'
import { Logger } from './logger'
import { YtDlp } from './yt-dlp'

export type Playable = {
  title: string
  url: string
}

// TODO: Handle info and stream errors gracefully

export default class Player {
  private _subscription: PlayerSubscription | undefined
  private readonly queue: Playable[] = []

  constructor(
    readonly connection: VoiceConnection,
    @inject(TYPES.Logger) private readonly logger: Logger,
    @inject(TYPES.YtDlp) private readonly ytDlp: YtDlp,
  ) {}

  private create(connection: VoiceConnection) {
    const player = createAudioPlayer()
    this.setup(player)

    const subscription = connection.subscribe(player)
    invariant(subscription, 'subscription should not be undefined')
    return subscription
  }

  /**
   * Setup event listeners on player
   */
  private setup(player: AudioPlayer) {
    player.on('stateChange', (prev, current) => {
      if (current.status === AudioPlayerStatus.Idle) {
        // Play next song
        const next = this.queue.shift()
        if (next) {
          this.play(next)
        }
      }
      this.logger.info(`Player state changed: ${prev.status} -> ${current.status}`)
    })
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

  async enqueue(url: string) {
    // Check if url is live stream, playlist or single playable media
    const info = await this.ytDlp.getMediaInfo(url)
    if (info._type === 'playlist') {
      for (const entry of info.entries) {
        this.queue.push({ title: entry.title, url: entry.url })
      }
    } else {
      this.queue.push({ title: info.title, url })
    }

    // If player is not playing start playing
    if (this.status !== AudioPlayerStatus.Playing) {
      const current = this.queue.shift()
      if (current) {
        this.play(current)
      }
    }

    switch (info._type) {
      case 'playlist':
        return {
          type: 'playlist',
          title: info.title,
          count: info.entries.length,
        } as const
      default:
        return {
          type: 'track',
          title: info.title,
        } as const
    }
  }

  private async play(playable: Playable) {
    // Get info about media
    const info = await this.ytDlp.getMediaInfo(playable.url)
    invariant(info._type === 'video', 'only video link can be played')
    invariant(info.duration, 'duration should not be undefined')

    // Create audio stream from url
    // Prevent re-encode if it's already opus encoded stream
    // TODO: Check returned responses for popular services
    const codec = [info.acodec, info.audio_ext].includes('opus') ? 'copy' : 'libopus'
    // Create ffmpeg stream
    // prettier-ignore
    const ffmpeg = execa('ffmpeg', [
      '-reconnect', '1', // Reconnect on tls connection errors
      '-reconnect_streamed', '1', // Reconnect to input stream
      '-reconnect_delay_max', '3', // Reconnect max timeout 
      '-ss', "0", // Set start time for stream
      '-to', info.duration.toString(), // Set end time for stream
      '-i', info.url, // Input audio url
      '-c:a', codec, // Set audio codec
      '-vn', // Disable video processing
      '-f', 'webm', // Set format
      '-', // Pipe output to stdout
    ])
    invariant(ffmpeg.stdout, 'ffmpeg stdout should not be undefined')

    // Create audio resource from stream
    const resource = createAudioResource(ffmpeg.stdout, {
      inputType: StreamType.WebmOpus,
    })

    // Send resource to player to play
    this.subscription.player.play(resource)
  }

  next() {
    if (!this._subscription) {
      return
    }

    const current = this.queue.shift()
    if (current) {
      this.play(current)
      return {
        title: current.title,
      }
    }
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
    this.queue.length = 0
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
