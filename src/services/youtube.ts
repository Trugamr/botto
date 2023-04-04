import { injectable } from 'inversify'
import ytsr from 'ytsr'

@injectable()
export class Youtube {
  parse<T extends string>(url: T): { type: 'video' | 'playlist'; url: T } {
    const { host, searchParams } = new URL(url)
    const parameters = Object.fromEntries(searchParams)

    // TODO: Add more hostnames
    switch (host) {
      case 'www.youtube.com':
      case 'music.youtube.com': {
        if ('list' in parameters) {
          return { type: 'playlist', url }
        } else if ('v' in parameters) {
          return { type: 'video', url }
        }
      }
    }

    throw new Error('Invalid or unsupported youtube url')
  }

  search(query: string, options?: ytsr.Options) {
    return ytsr(query, options)
  }
}
