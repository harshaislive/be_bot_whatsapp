# WhatsApp Session Manager - Team Guide

## Overview

The **WhatsApp Session Manager** is a web-based interface that allows team members to manage the WhatsApp bot's login session easily. You can view connection status, scan QR codes for login, and logout to disconnect the bot.

## Access the Session Manager

Once the bot is running, access the session manager at:

```
http://localhost:3000/session
```

Or if deployed on a server:

```
http://your-server-ip:3000/session
```

## Features

### 1. **Password Protection**
- The session manager is protected with a password
- Default password: `beforest2025`
- **IMPORTANT:** Change this password in the HTML file for production use

### 2. **Connection Status**
- Real-time display of WhatsApp connection status
- Shows bot phone number when connected
- Last connection timestamp
- Redis status indicator

### 3. **QR Code Login**
- Automatic QR code display when bot is disconnected
- Auto-refreshes every 3 seconds to get new QR codes
- Shows instructions for scanning
- Visual timer showing QR expiration (20 seconds)

### 4. **Logout / Session Deletion**
- One-click logout button when connected
- Safely disconnects WhatsApp bot
- Clears all session data (Redis + local files)
- Automatically restarts bot and shows new QR code

### 5. **Auto-Refresh**
- Status refreshes every 5 seconds automatically
- No need to manually reload the page
- Real-time updates on connection changes

## How to Use

### First Time Login

1. Start the WhatsApp bot server
2. Open `http://localhost:3000/session` in your browser
3. Enter the password: `beforest2025`
4. The QR code will be displayed automatically
5. Open WhatsApp on your phone
6. Go to **Settings → Linked Devices → Link a Device**
7. Scan the QR code shown on the page
8. Wait for connection confirmation

### Logout and Re-login

1. Go to `http://localhost:3000/session`
2. Click the **"Logout & Delete Session"** button
3. Confirm the action
4. The bot will disconnect and restart
5. A new QR code will appear within 2-5 seconds
6. Scan the new QR code to reconnect

### Checking Status

1. Open `http://localhost:3000/session`
2. View the connection status at the top
   - **Green dot** = Connected
   - **Red dot** = Disconnected
3. See bot details:
   - Bot phone number
   - Last connected time
   - Redis connection status

## Security Recommendations

### Change the Default Password

1. Open `public/session-manager.html`
2. Find line 263:
   ```javascript
   const VALID_PASSWORD = 'beforest2025'; // Change this to your desired password
   ```
3. Change `beforest2025` to your secure password
4. Save the file and restart the bot

### Additional Security

For production environments, consider:

1. **Use HTTPS** - Deploy behind a reverse proxy with SSL
2. **IP Whitelisting** - Restrict access to specific IPs
3. **VPN Access** - Require VPN connection to access
4. **Environment Variables** - Move password to `.env` file
5. **Session Timeout** - Add automatic logout after inactivity

## API Endpoints Used

The session manager uses these API endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/whatsapp/status` | GET | Get current connection status |
| `/api/whatsapp/qr` | GET | Retrieve QR code image |
| `/api/whatsapp/disconnect` | POST | Logout and delete session |

## Troubleshooting

### QR Code Not Showing

- **Check**: Is the bot disconnected?
- **Solution**: The QR only shows when WhatsApp is not connected
- **Try**: Click "Logout & Delete Session" to force disconnect

### QR Code Expired

- **Issue**: QR codes expire after 20 seconds
- **Solution**: The page auto-refreshes every 3 seconds to get new QR
- **Fallback**: Click "Refresh Status" button manually

### Cannot Connect After Scanning

- **Check**: Network connection of both phone and server
- **Check**: Bot logs in the terminal/console
- **Try**: Restart the bot server completely
- **Try**: Delete `wa_session` folder and restart

### Password Not Working

- **Check**: Did you change the password in the HTML file?
- **Solution**: Look at line 263 in `public/session-manager.html`
- **Verify**: Make sure you saved the file after changing

### Page Shows "Unable to reach bot server"

- **Check**: Is the bot server running?
- **Check**: Is port 3000 accessible?
- **Try**: Run `npm start` to start the bot
- **Verify**: Check `http://localhost:3000/api/health`

## Mobile Access

To access from mobile devices on the same network:

1. Find your server's local IP (e.g., `192.168.1.100`)
2. Open `http://192.168.1.100:3000/session` on mobile browser
3. Enter password and use normally

## Production Deployment

### Using Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location /session {
        proxy_pass http://localhost:3000/session;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3000/api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

### Docker Deployment

The session manager works automatically with your existing Docker setup:

```bash
# Start with Docker Compose
docker-compose up -d

# Access at
http://your-server-ip:3000/session
```

## Team Guidelines

### Who Should Have Access?

- **DevOps Team** - For deployment and monitoring
- **Support Team** - For troubleshooting customer issues
- **Management** - For oversight (view-only)

### Best Practices

1. **Don't Share Password** - Each team should change default password
2. **Log Actions** - Keep track of who logs out/in
3. **Schedule Maintenance** - Inform users before logging out
4. **Test First** - Try on staging before production logout
5. **Monitor Logs** - Check bot logs after any session changes

### When to Logout?

**Good Reasons:**
- Bot is misbehaving or sending wrong messages
- Need to connect to a different phone number
- Testing new features that require clean state
- Troubleshooting connection issues

**Avoid Logging Out When:**
- Bot is working fine
- During high-traffic hours
- Customer conversations are active
- No clear technical reason

## Support

For technical issues with the session manager:

1. Check bot console logs
2. Check browser console for errors (F12)
3. Verify API endpoints work: `http://localhost:3000/api/health`
4. Review this README
5. Contact dev team with error screenshots

## Version History

- **v1.0** (Current)
  - Initial release
  - Password protection
  - QR code display
  - Auto-refresh
  - Logout functionality

---

**Last Updated:** January 2025
**Maintained By:** Beforest Development Team
