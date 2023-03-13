import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { inject, injectable } from 'inversify'
import invariant from 'tiny-invariant'
import Command from '../command'
import { Voice } from '../services/voice'
import TYPES from '../types'

@injectable()
export class Disconnect implements Command {
  readonly builder = new SlashCommandBuilder()
    .setName('disconnect')
    .setDescription('Disconnect from voice channel')

  constructor(@inject(TYPES.Voice) private readonly voice: Voice) {}

  async handle(interaction: ChatInputCommandInteraction) {
    // TODO: Get already narrowed down type here ?
    invariant(interaction.guild, 'guild should exist on disconnect interaction')

    const connection = this.voice.getConnection(interaction.guild.id)
    if (!connection) {
      await interaction.reply('No voice channel is currently joined')
    } else {
      // Defer reply as disconnection can take time
      await interaction.deferReply()

      await this.voice.disconnect(interaction.guild.id)
      await interaction.editReply('Disconnected from voice channel')
    }
  }
}
