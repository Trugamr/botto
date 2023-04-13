<img src="https://fading.blue/u/312435.png" width="128" height="128">

# Botto 🦦

[![Docker Image Size (latest by date)](https://img.shields.io/docker/image-size/trugamr/botto?sort=date)](https://hub.docker.com/r/trugamr/botto)
[![Docker Pulls](https://img.shields.io/docker/pulls/trugamr/botto.svg)](https://hub.docker.com/r/trugamr/botto)
[![GitHub issues](https://img.shields.io/github/issues/trugamr/botto)](https://github.com/trugamr/botto/issues)

Botto, the otter named Otto, is a playful Discord bot that can play media from various remote sources in your Discord server.

## Features

- ✍ Written in TypeScript
- 🎶 Queue multiple tracks from a playlist
- 🎥 Livestream playback support
- 🤝 Play in multiple guilds

Botto is designed to be extensible and new features will be added over time.

## Running

Before running Botto, you will need to have the following prerequisites installed:

- [Node.js](https://nodejs.org/)
- [pnpm](https://pnpm.io/)
- [ffmpeg](https://ffmpeg.org/)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp)

1. Clone the repository using `git clone https://github.com/trugamr/botto.git`
2. Install dependencies using `pnpm install`
3. Create a `.env` file using the provided `.env.example` file as a template, and fill in your own values.
4. Build the project using `pnpm run build`
5. Start the bot using `pnpm run start`

## Docker

You can also play with Botto in a Docker container. To start the container, run:

```bash
docker run -d --name botto -e DISCORD_CLIENT_ID=<your-client-id> -e DISCORD_BOT_TOKEN=<your-bot-token> trugamr/botto
```

Make sure to replace `<your-client-id>` and `<your-bot-token>` with your own values.
For a full list of available environment variables, please refer to the `.env.example` file included in the repository.

## Contributing

If you would like to contribute, you can fork the repository, create a new feature or bugfix branch, and create a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE.md) file for more information.
