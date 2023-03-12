import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { inject, injectable } from 'inversify'
import { z } from 'zod'
import Command from '../command.js'
import { Youtube } from '../services/youtube.js'
import { YtDlp } from '../services/yt-dlp.js'
import TYPES from '../types.js'

// TODO: Create a player that manages queue and fetch stream urls when required

@injectable()
export default class Play implements Command {
  constructor(
    @inject(TYPES.YtDlp) private readonly ytDlp: YtDlp,
    @inject(TYPES.Youtube) private readonly youtube: Youtube,
  ) {}

  readonly builder = new SlashCommandBuilder()
    .setName('play')
    .setDescription('Search or play music using a link')
    .addStringOption(option =>
      option.setName('query').setDescription('Youtube video url').setRequired(true),
    )

  async handle(interaction: ChatInputCommandInteraction) {
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

    // Get highest quality audio stream url
    const { formats } = await this.ytDlp.getVideoInfo(url)
    const [audio] = formats
      .filter(f => f.audio_ext)
      .sort((prev, next) => (prev.quality ?? 0) - (next.quality ?? 0))

    if (!audio) {
      await interaction.editReply('Failed to find playable audio stream for specified query')
      return
    }

    // TODO: Join user's voice channel
    // TODO: Start "speaking" the audio stream in voice channel

    await interaction.editReply(
      `Not Implemented\nDebug: \`\`\`json\n${JSON.stringify(audio, null, 2)}\n\`\`\``,
    )
  }
}
