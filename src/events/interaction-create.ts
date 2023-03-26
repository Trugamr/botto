import { ChannelType, Collection, Events, Interaction } from 'discord.js'
import { inject, injectable, multiInject } from 'inversify'
import invariant from 'tiny-invariant'
import { Voice } from '../services/voice'
import Command, { Feature } from '../structs/command'
import Event from '../structs/event'
import TYPES from '../types'

@injectable()
export default class InteractionCreate implements Event<Events.InteractionCreate> {
  private readonly commandsByName = new Collection<string, Command>()
  readonly type = Events.InteractionCreate
  readonly once = false

  constructor(
    @multiInject(TYPES.Command) private readonly commands: Command[],
    @inject(TYPES.Voice) private readonly voice: Voice,
  ) {
    for (const command of this.commands) {
      invariant(command.builder.name, 'command name is required')
      this.commandsByName.set(command.builder.name, command)
    }
  }

  readonly listener = async (interaction: Interaction) => {
    if (interaction.isCommand()) {
      const command = this.commandsByName.get(interaction.commandName)
      if (!command) {
        // TODO: Send error message instead
        return
      }

      // TODO: Send error message
      invariant(interaction.guild, 'Commands can only be used in guild')

      // Command requires voice connection
      if (command.features.includes(Feature.Voice)) {
        let connection = this.voice.get(interaction.guild.id)
        // If no active voice connection is found try to join one
        if (!connection) {
          // Check if user is currently in a voice channel
          const channel = interaction.guild.channels.cache.find(channel => {
            if (channel.type === ChannelType.GuildVoice) {
              return channel.members.find(member => member.id === interaction.user.id)
            }
            return false
          })
          if (!channel) {
            await interaction.reply('You must be in voice channel')
            return
          }
          invariant(channel.type === ChannelType.GuildVoice, 'channel must be voice channel')
          // Join voice channel
          connection = this.voice.join(channel)
        }
      }

      await command.handle(interaction)
    }
  }
}
