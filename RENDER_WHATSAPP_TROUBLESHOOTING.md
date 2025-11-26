# 🔧 WhatsApp QR Code Scanning on Render - Troubleshooting Guide

## ⚠️ Important: This is Running on Render Cloud, Not Local!

Since your bot is deployed on Render, you need to access logs and manage the service differently than local development.

## 📱 How to See the QR Code on Render

### Step 1: Access Render Logs
1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Click on your service** (`trustbridge-bot` or whatever you named it)
3. **Click on "Logs" tab** (top navigation)
4. **Look for the QR code** - it will appear as ASCII art in the logs
5. **Scroll down** if needed - the QR code appears when WhatsApp initializes

### Step 2: Scan the QR Code
1. **Open WhatsApp** on your phone
2. **Go to**: Settings → Linked Devices → Link a Device
3. **Point your camera** at the QR code shown in Render logs
4. **Scan it** - you have about 60 seconds before it refreshes

## 🔄 How to Restart the Service on Render

### Method 1: Manual Restart (Recommended)
1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Click on your service**
3. **Click "Manual Deploy"** → **"Clear build cache & deploy"** (optional but recommended)
4. **Or click "Restart"** button (if available)
5. **Wait for deployment** to complete
6. **Check Logs** for new QR code

### Method 2: Push to GitHub (Auto-Deploy)
1. **Make a small change** to trigger redeploy:
   ```bash
   # On your local machine
   echo "# Restart" >> README.md
   git add README.md
   git commit -m "Trigger redeploy"
   git push origin main
   ```
2. **Render will auto-deploy**
3. **Check Logs** for new QR code

## 🗑️ How to Clear WhatsApp Session on Render

### Option 1: Use Render Shell (Recommended)
1. **Go to Render Dashboard** → Your Service
2. **Click "Shell" tab** (if available on your plan)
3. **Run these commands**:
   ```bash
   rm -rf data/whatsapp-session
   ```
4. **Restart the service** (see above)

### Option 2: Delete via Environment Variable
Unfortunately, Render doesn't easily allow direct file deletion. Instead:

1. **Restart the service** (this will create a new session)
2. **Or redeploy** which clears temporary files

### Option 3: Add a Reset Endpoint (Advanced)
We can add a special endpoint to clear the session. Let me know if you want this.

## 🐛 Common Issues on Render

### Issue 1: QR Code Not Appearing in Logs
**Solution:**
- Wait 30-60 seconds after deployment
- Check if WhatsApp initialization started
- Look for messages like "Initializing WhatsApp client..."
- If not, check for errors in logs

### Issue 2: QR Code Expires Before You Can Scan
**Solution:**
- QR codes auto-refresh every 60 seconds
- Keep the Render logs page open
- When you see a new QR code, scan it immediately
- The logs will show: "📱 SCAN THIS QR CODE WITH WHATSAPP NOW!"

### Issue 3: "Couldn't Link Device" Error
**Solution:**
- Make sure your phone has internet connection
- Try using mobile data instead of WiFi
- Clear the session and restart (see above)
- Wait 10 seconds between restart and scanning

### Issue 4: Session Persists After Restart
**Solution:**
- Render persists files in the `data/` directory
- Use Render Shell to delete `data/whatsapp-session`
- Or trigger a full redeploy with cache clear

### Issue 5: Can't Access Render Shell
**Solution:**
- Shell access might not be available on Free tier
- Use Method 2 (GitHub push) to trigger redeploy
- Or contact Render support for shell access

## 📋 Step-by-Step: Clear Session and Get New QR Code on Render

### Complete Process:
1. **Go to Render Dashboard** → Your Service
2. **Click "Logs"** to see current status
3. **Click "Manual Deploy"** → **"Clear build cache & deploy"**
4. **Wait for deployment** (2-5 minutes)
5. **Go to "Logs" tab** again
6. **Look for**: "📱 SCAN THIS QR CODE WITH WHATSAPP NOW!"
7. **Scan the QR code** from the logs
8. **Wait for**: "✅ WhatsApp client is ready!"

## 🔍 What to Look For in Render Logs

### ✅ Good Signs:
```
Initializing WhatsApp client...
⏳ This may take a moment, especially on first run...
📱 SCAN THIS QR CODE WITH WHATSAPP NOW!
[QR CODE APPEARS HERE]
✅ WhatsApp authenticated successfully!
✅ WhatsApp client is ready!
```

### ❌ Problem Signs:
```
❌ Authentication failure
⚠️ WhatsApp client disconnected
❌ Error: ...
```

## 💡 Pro Tips for Render

1. **Keep Logs Tab Open**: The QR code appears in real-time
2. **Use Mobile Data**: Sometimes WiFi blocks WhatsApp Web connections
3. **Screenshot the QR Code**: If it's too small, screenshot and zoom in
4. **Check Deployment Status**: Make sure service is "Live" before scanning
5. **Wait for Full Initialization**: Don't scan too early - wait for the QR code message

## 🆘 Still Not Working?

If you've tried everything:
1. **Check Render Status Page**: https://status.render.com
2. **Contact Render Support**: They can help with shell access
3. **Try Different Network**: Use mobile data or different WiFi
4. **Check WhatsApp Account**: Make sure it's a regular (not Business API) account

## 📞 Need Help?

If the QR code still won't scan:
- Share the error message from Render logs
- Check if the service is actually running
- Verify the logs show WhatsApp initialization starting
- Make sure you're scanning from the Render logs, not a screenshot

