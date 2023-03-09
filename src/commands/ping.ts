import { Interaction, SlashCommandBuilder } from 'discord.js'
import Command from '../command.js'
import { injectable } from 'inversify'

@injectable()
export default class Ping implements Command {
  readonly builder = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('responds with pong')

  readonly handle = async (interaction: Interaction) => {
    if (interaction.isChatInputCommand()) {
      await interaction.reply('pong')
    }
  }
}
