# Push to GitHub - Step by Step Guide

## ✅ Step 1: Repository Initialized
Your local git repository has been initialized and all files have been committed.

## 📝 Step 2: Create GitHub Repository

### Option A: Using GitHub Website (Recommended)

1. **Go to GitHub:**
   - Visit: https://github.com/new
   - Sign in to your GitHub account

2. **Create New Repository:**
   - **Repository name:** `TrustBridge` (or `trustbridge-whatsapp-bot`)
   - **Description:** `WhatsApp chatbot for Kenyan government service issue reporting`
   - **Visibility:** Choose Public or Private
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
   - Click **"Create repository"**

3. **Copy the repository URL:**
   - GitHub will show you the repository URL
   - It will look like: `https://github.com/yourusername/TrustBridge.git`

### Option B: Using GitHub CLI (if installed)

```bash
gh repo create TrustBridge --public --source=. --remote=origin --push
```

## 🔗 Step 3: Add Remote and Push

After creating the repository on GitHub, run these commands:

```bash
# Add GitHub as remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/TrustBridge.git

# Verify remote was added
git remote -v

# Push to GitHub
git branch -M main
git push -u origin main
```

## 🔐 Step 4: Authentication

When you push, GitHub will ask for authentication:

- **If using HTTPS:** You'll need a Personal Access Token
  - Go to: https://github.com/settings/tokens
  - Generate new token (classic)
  - Select scopes: `repo` (full control)
  - Use the token as your password when pushing

- **If using SSH:** Make sure your SSH key is added to GitHub
  - Check: https://github.com/settings/keys

## ✅ Step 5: Verify

After pushing, visit your repository on GitHub:
```
https://github.com/YOUR_USERNAME/TrustBridge
```

You should see all your files there!

## 🚨 Important: Before Pushing

Make sure you've verified:
- ✅ `.env` is in `.gitignore` (it is!)
- ✅ No API keys in any files (we've removed them)
- ✅ All sensitive data is protected

## 📋 Quick Commands Summary

```bash
# Navigate to project
cd C:\Users\SEPIA\Desktop\TrustBridge

# Check status
git status

# Add remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/TrustBridge.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## 🆘 Troubleshooting

### "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/TrustBridge.git
```

### "Authentication failed"
- Use Personal Access Token instead of password
- Or set up SSH keys

### "Permission denied"
- Make sure you have write access to the repository
- Check that the repository name matches

---

**Need help?** Check GitHub's documentation: https://docs.github.com/en/get-started

