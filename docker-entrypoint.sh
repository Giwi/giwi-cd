#!/bin/sh
set -e

mkdir -p /app/data /app/logs /app/artifacts
chown -R giwicd:giwicd /app/data /app/logs /app/artifacts

exec su-exec giwicd "$@"
