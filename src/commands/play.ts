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

    // Tasks after this can take more than 3 seconds to complete
    await interaction.deferReply()

    // If query is a valid url, use it directly
    let url: string | undefined
    if (result.success) {
      url = result.data
    } else {
      // Otherwise, try to search for a track
      let videos: Awaited<ReturnType<Youtube['search']>>
      try {
        videos = await this.youtube.search(query)
      } catch (error) {
        await interaction.editReply('An error occurred while searching')
        return
      }
      if (videos.length === 0) {
        await interaction.editReply('No results found')
        return
      }

      url = videos[0].endpoint?.toURL()
      if (!url) {
        await interaction.editReply('An error occurred while getting video url')
        return
      }
    }

    // Get connection
    const connection = this.voice.get(interaction.guild.id)
    invariant(connection, 'voice connection should not be undefined')

    // Get player
    invariant(interaction.guild, 'guild info should pe present on interaction')
    const player = this.players.get(connection, true)
    invariant(player, 'player should not be undefined')

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
      const videos = await this.youtube.search(query)
      const options: ApplicationCommandOptionChoiceData<string>[] = videos
        // Keep only videos that have a url
        .filter(video => video.endpoint?.toURL())
        .slice(0, 25) // Max 25 results allowed by Discord API
        .map(video => {
          let title = video.title.toString()
          // Upto 100 characters are allowed in option names in discord api
          if (title.length > 100) {
            title = `${title.slice(0, 97)}...`
          }

          const url = video.endpoint?.toURL()
          invariant(url, 'video url should not be undefined')

          return { name: title, value: url }
        })
      await interaction.respond(options)
    } catch (error) {
      this.logger.error(`Error while searching for ${query} - ${error}`)
      await interaction.respond([])
    }
  }
}
