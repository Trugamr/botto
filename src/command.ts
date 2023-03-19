import { CommandInteraction, SlashCommandBuilder } from 'discord.js'

export enum Feature {
  Voice,
}

export default interface Command {
  readonly builder: Pick<SlashCommandBuilder, 'name' | 'toJSON'>
  readonly features: Feature[]

  handle(interaction: CommandInteraction): Promise<void>
}
