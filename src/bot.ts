import { Client, Collection, REST, Routes } from 'discord.js'
import { inject, injectable } from 'inversify'
import invariant from 'tiny-invariant'
import { z } from 'zod'
import Command from './command.js'
import container from './container.js'
import Config from './services/config.js'
import type { Logger } from './services/logger.js'
import TYPES from './types.js'

@injectable()
export default class Bot {
  private readonly commands = new Collection<string, Command>()

  constructor(
    @inject(TYPES.Logger) private readonly logger: Logger,
    @inject(TYPES.Config) private readonly config: Config,
    @inject(TYPES.Client) private readonly client: Client,
    @inject(TYPES.Rest) private readonly rest: REST,
  ) {
    const commands = container.getAll<Command>(TYPES.Command)
    for (const command of commands) {
      invariant(command.builder.name, 'commmand name is required')
      this.commands.set(command.builder.name, command)
    }
  }

  async register() {
    // TODO: Add config option to register only if required
    // Register all slash commands
    this.logger.info('Registering slash command(s)')
    const result = await this.rest.put(
      Routes.applicationCommands(this.config.get('DISCORD_CLIENT_ID')),
      {
        body: this.commands.map(command => command.builder.toJSON()),
      },
    )
    const parsed = await z.array(z.unknown()).parseAsync(result)
    this.logger.info(`Registered ${parsed.length} slash command(s)`)

    // Add event listeners
    this.client.on('ready', client => {
      this.logger.info(`Logged in as ${client.user.tag}`)
    })

    this.client.on('interactionCreate', async interaction => {
      if (interaction.isChatInputCommand()) {
        const command = this.commands.get(interaction.commandName)
        if (!command) {
          // TODO: Send error message instead
          return
        }
        command.handle(interaction)
      }
    })

    // Connect and start listening for events
    await this.client.login(this.config.get('DISCORD_BOT_TOKEN'))
  }
}
