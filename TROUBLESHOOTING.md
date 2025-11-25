# Troubleshooting WhatsApp Connection

## "Couldn't Link Device" Error

If you see "Couldn't link device" on your phone when scanning the QR code, try these solutions:

### 1. Network Issues
- **Make sure your phone and computer are on the same network** (same WiFi)
- Try switching to mobile data on your phone if WiFi isn't working
- Check if your firewall is blocking the connection

### 2. QR Code Expired
- QR codes expire after ~60 seconds (they auto-refresh if not scanned)
- If you see a new QR code appear, scan the latest one
- Make sure you scan quickly after it appears

### 3. Clear Session and Retry
Delete the session folder and restart:
```bash
# Stop the server (Ctrl+C)
# Delete the session folder
rm -rf data/whatsapp-session  # Linux/Mac
rmdir /s data\whatsapp-session  # Windows PowerShell
# Restart the server
npm start
```

### 4. WhatsApp Restrictions
- Make sure you're using a regular WhatsApp account (not Business API)
- Try using a different WhatsApp account
- Some accounts may have restrictions if they're new or recently created

### 5. Firewall/Antivirus
- Temporarily disable firewall/antivirus to test
- Add Node.js and Chrome to firewall exceptions
- Check if your network blocks WhatsApp Web connections

### 6. Alternative: Use RemoteAuth
If LocalAuth keeps failing, you can try using a different authentication method. However, LocalAuth is recommended for most cases.

### 7. Check Server Logs
Look for error messages in your terminal:
- "Authentication failure" - Try deleting session folder
- "Navigation" errors - Network/connection issues
- "Timeout" errors - Slow network or firewall blocking

### 8. Try Again
Sometimes it just needs a retry:
1. Stop the server (Ctrl+C)
2. Wait 10 seconds
3. Start again: `npm start`
4. Scan the new QR code immediately

## Still Not Working?

If none of these work, you might need to:
- Check if your ISP blocks WhatsApp Web
- Try from a different network
- Use WhatsApp Business API (requires Meta Business account)
- Consider using a cloud service that allows WhatsApp Web connections

