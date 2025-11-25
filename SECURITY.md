# Security Checklist - API Keys Protection

## ✅ Current Protection

1. **`.env` file is in `.gitignore`** ✅
   - All environment variables including API keys are stored in `.env`
   - `.env` is never committed to Git

2. **Example files use placeholders** ✅
   - `config/env.example` uses `your_google_api_key_here`
   - `SETUP_API_KEY.md` uses placeholders (no real keys)

3. **No hardcoded keys in source code** ✅
   - All API keys are loaded from `process.env`
   - No keys are hardcoded in `.js` files

## 🔒 Before Pushing to GitHub

### 1. Check for Real API Keys
```bash
# Search for actual API keys (starts with AIza)
grep -r "AIzaSy" . --exclude-dir=node_modules --exclude=".git"

# Should return NO results (or only in .env which is ignored)
```

### 2. Verify .gitignore
```bash
# Check if .env is ignored
git check-ignore .env

# Should return: .env
```

### 3. Check What Will Be Committed
```bash
# See what files are staged
git status

# Make sure .env is NOT listed
```

### 4. Review Recent Changes
```bash
# Check if .env was ever committed (check history)
git log --all --full-history -- .env

# If .env appears in history, you need to remove it:
# git filter-branch --force --index-filter \
#   "git rm --cached --ignore-unmatch .env" \
#   --prune-empty --tag-name-filter cat -- --all
```

## 🚨 If You Accidentally Committed API Keys

### Immediate Actions:

1. **Revoke the exposed API key immediately:**
   - Go to Google Cloud Console
   - Navigate to APIs & Services → Credentials
   - Delete or regenerate the exposed key

2. **Remove from Git history:**
   ```bash
   # Remove .env from all commits
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all
   
   # Force push (WARNING: This rewrites history)
   git push origin --force --all
   ```

3. **Create new API key:**
   - Generate a new key in Google Cloud Console
   - Update your local `.env` file
   - Never commit it again

## 📋 Pre-Commit Checklist

Before every commit, verify:

- [ ] `.env` is in `.gitignore`
- [ ] No API keys in source code files
- [ ] No API keys in documentation files
- [ ] `git status` shows `.env` as untracked (not staged)
- [ ] All example files use placeholders

## 🔐 Best Practices

1. **Never commit `.env` files**
   - Always use `.env.example` with placeholders
   - Keep `.env` in `.gitignore`

2. **Use environment variables in production**
   - Set variables in your hosting platform (Railway, Render, etc.)
   - Never hardcode keys in code

3. **Rotate keys regularly**
   - Change API keys periodically
   - Revoke unused keys

4. **Use different keys for dev/prod**
   - Development key for local testing
   - Production key for deployed app
   - Never mix them

5. **Monitor API usage**
   - Check Google Cloud Console regularly
   - Set up usage alerts
   - Watch for unexpected spikes

## 🛡️ Additional Security

### For Production Deployment:

1. **Use secrets management:**
   - Railway: Environment variables in dashboard
   - Render: Environment variables in dashboard
   - DigitalOcean: Use App Platform secrets

2. **Restrict API key permissions:**
   - Only enable APIs you need
   - Use API key restrictions in Google Cloud Console
   - Limit by IP address if possible

3. **Enable API key restrictions:**
   - Go to Google Cloud Console → APIs & Services → Credentials
   - Edit your API key
   - Set Application restrictions
   - Set API restrictions

## ✅ Verification Commands

```bash
# Check if .env is ignored
git check-ignore .env

# Search for any API keys in tracked files
git grep "AIzaSy" --cached

# View what will be committed
git diff --cached

# Check .gitignore is working
git status --ignored
```

---

**Remember:** If you're unsure, don't commit. It's better to ask or check twice than to expose sensitive credentials.

