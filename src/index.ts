import 'dotenv/config'
import 'reflect-metadata'
import container from './container.js'
import TYPES from './types.js'
import Bot from './bot.js'

// TODO: Add logger service

const bot = container.get<Bot>(TYPES.Bot)

await bot.register()
