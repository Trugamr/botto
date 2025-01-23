import { injectable } from 'inversify'
import { Innertube, YTNodes } from 'youtubei.js'

@injectable()
export class Youtube {
  private api: Innertube | undefined

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

  /**
   * Search for a video
   */
  async search(query: string) {
    const api = await this.getAPI()
    const result = await api.search(query, { type: 'video' })
    // Filter out non-video results
    return result.videos.filter(video => video.is(YTNodes.Video))
  }

  /**
   * Get the cached youtube api instance
   */
  private async getAPI() {
    if (!this.api) {
      this.api = await Innertube.create()
    }
    return this.api
  }
}
