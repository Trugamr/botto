import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { inject, injectable } from 'inversify'
import invariant from 'tiny-invariant'
import Command from '../command.js'
import Players from '../managers/players.js'
import { Voice } from '../services/voice.js'
import TYPES from '../types.js'

@injectable()
export default class Stop implements Command {
  readonly builder = new SlashCommandBuilder().setName('stop').setDescription('Stop playback')
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

    // TODO: Check if player is playing before stopping
    const player = this.players.get(connection)
    player.stop()

    // TODO: Ensure player stop state?
    await interaction.reply('Playback stoppped')
  }
}
