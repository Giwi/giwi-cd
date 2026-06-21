#!/bin/sh
set -e

mkdir -p /app/data /app/logs /app/artifacts /home/giwicd/.ssh
chown -R giwicd:giwicd /app/data /app/logs /app/artifacts /home/giwicd/.ssh

cat > /home/giwicd/.ssh/config << 'EOF'
Host *
  StrictHostKeyChecking no
  UserKnownHostsFile /dev/null
EOF

chown giwicd:giwicd /home/giwicd/.ssh/config
chmod 600 /home/giwicd/.ssh/config

exec su-exec giwicd "$@"
