import { Client, Events } from 'discord.js'
import { inject, injectable } from 'inversify'
import Event from '../event'
import { Logger } from '../services/logger'
import TYPES from '../types'

@injectable()
export default class ClientReady implements Event<Events.ClientReady> {
  readonly type = Events.ClientReady
  readonly once = true

  constructor(@inject(TYPES.Logger) private readonly logger: Logger) {}

  readonly listener = async (client: Client<true>) => {
    this.logger.info(`Logged in as ${client.user.tag}`)
  }
}
