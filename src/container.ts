import { Client, GatewayIntentBits, REST } from 'discord.js'
import { Container } from 'inversify'
import Bot from './bot.js'
import Ping from './commands/ping.js'
import ClientReady from './events/client-ready.js'
import InteractionCreate from './events/interaction-create.js'
import Config from './services/config.js'
import { logger } from './services/logger.js'
import TYPES from './types.js'

const intents = [GatewayIntentBits.Guilds]

const container = new Container()

// Logger
container.bind(TYPES.Logger).toConstantValue(logger)

// Config
container.bind(TYPES.Config).to(Config).inSingletonScope()

// Bot
const config = container.get<Config>(TYPES.Config)
container
  .bind(TYPES.Rest)
  .toConstantValue(new REST({ version: '10' }).setToken(config.get('DISCORD_BOT_TOKEN')))
container.bind(TYPES.Client).toConstantValue(new Client({ intents }))
container.bind(TYPES.Bot).to(Bot).inSingletonScope()

// Events
const events = [ClientReady, InteractionCreate]
for (const event of events) {
  container.bind(TYPES.Event).to(event).inSingletonScope()
}

// Commands
const commands = [Ping]
for (const command of commands) {
  container.bind(TYPES.Command).to(command).inSingletonScope()
}

export default container
