import { Collection, Events, Interaction, InteractionType } from 'discord.js'
import { injectable, multiInject } from 'inversify'
import invariant from 'tiny-invariant'
import Command from '../command'
import Event from '../event'
import TYPES from '../types'

@injectable()
export default class InteractionCreate implements Event<Events.InteractionCreate> {
  private readonly commandsByName = new Collection<string, Command>()
  readonly type = Events.InteractionCreate
  readonly once = false

  constructor(@multiInject(TYPES.Command) private readonly commands: Command[]) {
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
      await command.handle(interaction)
    }
  }
}
