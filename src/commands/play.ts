import { StreamType, createAudioResource } from '@discordjs/voice'
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { execa } from 'execa'
import { inject, injectable } from 'inversify'
import invariant from 'tiny-invariant'
import { z } from 'zod'
import Players from '../managers/players.js'
import { Logger } from '../services/logger.js'
import { Voice } from '../services/voice.js'
import { MediaInfo, YtDlp } from '../services/yt-dlp.js'
import Command, { Feature } from '../structs/command.js'
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
    @inject(TYPES.Voice) private readonly voice: Voice,
    @inject(TYPES.Players) private readonly players: Players,
    @inject(TYPES.Logger) private readonly logger: Logger,
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
    const url = result.data

    // Tasks after this can take more than 3 seconds to complete
    await interaction.deferReply({ ephemeral: true })

    let info: MediaInfo | undefined = undefined
    try {
      info = await this.ytDlp.getMediaInfo(url)
    } catch (error) {
      await interaction.editReply('Failed to find playable audio stream for specified query')
      return
    }

    // Get connection
    const connection = this.voice.get(interaction.guild.id)
    invariant(connection, 'voice connectino should not be undefined')

    // Get player
    invariant(interaction.guild, 'guild info should pe present on interaction')
    const player = this.players.get(connection)

    // Prevent rencode if it's already opus encoded stream
    // TODO: Check returned responses for popular services
    const codec = [info.acodec, info.audio_ext].includes('opus') ? 'copy' : 'libopus'
    // Create ffmpeg stream
    // prettier-ignore
    const ffmpeg = execa('ffmpeg', [
      '-reconnect', '1', // Reconnect on tls connection errors
      '-reconnect_streamed', '1', // Reconnect to input stream
      '-reconnect_delay_max', '3', // Reconnect max timeout 
      '-ss', "0", // Set duration for stream
      '-to', info.duration.toString(), // Set duration for stream
      '-i', info.url, // Input audio url
      '-c:a', codec, // Set audio codec
      '-vn', // Disable video processing
      '-f', 'webm', // Set format
      '-', // Pipe output to stdout
    ])
    invariant(ffmpeg.stdout, 'ffmpeg stdout should not be undefined')

    // TODO: Send error if stream could not start successfully

    // Create resource and play
    const resource = createAudioResource(ffmpeg.stdout, {
      inputType: StreamType.WebmOpus,
    })

    player.play(resource)

    await interaction.editReply('Playing')
  }
}
