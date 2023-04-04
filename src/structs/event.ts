import { Awaitable, ClientEvents } from 'discord.js'

export default interface Event<T extends keyof ClientEvents = keyof ClientEvents> {
  readonly type: T
  readonly once: boolean
  readonly listener: (...arguments_: ClientEvents[T]) => Awaitable<void>
}
