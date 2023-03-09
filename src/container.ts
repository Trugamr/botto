import { Container } from 'inversify'
import Config from './services/config.js'
import TYPES from './types.js'
import Bot from './bot.js'
import { Client, GatewayIntentBits, REST } from 'discord.js'
import Ping from './commands/ping.js'

const intents = [GatewayIntentBits.Guilds]

const container = new Container()

// Config
container.bind(TYPES.Config).to(Config).inSingletonScope()

// Bot
const config = container.get<Config>(TYPES.Config)
container
  .bind(TYPES.Rest)
  .toConstantValue(
    new REST({ version: '10' }).setToken(config.get('DISCORD_BOT_TOKEN')),
  )
container.bind(TYPES.Client).toConstantValue(new Client({ intents }))
container.bind(TYPES.Bot).to(Bot).inSingletonScope()

// Commands
const commands = [Ping]
for (const command of commands) {
  container.bind(TYPES.Command).to(command).inSingletonScope()
}

export default container
