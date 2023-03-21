import { AudioPlayerStatus } from '@discordjs/voice'
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { inject, injectable } from 'inversify'
import invariant from 'tiny-invariant'
import Command from '../command'
import Players from '../managers/players'
import { Voice } from '../services/voice'
import TYPES from '../types'

@injectable()
export default class Pause implements Command {
  readonly builder = new SlashCommandBuilder().setName('pause').setDescription('Pause playback')
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
    if (player.status === AudioPlayerStatus.Paused) {
      await interaction.reply('Playback is already paused')
      return
    }
    player.pause()

    // TODO: Ensure player pause state?
    await interaction.reply('Playback paused')
  }
}
