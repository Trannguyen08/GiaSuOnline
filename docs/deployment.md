# Deployment

## Prerequisites
- VPS with Docker and Docker Compose installed
- SSH access
- Domain name configured

## Deploying
Deployment is handled by GitHub Actions upon pushing to the `main` branch.

Ensure these secrets are set:
- DOCKERHUB_USERNAME
- DOCKERHUB_TOKEN
- VPS_HOST
- VPS_USER
- VPS_SSH_KEY

## Rollback
If deployment fails, run:
```bash
docker compose up -d --scale django=0
docker compose up -d
```
