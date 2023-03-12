import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { inject, injectable } from 'inversify'
import Command from '../command.js'
import { Youtube } from '../services/youtube.js'
import TYPES from '../types.js'

@injectable()
export default class Play implements Command {
  constructor(@inject(TYPES.Youtube) private readonly youtube: Youtube) {}

  readonly builder = new SlashCommandBuilder()
    .setName('play')
    .setDescription('Search or play music using a link')
    .addStringOption(option =>
      option.setName('query').setDescription('Youtube video url').setRequired(true),
    )

  async handle(interaction: ChatInputCommandInteraction) {
    const query = interaction.options.getString('query', true)
    await interaction.reply(`Query: ${query}`)
  }
}
