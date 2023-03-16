import { StreamType, createAudioResource } from '@discordjs/voice'
import { ChannelType, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { execa } from 'execa'
import { inject, injectable } from 'inversify'
import invariant from 'tiny-invariant'
import { z } from 'zod'
import Command from '../command.js'
import Players from '../managers/players.js'
import { Logger } from '../services/logger.js'
import { Voice } from '../services/voice.js'
import { Youtube } from '../services/youtube.js'
import { YtDlp } from '../services/yt-dlp.js'
import TYPES from '../types.js'

// TODO: Fix audio stops playing after couple of minutes

@injectable()
export default class Play implements Command {
  constructor(
    @inject(TYPES.Logger) private readonly logger: Logger,
    @inject(TYPES.YtDlp) private readonly ytDlp: YtDlp,
    @inject(TYPES.Youtube) private readonly youtube: Youtube,
    @inject(TYPES.Voice) private readonly voice: Voice,
    @inject(TYPES.Players) private readonly players: Players,
  ) {}

  readonly builder = new SlashCommandBuilder()
    .setName('play')
    .setDescription('Search or play music using a link')
    .addStringOption(option =>
      option.setName('query').setDescription('Youtube video url').setRequired(true),
    )

  async handle(interaction: ChatInputCommandInteraction) {
    // Check if user is currently in a voice channel
    const channel = interaction.guild?.channels.cache.find(channel => {
      if (channel.type === ChannelType.GuildVoice) {
        return channel.members.find(member => member.id === interaction.user.id)
      }
      return false
    })
    if (!channel) {
      await interaction.editReply('You must be in voice channel')
      return
    }
    invariant(channel.type === ChannelType.GuildVoice, 'channel must be voice channel')

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

    // Join voice channel
    await this.voice.join(channel)

    // Get player
    invariant(interaction.guild, 'guild info should pe present on interaction')
    const player = this.players.get(interaction.guild.id)

    // Create ffmpeg stream
    // prettier-ignore
    const { stdout: stream, stderr } = execa('ffmpeg', [
      '-reconnect', '1', // Reconnect on tls connection errors
      '-reconnect_streamed', '1', // Reconnect to input stream
      '-reconnect_delay_max', '3', // Reconnect max timeout 
      '-to', duration.toString(), // Set duration for stream
      '-i', format.url, // Input audio url
      '-c:a', 'libopus', // Set audio codec
      '-vn', // Disable video processing
      '-f', 'webm', // Set format
      '-', // Pipe output to stdout
    ])
    invariant(stream, 'ffmpeg stream should not be null')
    invariant(stderr, 'ffmpeg stderr should not be null')
    stderr.pipe(process.stderr)

    // Create resource and play
    const resource = createAudioResource(stream, {
      inputType: StreamType.WebmOpus,
    })

    await player.play(resource)

    await interaction.editReply('Playing')
  }
}
