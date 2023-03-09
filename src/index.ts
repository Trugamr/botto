import 'dotenv/config'
import 'reflect-metadata'
import Bot from './bot.js'
import container from './container.js'
import TYPES from './types.js'

const bot = container.get<Bot>(TYPES.Bot)

await bot.register()
