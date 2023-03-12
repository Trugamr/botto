import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'

export default interface Command {
  readonly builder: Pick<SlashCommandBuilder, 'name' | 'toJSON'>
  handle(interaction: ChatInputCommandInteraction): Promise<void>
}
