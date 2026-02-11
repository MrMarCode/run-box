#!/usr/bin/env bash
set -euo pipefail

FORCE=false
if [[ "${1:-}" == "-f" ]]; then
   FORCE=true
   shift
fi

CONTAINER_NAME="run-box"
IMAGE="localhost/run-box"
MOUNT_DIRS="${1:-}"
PORT="${2:-3100}"

VOLUME_ARGS=()
if [[ -n "$MOUNT_DIRS" ]]; then
   IFS=',' read -ra DIRS <<< "$MOUNT_DIRS"
   for dir in "${DIRS[@]}"; do
      VOLUME_ARGS+=(-v "${dir}:${dir}")
   done
fi

if podman ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
   if [[ "$FORCE" == true ]]; then
      podman stop "$CONTAINER_NAME" >/dev/null
   else
      echo "run-box is already running"
      exit 0
   fi
fi

if podman ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
   podman rm "$CONTAINER_NAME" >/dev/null
fi

podman run -d --rm \
   --name "$CONTAINER_NAME" \
   -p "${PORT}:${PORT}" \
   -e "PORT=${PORT}" \
   "${VOLUME_ARGS[@]}" \
   "$IMAGE" > /dev/null

echo "run-box started on port ${PORT}"
