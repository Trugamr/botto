import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'

export default interface Command {
  readonly builder: SlashCommandBuilder
  readonly handle: (interaction: ChatInputCommandInteraction) => Promise<void>
}
