import { writeFile } from 'fs/promises'
import {
  ApplicationCommandOptionChoiceData,
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from 'discord.js'
import { inject, injectable } from 'inversify'
import invariant from 'tiny-invariant'
import { z } from 'zod'
import Players from '../managers/players.js'
import { Logger } from '../services/logger.js'
import { Voice } from '../services/voice.js'
import { Youtube } from '../services/youtube.js'
import Command, { Feature } from '../structs/command.js'
import TYPES from '../types.js'

// TODO: Handling stream errors gracefully

@injectable()
export default class Play implements Command {
  readonly builder = new SlashCommandBuilder()
    .setName('play')
    .setDescription('Search or play music using a link')
    .addStringOption(option =>
      option
        .setName('query')
        .setDescription('Query tracks or send a link to play')
        .setAutocomplete(true)
        .setRequired(true),
    )
    .addBooleanOption(option =>
      option
        .setName('prepend')
        .setDescription('Add to the front of the queue')
        .setRequired(false),
    )
  readonly features = [Feature.Voice]

  constructor(
    @inject(TYPES.Voice) private readonly voice: Voice,
    @inject(TYPES.Players) private readonly players: Players,
    @inject(TYPES.Logger) private readonly logger: Logger,
    @inject(TYPES.Youtube) private readonly youtube: Youtube,
  ) {}

  async handle(interaction: ChatInputCommandInteraction) {
    invariant(interaction.guild, 'play interaction must have guild')

    const query = interaction.options.getString('query', true)
    const prepend = interaction.options.getBoolean('prepend') ?? false

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

    try {
      // TODO: Send error if stream could not start successfully
      const queued = await player.enqueue(url, { prepend })

      if (queued.type === 'playlist') {
        await interaction.editReply(
          `Queued **${queued.count}** ${queued.count > 1 ? 'tracks' : 'track'} from **${
            queued.title
          }**`,
        )
        return
      }

      await interaction.editReply(`**${queued.title}** added to queue`)
    } catch (error) {
      if (error instanceof Error) {
        await interaction.editReply(error.message)
        return
      }
      await interaction.editReply('An unknown error occurred')
    }
  }

  async autocomplete(interaction: AutocompleteInteraction) {
    const query = interaction.options.getString('query', true)

    // Return empty array if query is a valid url
    const parsed = await z.string().url().safeParseAsync(query)
    if (parsed.success) {
      await interaction.respond([])
      return
    }

    if (query.length === 0) {
      await interaction.respond([])
      return
    }

    // TODO: Query different sources for results

    try {
      const { items } = await this.youtube.search(query, { limit: 16 })
      const options: ApplicationCommandOptionChoiceData<string>[] = items
        .filter(item => item.type === 'video')
        .map(item => {
          invariant(item.type === 'video', 'item type should be video')
          return {
            name: item.title,
            value: item.url,
          }
        })
      await interaction.respond(options)
    } catch (error) {
      this.logger.error(`Error while searching for ${query} - ${error}`)
      await interaction.respond([])
    }
  }
}
