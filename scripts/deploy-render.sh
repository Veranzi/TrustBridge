#!/bin/bash

# Render Deployment Helper Script
# This script helps you prepare your project for Render deployment

echo "🚀 Preparing TrustBridge for Render deployment..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from example..."
    cp config/env.example .env
    echo "📝 Please edit .env with your values!"
fi

echo "✅ Project is ready for Render deployment!"
echo ""
echo "Next steps:"
echo "1. Create account at https://render.com"
echo "2. New → Web Service"
echo "3. Connect your GitHub repository"
echo "4. Settings:"
echo "   - Build Command: npm install"
echo "   - Start Command: npm start"
echo "5. Add environment variables in Render dashboard"
echo "6. Deploy!"

