import 'dotenv/config'
import { getEnv } from './utils/env.js'
import { REST, Routes, Client, GatewayIntentBits } from 'discord.js'
import { z } from 'zod'

const { DISCORD_CLIENT_ID, DISCORD_BOT_TOKEN } = getEnv()

const commands = [{ name: 'ping', description: 'Replies with Pong!' }]

// Create a new discord api client
const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN)

// Register existing slash commands on startup
try {
  console.log('Registering slash command(s)')
  const data = await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), {
    body: commands,
  })
  const parsed = await z.array(z.unknown()).parseAsync(data)
  console.log(`Registerd ${parsed.length} slash command(s) successfully`)
} catch (error) {
  console.error(error)
}

// Create new bot
const client = new Client({ intents: [GatewayIntentBits.Guilds] })

// Setup bot event listeners
client.on('ready', client => {
  console.log(`Logged in as ${client.user.tag}`)
})

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) {
    return
  }

  if (interaction.commandName === 'ping') {
    await interaction.reply('Pong')
  }
})

try {
  await client.login(DISCORD_BOT_TOKEN)
} catch (error) {
  console.error('Failed to login as bot')
}
