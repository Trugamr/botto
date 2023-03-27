import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { inject, injectable } from 'inversify'
import invariant from 'tiny-invariant'
import { z } from 'zod'
import Players from '../managers/players.js'
import { Logger } from '../services/logger.js'
import { Voice } from '../services/voice.js'
import { YtDlp } from '../services/yt-dlp.js'
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
    await interaction.deferReply()

    // Get connection
    const connection = this.voice.get(interaction.guild.id)
    invariant(connection, 'voice connection should not be undefined')

    // Get player
    invariant(interaction.guild, 'guild info should pe present on interaction')
    const player = this.players.get(connection)

    // TODO: Send error if stream could not start successfully
    const queued = await player.enqueue(url)

    if (queued.type === 'playlist') {
      await interaction.editReply(
        `Queued **${queued.count}** ${queued.count > 1 ? 'tracks' : 'track'} from **${
          queued.title
        }**`,
      )
      return
    }

    await interaction.editReply(`**${queued.title}** added to queue`)
  }
}
