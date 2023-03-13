import {
  AudioPlayerStatus,
  StreamType,
  createAudioPlayer,
  createAudioResource,
  entersState,
} from '@discordjs/voice'
import { ChannelType, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { inject, injectable } from 'inversify'
import invariant from 'tiny-invariant'
import { z } from 'zod'
import Command from '../command.js'
import { Logger } from '../services/logger.js'
import { Voice } from '../services/voice.js'
import { Youtube } from '../services/youtube.js'
import { YtDlp } from '../services/yt-dlp.js'
import TYPES from '../types.js'

// TODO: Fix audio stops playing after couple of minutes
// See: https://github.com/discordjs/discord.js/issues/9185#issuecomment-1450863604

// TODO: Create a player that manages queue and fetch stream urls when required
const player = createAudioPlayer({ debug: true })

@injectable()
export default class Play implements Command {
  constructor(
    @inject(TYPES.Logger) private readonly logger: Logger,
    @inject(TYPES.YtDlp) private readonly ytDlp: YtDlp,
    @inject(TYPES.Youtube) private readonly youtube: Youtube,
    @inject(TYPES.Voice) private readonly voice: Voice,
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
    const { formats } = await this.ytDlp.getVideoInfo(url)
    const [audio] = formats
      .filter(f => f.audio_ext)
      .sort((prev, next) => (prev.quality ?? 0) - (next.quality ?? 0))
    if (!audio) {
      await interaction.editReply('Failed to find playable audio stream for specified query')
      return
    }

    await interaction.editReply(`Debug: \`\`\`json\n${JSON.stringify(audio, null, 2)}\n\`\`\``)

    // Join voice channel
    const connection = await this.voice.join(channel)
    // Bind player to voice channel connection
    connection.subscribe(player)

    const resource = createAudioResource(audio.url, { inputType: StreamType.Arbitrary })

    player.play(resource)

    // Wait for state of player to update from "buffering" to "playing"
    await entersState(player, AudioPlayerStatus.Playing, 5_000)
    await interaction.editReply('Playing')
  }
}
