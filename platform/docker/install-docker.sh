#!/usr/bin/env bash
set -euo pipefail

# Install Docker Engine (docker-ce) on Ubuntu 24.04 (Noble) + compose plugin
echo "==> Add Docker apt repo (download.docker.com)"
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
$(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" \
  > /etc/apt/sources.list.d/docker.list

echo "==> apt update"
apt-get update -qq

echo "==> apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin"
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "==> Enable + start docker (systemd)"
systemctl enable docker 2>/dev/null || true
systemctl start docker || service docker start || true

echo "==> Add user '${USER:-$SUDO_USER}' to docker group"
usermod -aG docker "${USER:-$SUDO_USER}"
newgrp docker 2>/dev/null || true

echo "==> Verify"
docker --version
docker compose version
docker info --format 'Docker OK: {{.ServerVersion}}' || service docker status 2>/dev/null || true
echo "DONE: log out/in or run 'newgrp docker' so your group membership applies."