#!/bin/bash

# TrustBridge WhatsApp Bot - Server Setup Script
# Run this on a fresh Ubuntu 22.04 server

set -e

echo "🚀 Setting up TrustBridge WhatsApp Bot server..."

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Node.js 18.x
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Verify Node.js installation
echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Install PM2 globally
echo "📦 Installing PM2..."
npm install -g pm2

# Install other useful tools
echo "📦 Installing additional tools..."
apt-get install -y git curl wget nano ufw

# Setup firewall
echo "🔥 Configuring firewall..."
ufw allow 22/tcp
ufw allow 3000/tcp
ufw --force enable

# Create app directory
echo "📁 Creating application directory..."
mkdir -p /opt/trustbridge
cd /opt/trustbridge

# Create backup directory
mkdir -p /opt/backups

echo "✅ Server setup complete!"
echo ""
echo "Next steps:"
echo "1. Upload your TrustBridge project to /opt/trustbridge"
echo "2. Run: cd /opt/trustbridge && npm install"
echo "3. Setup .env file: cp config/env.example .env && nano .env"
echo "4. Initialize database: npm run init-db"
echo "5. Start with PM2: pm2 start server.js --name trustbridge-bot"
echo "6. Save PM2 config: pm2 save && pm2 startup"

