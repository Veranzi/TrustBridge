# 🚀 Push to GitHub - Quick Guide

## ✅ Local Repository Ready!

Your code has been committed locally. Now let's push it to GitHub.

## Step 1: Create GitHub Repository

1. **Go to GitHub:**
   - Visit: https://github.com/new
   - Sign in (or create account if needed)

2. **Create Repository:**
   - **Repository name:** `TrustBridge` or `trustbridge-whatsapp-bot`
   - **Description:** `WhatsApp chatbot for Kenyan government service issue reporting`
   - **Visibility:** Choose Public or Private
   - ⚠️ **IMPORTANT:** Do NOT check "Add a README file" (we already have one)
   - ⚠️ **IMPORTANT:** Do NOT add .gitignore or license (we have them)
   - Click **"Create repository"**

3. **Copy the repository URL:**
   - GitHub will show you commands, but copy the HTTPS URL
   - Example: `https://github.com/YOUR_USERNAME/TrustBridge.git`

## Step 2: Connect and Push

Open PowerShell in your project directory and run:

```powershell
# Navigate to project (if not already there)
cd C:\Users\SEPIA\Desktop\TrustBridge

# Add GitHub as remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/TrustBridge.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

## Step 3: Authentication

When you push, GitHub will ask for credentials:

### Option A: Personal Access Token (Recommended)
1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Name it: "TrustBridge Push"
4. Select scope: `repo` (full control)
5. Click "Generate token"
6. **Copy the token** (you won't see it again!)
7. When pushing, use:
   - **Username:** Your GitHub username
   - **Password:** The token (not your GitHub password)

### Option B: GitHub Desktop
- Install GitHub Desktop: https://desktop.github.com
- Sign in and push from the app

## ✅ Verify

After pushing, visit:
```
https://github.com/YOUR_USERNAME/TrustBridge
```

You should see all your files!

## 🔒 Security Check

Before pushing, verify:
- ✅ `.env` is NOT in the repository (it's in .gitignore)
- ✅ No API keys in any files
- ✅ All sensitive data is protected

## 🆘 Troubleshooting

### "remote origin already exists"
```powershell
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/TrustBridge.git
```

### "Authentication failed"
- Make sure you're using a Personal Access Token, not your password
- Token must have `repo` scope

### "Permission denied"
- Check repository name matches
- Verify you have write access

---

**Ready?** Follow the steps above and your code will be on GitHub! 🎉

