import { z } from 'zod'
import { injectable } from 'inversify'

const schema = z.object({
  DISCORD_CLIENT_ID: z.string().nonempty(),
  DISCORD_BOT_TOKEN: z.string().nonempty(),
})

type ConfigVariables = z.infer<typeof schema>

@injectable()
export default class Config {
  private readonly config: ConfigVariables
  constructor() {
    this.config = schema.parse(process.env)
  }

  get<T extends keyof ConfigVariables>(key: T) {
    return this.config[key]
  }
}
