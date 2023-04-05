import 'dotenv/config'
import { connect } from '@dagger.io/dagger'
import type Client from '@dagger.io/dagger/dist/api/client.gen.js'
import { z } from 'zod'

// Validate environment variables
const { DOCKER_HUB_USERNAME, DOCKER_HUB_PASSWORD } = z
  .object({
    DOCKER_HUB_USERNAME: z.string().nonempty(),
    DOCKER_HUB_PASSWORD: z.string().nonempty(),
  })
  .parse(process.env)

// Define the pipeline
async function pipeline(client: Client) {
  // Create base image that has pnpm
  const base = () => {
    return client.container().from('node:18.15.0-alpine').withExec(['corepack', 'enable'])
  }

  // Create source directory
  const source = client.host().directory('.', { exclude: ['.git', 'node_modules', '.env'] })

  // Install all dependencies
  const development = base()
    .withMountedDirectory('/app', source)
    .withWorkdir('/app')
    .withExec(['pnpm', 'install'])

  // Remove dev dependencies
  const production = base()
    .withMountedDirectory('/app', source)
    .withWorkdir('/app')
    .withDirectory('node_modules', development.directory('node_modules'))
    .withExec(['pnpm', 'prune', '--prod'])

  // Build the application
  const build = base()
    .withMountedDirectory('/app', source)
    .withWorkdir('/app')
    .withDirectory('node_modules', development.directory('node_modules'))
    .withExec(['pnpm', 'run', 'build'])

  // Create the final image that runs the application
  const image = base()
    .withExec(['apk', 'add', 'ffmpeg', 'yt-dlp'])
    .withWorkdir('/app')
    .withDirectory('node_modules', production.directory('node_modules'))
    .withDirectory('dist', build.directory('dist'))
    .withFile('package.json', build.file('package.json'))
    .withExposedPort(3000)
    .withEntrypoint(['node', 'dist/index.js'])

  // Publish the image to registry
  const password = client.setSecret('docker-hub-password', DOCKER_HUB_PASSWORD)
  const address = await image
    .withRegistryAuth('docker.io', DOCKER_HUB_USERNAME, password)
    .publish(`${DOCKER_HUB_USERNAME}/botto`)

  console.log('Published to registry', address)
}

// Run the pipeline
await connect(pipeline, { LogOutput: process.stdout })
