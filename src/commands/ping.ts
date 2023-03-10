import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { injectable } from 'inversify'
import Command from '../command.js'

@injectable()
export default class Ping implements Command {
  readonly builder = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('responds with pong')

  readonly handle = async (interaction: ChatInputCommandInteraction) => {
    await interaction.reply('pong')
  }
}
