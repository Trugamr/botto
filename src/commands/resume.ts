import { AudioPlayerStatus } from '@discordjs/voice'
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { inject, injectable } from 'inversify'
import invariant from 'tiny-invariant'
import Players from '../managers/players'
import { Voice } from '../services/voice'
import Command from '../structs/command'
import TYPES from '../types'

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

    const player = this.players.get(connection)
    if (player.status !== AudioPlayerStatus.Paused) {
      await interaction.reply('Nothing to resume')
      return
    }
    player.resume()

    // TODO: Ensure player resumed state?
    await interaction.reply('Playback resumed')
  }
}
