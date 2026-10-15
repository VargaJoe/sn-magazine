# Deployment Example

This folder contains an example Docker Compose setup for deploying the sn-magazine application using a published Docker image.

## Setup

1. Copy your environment configuration file to this folder as `.env`
   ```bash
   cp ../.env.example .env
   ```

2. Edit the `.env` file with your actual configuration values (API URLs, client IDs, etc.)

3. Start the container:
   ```bash
   docker compose up -d
   ```

4. The application will be available at `http://localhost:3000`

## Configuration

The `.env` file should contain all the `REACT_APP_*` environment variables needed by the application. See `../.env.example` for the full list of required variables.

## Notes

- This setup uses the published `vargajoe/sn-magazine:preview` image
- The container runs the development server with runtime environment variable loading
- No source code is needed - everything runs from the published image
- For development with hot reload, use the root `docker-compose.yml` instead