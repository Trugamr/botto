import 'dotenv/config'
import { connect } from '@dagger.io/dagger'
import type Client from '@dagger.io/dagger/dist/api/client.gen.js'
import { z } from 'zod'
import info from '../package.json' assert { type: 'json' }

// Validate environment variables
const { REGISTRY_URL, REGISTRY_USERNAME, REGISTRY_PASSWORD } = z
  .object({
    REGISTRY_URL: z.string().nonempty().default('docker.io'),
    REGISTRY_USERNAME: z.string().nonempty(),
    REGISTRY_PASSWORD: z.string().nonempty(),
  })
  .parse(process.env)

// Define the pipeline
async function pipeline(client: Client) {
  // Create base image that has pnpm
  const base = () => {
    return client.container().from('node:18.17.0-alpine').withExec(['corepack', 'enable'])
  }

  // Create source directory
  const source = client.host().directory('.', { exclude: ['.git', 'node_modules', '.env'] })

  // Install all dependencies
  const development = base()
    // Required for building native dependencies like @discordjs/opus
    .withExec(['apk', 'add', 'python3', 'make', 'g++'])
    .withWorkdir('/app')
    // Only copy the files required for installing dependencies
    .withFile('package.json', source.file('package.json'))
    .withFile('pnpm-lock.yaml', source.file('pnpm-lock.yaml'))
    .withDirectory('patches', source.directory('patches'))
    .withExec(['pnpm', 'install', '--frozen-lockfile'])

  // Remove dev dependencies
  const production = base()
    .withWorkdir('/app')
    // Copy the files required for pruning
    .withFile('package.json', development.file('package.json'))
    .withFile('pnpm-lock.yaml', development.file('pnpm-lock.yaml'))
    .withDirectory('patches', development.directory('patches'))
    // Copy the installed dependencies from the development image
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
  const password = client.setSecret('docker-hub-password', REGISTRY_PASSWORD)
  const authed = image.withRegistryAuth(REGISTRY_URL, REGISTRY_USERNAME, password)

  const versioned = await authed.publish(`${REGISTRY_USERNAME}/botto:${info.version}`)
  console.log('Published versioned image to registry', versioned)

  const latest = await authed.publish(`${REGISTRY_USERNAME}/botto:latest`)
  console.log('Published latest image to registry', latest)
}

// Run the pipeline
await connect(pipeline, { LogOutput: process.stdout })
