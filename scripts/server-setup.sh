#!/bin/bash
# VPS Hardening Script for Ubuntu 22.04 LTS
set -e

echo "Starting server hardening and setup..."

# Update system
apt-get update && apt-get upgrade -y

# Set timezone
timedatectl set-timezone UTC

# Install dependencies
apt-get install -y apt-transport-https ca-certificates curl software-properties-common fail2ban htop gnupg lsb-release

# Install Docker
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

# Firewall setup
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
echo "y" | ufw enable

# Fail2Ban configuration
systemctl enable fail2ban
systemctl start fail2ban

# Disable Root SSH login
sed -i 's/PermitRootLogin yes/PermitRootLogin no/g' /etc/ssh/sshd_config
sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin no/g' /etc/ssh/sshd_config
systemctl restart ssh

# Enable automatic security updates
apt-get install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

echo "Server setup complete. Please logout and log in as a non-root user."
