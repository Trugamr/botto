import { Client, Events } from 'discord.js'
import { inject, injectable } from 'inversify'
import { Logger } from '../services/logger.js'
import Event from '../structs/event.js'
import TYPES from '../types.js'

@injectable()
export default class ClientReady implements Event<Events.ClientReady> {
  readonly type = Events.ClientReady
  readonly once = true

  constructor(@inject(TYPES.Logger) private readonly logger: Logger) {}

  readonly listener = async (client: Client<true>) => {
    this.logger.info(`Logged in as ${client.user.tag}`)
  }
}
