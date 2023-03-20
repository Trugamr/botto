import { StreamType, createAudioResource } from '@discordjs/voice'
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { execa } from 'execa'
import { inject, injectable } from 'inversify'
import invariant from 'tiny-invariant'
import { z } from 'zod'
import Command, { Feature } from '../command.js'
import Players from '../managers/players.js'
import { Voice } from '../services/voice.js'
import { Youtube } from '../services/youtube.js'
import { YtDlp } from '../services/yt-dlp.js'
import TYPES from '../types.js'

// TODO: Handling stream errors gracefully

@injectable()
export default class Play implements Command {
  readonly builder = new SlashCommandBuilder()
    .setName('play')
    .setDescription('Search or play music using a link')
    .addStringOption(option =>
      option.setName('query').setDescription('Youtube video url').setRequired(true),
    )
  readonly features = [Feature.Voice]

  constructor(
    @inject(TYPES.YtDlp) private readonly ytDlp: YtDlp,
    @inject(TYPES.Youtube) private readonly youtube: Youtube,
    @inject(TYPES.Voice) private readonly voice: Voice,
    @inject(TYPES.Players) private readonly players: Players,
  ) {}

  async handle(interaction: ChatInputCommandInteraction) {
    invariant(interaction.guild, 'play interaction must have guild')

    const query = interaction.options.getString('query', true)
    const result = await z.string().url().safeParseAsync(query)
    if (!result.success) {
      await interaction.reply({
        content: 'Invalid url provided in query',
        ephemeral: true,
      })
      return
    }

    // It's a valid url we can continue
    const { type, url } = this.youtube.parse(result.data)
    if (type === 'playlist') {
      // TODO: Handle playlist urls
      await interaction.reply({
        content: 'Youtube playlists are not supported yet',
        ephemeral: true,
      })
      return
    }

    // Tasks after this can take more than 3 seconds to complete
    await interaction.deferReply({ ephemeral: true })

    // TODO: Get best suited audio format instead of higest quality one
    // Get highest quality audio stream url
    const { duration, formats } = await this.ytDlp.getVideoInfo(url)
    const [format] = formats
      .filter(f => f.acodec === 'opus' && f.audio_ext === 'webm')
      .sort((prev, next) => (prev.quality ?? 0) - (next.quality ?? 0))
    if (!format) {
      await interaction.editReply('Failed to find playable audio stream for specified query')
      return
    }

    // Get connection
    const connection = this.voice.get(interaction.guild.id)
    invariant(connection, 'voice connectino should not be undefined')

    // Get player
    invariant(interaction.guild, 'guild info should pe present on interaction')
    const player = this.players.get(connection)

    // Create ffmpeg stream
    // prettier-ignore
    const ffmpeg = execa('ffmpeg', [
      '-reconnect', '1', // Reconnect on tls connection errors
      '-reconnect_streamed', '1', // Reconnect to input stream
      '-reconnect_delay_max', '3', // Reconnect max timeout 
      '-ss', "0", // Set duration for stream
      '-to', duration.toString(), // Set duration for stream
      '-i', format.url, // Input audio url
      // TODO: Use copy when stream is already opus encoded
      '-c:a', 'libopus', // Set audio codec
      '-vn', // Disable video processing
      '-f', 'webm', // Set format
      '-', // Pipe output to stdout
    ])
    invariant(ffmpeg.stdout, 'ffmpeg stream should not be null')

    // Create resource and play
    const resource = createAudioResource(ffmpeg.stdout, {
      inputType: StreamType.WebmOpus,
    })

    await player.play(resource)

    await interaction.editReply('Playing')
  }
}
