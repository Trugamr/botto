import { VoiceConnectionStatus, entersState } from '@discordjs/voice'
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { inject, injectable } from 'inversify'
import invariant from 'tiny-invariant'
import Command from '../command'
import Players from '../managers/players'
import { Voice } from '../services/voice'
import TYPES from '../types'

@injectable()
export class Disconnect implements Command {
  readonly builder = new SlashCommandBuilder()
    .setName('disconnect')
    .setDescription('Disconnect from voice channel')
  readonly features = []

  constructor(
    @inject(TYPES.Voice) private readonly voice: Voice,
    @inject(TYPES.Players) private readonly players: Players,
  ) {}

  async handle(interaction: ChatInputCommandInteraction) {
    // TODO: Get already narrowed down type here ?
    invariant(interaction.guild, 'guild should exist on disconnect interaction')

    const connection = this.voice.get(interaction.guild.id)
    if (!connection) {
      await interaction.reply('No voice channel is currently joined')
      return
    }

    const player = this.players.get(connection)
    player.disconnect()

    await interaction.deferReply()

    await entersState(connection, VoiceConnectionStatus.Destroyed, 5_000)
    await interaction.editReply('Disconnected from voice channel')
  }
}
