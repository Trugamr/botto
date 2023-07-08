import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { inject, injectable } from 'inversify'
import invariant from 'tiny-invariant'
import Players from '../managers/players.js'
import { Voice } from '../services/voice.js'
import Command from '../structs/command.js'
import TYPES from '../types.js'

@injectable()
export default class Next implements Command {
  readonly builder = new SlashCommandBuilder().setName('next').setDescription('Play next track')
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
    const next = player.next()

    if (next) {
      await interaction.reply(`Playing next track **${next.title}**`)
      return
    }

    await interaction.reply('No more tracks to play')
  }
}
