#!/bin/bash

# Railway Deployment Helper Script
# This script helps you prepare your project for Railway deployment

echo "🚀 Preparing TrustBridge for Railway deployment..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "📦 Installing Railway CLI..."
    npm install -g @railway/cli
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from example..."
    cp config/env.example .env
    echo "📝 Please edit .env with your values before deploying!"
    exit 1
fi

echo "✅ Project is ready for Railway deployment!"
echo ""
echo "Next steps:"
echo "1. Create account at https://railway.app"
echo "2. Run: railway login"
echo "3. Run: railway init"
echo "4. Run: railway up"
echo ""
echo "Or deploy via Railway web dashboard:"
echo "1. Go to https://railway.app"
echo "2. New Project → Deploy from GitHub"
echo "3. Select your TrustBridge repository"
echo "4. Add environment variables in Railway dashboard"
echo "5. Deploy!"

