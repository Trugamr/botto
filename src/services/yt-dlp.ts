import { execa } from 'execa'
import { injectable } from 'inversify'
import { z } from 'zod'

// TODO: Fix types and schemas

const YoutubeVideoSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  duration: z.number(),
})

const YoutubeVideoFormatSchema = z.object({
  ext: z.string(),
  acodec: z.string().optional(),
  audio_ext: z.preprocess(ext => (ext === 'none' ? undefined : ext), z.string().optional()),
  quality: z.number().optional(),
  url: z.string().url(),
})

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

    const lines = stdout.split('\n')
    const links: z.infer<typeof YoutubeVideoSchema>[] = []

    for (const line of lines) {
      const json = JSON.parse(line)
      const parsed = await YoutubeVideoSchema.parseAsync(json)
      links.push(parsed)
    }

    return links
  }

  /**
   * Get available formats from youtube video link
   */
  async getVideoInfo(url: string) {
    const { stdout } = await execa('yt-dlp', ['-j', '--no-warnings', url])
    const json = JSON.parse(stdout)
    return z
      .object({ duration: z.number(), formats: z.array(YoutubeVideoFormatSchema) })
      .parseAsync(json)
  }
}
