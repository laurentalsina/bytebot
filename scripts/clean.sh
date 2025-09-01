docker compose -f docker/docker-compose.proxy.yml down -v --remove-orphans
docker system prune -a -f
