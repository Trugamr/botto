import { Client, Events, GatewayIntentBits, REST } from 'discord.js'
import { Container } from 'inversify'
import Bot from './bot.js'
import { Disconnect } from './commands/disconnect.js'
import Next from './commands/next.js'
import Pause from './commands/pause.js'
import Ping from './commands/ping.js'
import Play from './commands/play.js'
import Resume from './commands/resume.js'
import Stop from './commands/stop.js'
import ClientReady from './events/client-ready.js'
import InteractionCreate from './events/interaction-create.js'
import VoiceStateUpdate from './events/voice-state-update.js'
import Players from './managers/players.js'
import Config from './services/config.js'
import { Logger, logger } from './services/logger.js'
import { Voice } from './services/voice.js'
import { Youtube } from './services/youtube.js'
import { YtDlp } from './services/yt-dlp.js'
import Command from './structs/command.js'
import Event from './structs/event.js'
import TYPES from './types.js'

const intents = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]

const container = new Container()

// Logger
container.bind<Logger>(TYPES.Logger).toConstantValue(logger)

// Config
container.bind<Config>(TYPES.Config).to(Config).inSingletonScope()

// Bot
const config = container.get<Config>(TYPES.Config)
container
  .bind<REST>(TYPES.Rest)
  .toConstantValue(new REST({ version: '10' }).setToken(config.get('DISCORD_BOT_TOKEN')))
container.bind<Client>(TYPES.Client).toConstantValue(new Client({ intents }))
container.bind<Bot>(TYPES.Bot).to(Bot).inSingletonScope()

// Services
container.bind<YtDlp>(TYPES.YtDlp).to(YtDlp).inSingletonScope()
container.bind<Youtube>(TYPES.Youtube).to(Youtube).inSingletonScope()
container.bind<Voice>(TYPES.Voice).to(Voice).inSingletonScope()

// Managers
container.bind<Players>(TYPES.Players).to(Players).inSingletonScope()

// Events
container.bind<Event<Events.ClientReady>>(TYPES.Event).to(ClientReady).inSingletonScope()
container
  .bind<Event<Events.InteractionCreate>>(TYPES.Event)
  .to(InteractionCreate)
  .inSingletonScope()
container
  .bind<Event<Events.VoiceStateUpdate>>(TYPES.Event)
  .to(VoiceStateUpdate)
  .inSingletonScope()

// Commands
const commands = [Ping, Play, Disconnect, Stop, Pause, Resume, Next]
for (const command of commands) {
  container.bind<Command>(TYPES.Command).to(command).inSingletonScope()
}

export default container
