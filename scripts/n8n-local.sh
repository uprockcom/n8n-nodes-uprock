#!/usr/bin/env sh
set -eu

command="${1:-up}"

case "$command" in
	up)
		npm run build
		docker compose up
		;;
	up-detached)
		npm run build
		docker compose up -d
		;;
	rebuild)
		npm run build
		docker compose up -d --force-recreate
		;;
	down)
		docker compose down
		;;
	logs)
		docker compose logs -f n8n
		;;
	status)
		docker compose ps
		;;
	*)
		echo "Usage: $0 [up|up-detached|rebuild|down|logs|status]" >&2
		exit 1
		;;
esac
