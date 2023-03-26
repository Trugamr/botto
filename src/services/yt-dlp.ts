import { execa } from 'execa'
import { injectable } from 'inversify'
import { z } from 'zod'

const YT_DLP = 'yt-dlp'

export type MediaInfo = z.infer<typeof MediaInfoSchema>

const PlaylistInfo = z.object({
  _type: z.literal('playlist'),
  entries: z.array(
    z.object({
      url: z.string(),
    }),
  ),
})

const VideoInfo = z.object({
  _type: z.literal('video'),
  url: z.string(),
  duration: z.number().optional(),
  acodec: z.string().optional(),
  audio_ext: z.string().optional(),
})

const MediaInfoSchema = z.discriminatedUnion('_type', [PlaylistInfo, VideoInfo])

@injectable()
export class YtDlp {
  async version() {
    const { stdout } = await execa(YT_DLP, ['--version'])
    return stdout
  }

  /**
   * Get available formats from youtube video link
   */
  async getMediaInfo(url: string) {
    // prettier-ignore
    const { stdout } = await execa(YT_DLP, [
      '--no-warnings', // Supress warnings
      '--dump-single-json', // Output JSON
      '--format', 'ba/ba*', // Get best available format
      '--flat-playlist', // Don't get info for each playlist entry
      url,
    ])
    const json = JSON.parse(stdout)
    return MediaInfoSchema.parseAsync(json)
  }
}
