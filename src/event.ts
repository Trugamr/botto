import { Awaitable, ClientEvents } from 'discord.js'

export default interface Event<T extends keyof ClientEvents> {
  readonly name: T
  readonly once: boolean
  readonly listener: (...args: ClientEvents[T]) => Awaitable<void>
}
