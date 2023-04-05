import { connect } from '@dagger.io/dagger'
import type Client from '@dagger.io/dagger/dist/api/client.gen.js'

async function pipeline(client: Client) {
  const base = () => {
    return client.container().from('node:18.15.0-alpine').withExec(['corepack', 'enable'])
  }

  const source = client.host().directory('.', { exclude: ['.git', 'node_modules', '.env'] })

  const development = base()
    .withMountedDirectory('/app', source)
    .withWorkdir('/app')
    .withExec(['pnpm', 'install'])

  const production = base()
    .withMountedDirectory('/app', source)
    .withWorkdir('/app')
    .withDirectory('node_modules', development.directory('node_modules'))
    .withExec(['pnpm', 'prune', '--prod'])

  const build = base()
    .withMountedDirectory('/app', source)
    .withWorkdir('/app')
    .withDirectory('node_modules', development.directory('node_modules'))
    .withExec(['pnpm', 'run', 'build'])

  const image = base()
    .withExec(['apk', 'add', 'ffmpeg', 'yt-dlp'])
    .withWorkdir('/app')
    .withDirectory('node_modules', production.directory('node_modules'))
    .withDirectory('dist', build.directory('dist'))
    .withFile('package.json', build.file('package.json'))
    .withExposedPort(3000)
    .withEntrypoint(['node', 'dist/index.js'])

  // TODO: Publish to docker hub
  const address = await image.publish('ttl.sh/botto:1h')

  console.log('Published to registry', address)
}

await connect(pipeline, { LogOutput: process.stdout })
