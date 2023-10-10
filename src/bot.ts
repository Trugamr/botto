import { Client, Collection, REST, Routes } from 'discord.js'
import { inject, injectable, multiInject } from 'inversify'
import invariant from 'tiny-invariant'
import { z } from 'zod'
import Config from './services/config.js'
import type { Logger } from './services/logger.js'
import Command from './structs/command.js'
import Event from './structs/event.js'
import TYPES from './types.js'

@injectable()
export default class Bot {
  private readonly commandsByName = new Collection<string, Command>()

  constructor(
    @inject(TYPES.Logger) private readonly logger: Logger,
    @inject(TYPES.Config) private readonly config: Config,
    @inject(TYPES.Client) private readonly client: Client,
    @inject(TYPES.Rest) private readonly rest: REST,
    @multiInject(TYPES.Event) private readonly events: Event[],
    @multiInject(TYPES.Command) private readonly commands: Command[],
  ) {
    for (const command of this.commands) {
      invariant(command.builder.name, 'commmand name is required')
      this.commandsByName.set(command.builder.name, command)
    }
  }

  async register() {
    // TODO: Add config option to register only if required
    // Register all slash commands
    this.logger.info('Registering slash command(s)')
    const result = await this.rest.put(
      Routes.applicationCommands(this.config.get('DISCORD_CLIENT_ID')),
      {
        body: this.commandsByName.map(command => command.builder.toJSON()),
      },
    )
    const parsed = await z.array(z.unknown()).parseAsync(result)
    this.logger.info(`Registered ${parsed.length} slash command(s)`)

    // Add event listeners
    for (const event of this.events) {
      if (event.once) {
        this.client.once(event.type, event.listener)
      } else {
        this.client.on(event.type, event.listener)
      }
    }

    // Connect and start listening for events
    await this.client.login(this.config.get('DISCORD_BOT_TOKEN'))
  }

  async destroy() {
    this.logger.info('Destroying bot instance')
    await this.client.destroy()
  }
}
