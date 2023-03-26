import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { injectable } from 'inversify'
import Command from '../structs/command.js'

@injectable()
export default class Ping implements Command {
  readonly builder = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Responds with pong')
  readonly features = []

  async handle(interaction: ChatInputCommandInteraction) {
    await interaction.reply('pong')
  }
}
