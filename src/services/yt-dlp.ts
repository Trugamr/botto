import { execa } from 'execa'
import { injectable } from 'inversify'
import { z } from 'zod'

@injectable()
export class YtDlp {
  async version() {
    const { stdout } = await execa('yt-dlp', ['--version'])
    return stdout
  }

  /**
   * Get video links from youtube playlist link
   */
  async getPlaylistVideos(playlist: string) {
    const { stdout } = await execa('yt-dlp', [
      '-j',
      '--flat-playlist',
      '--no-warnings',
      playlist,
    ])

    return stdout.split('\n').map(line => {
      const json = JSON.parse(line)
      return z
        .object({ title: z.string(), url: z.string().url(), duration: z.number() })
        .parse(json)
    })
  }
}
