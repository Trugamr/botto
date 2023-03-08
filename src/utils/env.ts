import { z } from 'zod'

const envSchema = z.object({
  DISCORD_CLIENT_ID: z.string().nonempty(),
  DISCORD_BOT_TOKEN: z.string().nonempty(),
})

export function getEnv() {
  return envSchema.parse(process.env)
}
