import { Client, REST, Routes } from 'discord.js'
import { inject, injectable } from 'inversify'
import Config from './services/config.js'
import TYPES from './types.js'
import { z } from 'zod'

// TODO: Add pazazz to registering and logging logs

// TODO: Setup command structure
const commands = [
  {
    name: 'ping',
    description: 'responds with pong',
  },
]

@injectable()
export default class Bot {
  constructor(
    @inject(TYPES.Config) private readonly config: Config,
    @inject(TYPES.Client) private readonly client: Client,
    @inject(TYPES.Rest) private readonly rest: REST,
  ) {}

  async register() {
    // TODO: Add config option to register only if required
    // Register all slash commands
    console.log('Registering slash command(s)')
    const result = await this.rest.put(
      Routes.applicationCommands(this.config.get('DISCORD_CLIENT_ID')),
      {
        body: commands,
      },
    )
    const parsed = await z.array(z.unknown()).parseAsync(result)
    console.log(`Registered ${parsed.length} slash command(s)`)

    // Add event listeners
    this.client.on('ready', client => {
      console.log(`Logged in as ${client.user.tag}`)
    })

    this.client.on('interactionCreate', async interaction => {
      if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'ping') {
          await interaction.reply('pong')
        }
      }
    })

    // Connect and start listening for events
    await this.client.login(this.config.get('DISCORD_BOT_TOKEN'))
  }
}
