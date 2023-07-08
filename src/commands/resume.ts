import { AudioPlayerStatus } from '@discordjs/voice'
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { inject, injectable } from 'inversify'
import invariant from 'tiny-invariant'
import Players from '../managers/players.js'
import { Voice } from '../services/voice.js'
import Command from '../structs/command.js'
import TYPES from '../types.js'

@injectable()
export default class Resume implements Command {
  readonly builder = new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume playback')
  readonly features = []

  constructor(
    @inject(TYPES.Voice) private readonly voice: Voice,
    @inject(TYPES.Players) private readonly players: Players,
  ) {}

  async handle(interaction: ChatInputCommandInteraction) {
    // TODO: Get narrowed interaction
    invariant(interaction.guild, 'stop interaction should be a guild interaction')

    const connection = this.voice.get(interaction.guild.id)
    if (!connection) {
      await interaction.reply('Nothing is being played')
      return
    }

    const player = this.players.get(connection, true)
    invariant(player, 'player should exist if connection exists')

    if (player.status !== AudioPlayerStatus.Paused) {
      await interaction.reply('Nothing to resume')
      return
    }
    player.resume()

    // TODO: Ensure player resumed state?
    await interaction.reply('Playback resumed')
  }
}
