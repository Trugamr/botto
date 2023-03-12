import { injectable } from 'inversify'

@injectable()
export class Youtube {
  parse<T extends string>(url: T): { type: 'video' | 'playlist'; url: T } {
    const { host, searchParams } = new URL(url)
    const params = Object.fromEntries(searchParams)

    // TODO: Add more hostnames
    switch (host) {
      case 'www.youtube.com':
      case 'music.youtube.com':
        if ('list' in params) {
          return { type: 'playlist', url }
        } else if ('v' in params) {
          return { type: 'video', url }
        }
    }

    throw new Error('Invalid or unsupported youtube url')
  }
}
