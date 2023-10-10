import 'dotenv/config'
import 'reflect-metadata'
import Bot from './bot.js'
import container from './container.js'
import TYPES from './types.js'

// Create bot instance and register commands
const bot = container.get<Bot>(TYPES.Bot)
await bot.register()

// Gracefully handle shutdown
const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM']
for (const signal of signals) {
  process.on(signal, async () => {
    await bot.destroy()
    process.exit(0)
  })
}
