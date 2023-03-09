import { Interaction, SlashCommandBuilder } from 'discord.js'

export default interface Command {
  readonly builder: SlashCommandBuilder
  readonly handle: (interaction: Interaction) => Promise<void>
}
