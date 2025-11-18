# PWA Admin Setup Guide

This guide explains how to set up the Progressive Web App (PWA) features for the Zonta admin interface, including authentication and push notifications.

## Features Implemented

1. **Authentication System**

   - Single shared login/password from environment variables
   - "Stay logged in" option (30 days vs 24 hours)
   - Protected admin route with automatic redirect to login

2. **Push Notifications**
   - Desktop and mobile support
   - Notifications for flagged messages (toxic or off-topic)
   - Service Worker for offline support
   - PWA installable on mobile and desktop

## Setup Instructions

### 1. Generate VAPID Keys

VAPID keys are required for web push notifications. Generate them using:

```bash
cd server
npx web-push generate-vapid-keys
```

This will output something like:

```
Public Key: BN...
Private Key: AA...
```

### 2. Configure Server Environment

Copy the example file and edit it:

```bash
cd server
cp .env.example .env
```

Edit `.env` and add:

- Your Perspective API key (if using)
- The VAPID keys generated above
- Your email for VAPID subject

Example `.env`:

```env
PORT=8102
IP=::
TOKEN_EXPIRY_MS=120000
GOOGLE_API_KEY=your-perspective-api-key-here
VAPID_PUBLIC_KEY=BN...your-public-key...
VAPID_PRIVATE_KEY=AA...your-private-key...
VAPID_SUBJECT=mailto:your-email@example.com
```

### 3. Configure Client Environment

Copy the example file and edit it:

```bash
cd client
cp .env.example .env
```

Edit `.env` and set:

- Admin login credentials (used for authentication)
- Server URL (if different from default)

Example `.env`:

```env
VITE_SERVER_URL=http://localhost:8102
VITE_ADMIN_LOGIN=admin
VITE_ADMIN_PASSWORD=your-secure-password-here
```

**Note:** The VAPID public key is automatically fetched from the server, so you don't need to set it in the client .env.

### 4. Install Dependencies

```bash
# Server
cd server
npm install

# Client
cd ../client
npm install
```

### 5. Create App Icons (Optional)

Replace the placeholder SVG icons with actual PNG images:

1. Create a 192x192px icon: `client/public/icon-192.png`
2. Create a 512x512px icon: `client/public/icon-512.png`

You can use online tools to generate PWA icons from your logo.

### 6. Start the Application

```bash
# Terminal 1 - Start server
cd server
npm start

# Terminal 2 - Start client
cd client
npm run start
```

## Usage

### Login

1. Navigate to `/admin` - you'll be redirected to `/admin/login`
2. Enter the credentials from your `.env` file
3. Check "Rester connecté" to stay logged in for 30 days
4. Click "Se connecter"

### Enable Push Notifications

1. Once logged in, click "🔔 Activer les notifications" in the header
2. Grant notification permission when prompted
3. The button will change to "✅ Notifications activées"
4. You'll now receive notifications when messages are flagged as toxic or off-topic

### Testing Push Notifications

To test push notifications:

1. Make sure you're subscribed to notifications in the admin panel
2. Post a test message with toxic or off-topic content
3. You should receive a browser notification immediately

Example test messages:

- Toxic: "N\*\*e la police" (will trigger toxic flag)
- Off-topic: "Allez Fribourg-Gottéron" (will trigger off-topic flag)

### Install PWA

#### Desktop (Chrome/Edge):

1. Visit `/admin` in your browser
2. Click the install icon in the address bar (⊕)
3. Click "Install" in the dialog

#### Mobile:

1. Visit `/admin` in Safari (iOS) or Chrome (Android)
2. Tap the Share button
3. Select "Add to Home Screen"

## Security Notes

1. **HTTPS Required for Production**: Push notifications and service workers require HTTPS in production
2. **Secure Passwords**: Use strong, unique passwords in production
3. **Environment Variables**: Never commit `.env` files to version control
4. **Token Storage**: Authentication tokens are stored in localStorage with expiration

## Troubleshooting

### Notifications Not Working

1. Check browser console for errors
2. Verify VAPID keys are set correctly in server `.env`
3. Ensure you've granted notification permission
4. Service worker must be registered (check in DevTools > Application > Service Workers)

### Can't Login

1. Verify credentials in client `.env` match what you're entering
2. Check browser console for errors
3. Clear localStorage and try again: `localStorage.clear()`

### Service Worker Not Registering

1. Make sure you're accessing via HTTP/HTTPS (not file://)
2. Check browser console for registration errors
3. Clear browser cache and reload
4. Unregister old service workers in DevTools

### Push Notifications Not Received

1. Check that the server has VAPID keys configured
2. Verify subscription in browser DevTools > Application > Service Workers
3. Check server logs for push notification errors
4. Test with browser DevTools > Application > Service Workers > Push event

## 🚀 Production Deployment - CRITICAL REQUIREMENTS

### ⚠️ HTTPS is MANDATORY

**Service Workers and Push Notifications ONLY work with HTTPS (or localhost)**

This is a browser security requirement - you MUST have SSL/TLS certificates.

### Server Deployment Checklist

#### 1. Environment Variables

Update `server/.env` for production:

```env
PORT=8102
IP=0.0.0.0                    # Listen on all interfaces

# Keep your VAPID keys (DO NOT regenerate - existing subscriptions will break)
VAPID_PUBLIC_KEY=BBP6vW24ag3t6CJKrDyndizIC7BGL_kMJNyXedXZ8eRN-cYs24AAugo_QMkEQnj4hs5-NRs0Uc9Xz8E6P15HYYM
VAPID_PRIVATE_KEY=XcYuOaveTju8UjudoVaJvxdogm2cRlu_2RGZyIE3q9E
VAPID_SUBJECT=mailto:your-production-email@zonta.org

# Perspective API
GOOGLE_API_KEY=your-actual-api-key
```

#### 2. CORS Configuration

Update server `index.js` to allow your production domain:

```javascript
app.use(
  cors({
    origin: ["https://your-domain.com", "https://admin.your-domain.com"],
    credentials: true,
  })
);
```

#### 3. Process Manager

Use PM2 to keep server running:

```bash
npm install -g pm2
cd server
pm2 start index.js --name zonta-server
pm2 save
pm2 startup  # Follow instructions to enable auto-start
```

### Client Deployment Checklist

#### 1. Update Environment Variables

Create production `.env` in `client/`:

```env
VITE_SERVER_URL=https://api.your-domain.com    # Your production API URL
VITE_CLIENT_URL=https://your-domain.com        # Your production URL
VITE_ADMIN_LOGIN=admin
VITE_ADMIN_PASSWORD=your-strong-password-here   # CHANGE THIS!
VITE_VAPID_PUBLIC_KEY=BBP6vW24ag3t6CJKrDyndizIC7BGL_kMJNyXedXZ8eRN-cYs24AAugo_QMkEQnj4hs5-NRs0Uc9Xz8E6P15HYYM
```

#### 2. Build for Production

```bash
cd client
npm run build
```

This creates a `dist/` folder with optimized files.

#### 3. Serve Static Files with HTTPS

The `dist/` folder must be served over HTTPS. Options:

**Option A: Nginx (Recommended)**

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    root /path/to/client/dist;
    index index.html;

    # Handle Vue Router (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Service worker and manifest must be served with correct MIME types
    location = /sw.js {
        add_header Cache-Control "no-cache";
        add_header Service-Worker-Allowed "/";
    }

    location = /manifest.json {
        add_header Content-Type application/manifest+json;
    }

    # Proxy API requests to backend
    location /api {
        proxy_pass http://localhost:8102;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Option B: Apache with HTTPS**

```apache
<VirtualHost *:443>
    ServerName your-domain.com
    DocumentRoot /path/to/client/dist

    SSLEngine on
    SSLCertificateFile /path/to/cert.pem
    SSLCertificateKeyFile /path/to/key.pem

    <Directory /path/to/client/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted

        # Vue Router support
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>

    # Proxy to API
    ProxyPass /api http://localhost:8102/api
    ProxyPassReverse /api http://localhost:8102/api
</VirtualHost>
```

**Option C: Node.js Static Server with HTTPS**

```javascript
// serve.js
const express = require("express");
const https = require("https");
const fs = require("fs");
const path = require("path");

const app = express();
const distPath = path.join(__dirname, "dist");

app.use(express.static(distPath));
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

const options = {
  key: fs.readFileSync("/path/to/privkey.pem"),
  cert: fs.readFileSync("/path/to/fullchain.pem"),
};

https.createServer(options, app).listen(443, () => {
  console.log("HTTPS Server running on port 443");
});
```

### SSL/TLS Certificate Setup

#### Option 1: Let's Encrypt (Free, Recommended)

```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Get certificate (for Nginx)
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal is configured automatically
# Test renewal:
sudo certbot renew --dry-run
```

#### Option 2: Cloudflare (Free SSL + CDN)

1. Point your domain to Cloudflare nameservers
2. Enable "Full (strict)" SSL mode in Cloudflare dashboard
3. Cloudflare handles SSL automatically

#### Option 3: Your Hosting Provider

Most providers (Vercel, Netlify, Railway, etc.) provide automatic HTTPS

### Critical Service Worker Configuration

#### Update Service Worker for Production

In `client/public/sw.js`, you may want to update the cache strategy:

```javascript
const CACHE_NAME = "zonta-admin-v1";
const urlsToCache = [
  "/admin",
  "/assets/",
  // Add other critical assets
];
```

#### Verify Service Worker Scope

The service worker must be served from the root or higher than `/admin`:

- ✅ Served from `/sw.js` - controls all paths
- ❌ Served from `/admin/sw.js` - only controls `/admin/*`

### Testing Production Build Locally

Before deploying, test the production build locally with HTTPS:

```bash
# Build
cd client
npm run build

# Serve with HTTPS using a simple server
npx http-server dist -p 8080 --ssl --cert /path/to/cert.pem --key /path/to/key.pem

# Or use vite preview (no HTTPS by default)
npm run serve
```

### Post-Deployment Verification

1. **Check HTTPS**: Visit your site - should show 🔒 in address bar
2. **Service Worker**: DevTools → Application → Service Workers (should show "activated")
3. **Manifest**: DevTools → Application → Manifest (should show icon and details)
4. **Push Subscription**: Try enabling notifications in admin panel
5. **Install Prompt**: Should see install icon in address bar
6. **Offline**: Disconnect internet, reload - basic pages should still work

### Common Production Issues

#### Issue: Service Worker Not Registering

**Solution**: Ensure served over HTTPS and path is `/sw.js` from root

#### Issue: Push Notifications Not Working

**Solutions**:

- Verify VAPID keys match between client and server
- Check HTTPS is enabled
- Verify notification permissions granted
- Check browser console for errors

#### Issue: PWA Not Installable

**Solutions**:

- Ensure HTTPS is enabled
- Verify `manifest.json` is accessible
- Check icons (192x192 and 512x512) are accessible
- Ensure service worker is registered

#### Issue: CORS Errors

**Solution**: Update server CORS to include production domain:

```javascript
app.use(
  cors({
    origin: "https://your-domain.com",
    credentials: true,
  })
);
```

### Security Recommendations for Production

1. **Change Default Password**: Update `VITE_ADMIN_PASSWORD` in `.env`
2. **Use Strong VAPID Subject**: Use real email in `VAPID_SUBJECT`
3. **Rate Limiting**: Add rate limiting to prevent abuse
4. **Server-Side Auth**: Consider implementing JWT-based authentication
5. **Database for Subscriptions**: Store push subscriptions in database (currently in memory)
6. **Environment Variables**: Never commit `.env` files to git
7. **HTTPS Only**: Redirect all HTTP traffic to HTTPS

### Deployment Platform Examples

#### Vercel/Netlify (Client Only)

```bash
# Install CLI
npm install -g vercel  # or netlify-cli

# Deploy
cd client
vercel  # Follow prompts, automatic HTTPS
```

#### Railway/Render (Full Stack)

1. Connect GitHub repository
2. Add environment variables in dashboard
3. Configure build command: `npm install && npm run build`
4. Configure start command: `npm start`
5. Automatic HTTPS provided

#### VPS (DigitalOcean, Linode, etc.)

1. Set up server with Ubuntu/Debian
2. Install Node.js, Nginx, Certbot
3. Configure Nginx as reverse proxy
4. Get SSL cert with Let's Encrypt
5. Use PM2 for process management

## API Endpoints

### Push Notification Endpoints

- `POST /push/subscribe` - Subscribe to push notifications
- `POST /push/unsubscribe` - Unsubscribe from push notifications
- `GET /push/vapid-public-key` - Get VAPID public key

### Authentication

Authentication is handled client-side by comparing credentials with environment variables. In production, consider implementing server-side authentication with JWT tokens.

## File Structure

```
client/
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service worker
│   ├── icon-192.png          # App icon (192x192)
│   └── icon-512.png          # App icon (512x512)
├── src/
│   ├── composables/
│   │   ├── useAuth.js        # Authentication logic
│   │   └── usePushNotifications.js  # Push notification logic
│   ├── views/
│   │   └── AdminLogin.vue    # Login page
│   └── apps/
│       └── AppAdmin.vue      # Admin interface (updated)

server/
├── index.js                   # Updated with push endpoints
└── .env                       # Server configuration
```

## Browser Compatibility

- **Service Workers**: Chrome, Firefox, Safari, Edge (all modern versions)
- **Push Notifications**: Chrome, Firefox, Edge (Safari 16.4+)
- **PWA Install**: Chrome, Edge, Safari (iOS 14.3+)

## Resources

- [Web Push Protocol](https://developers.google.com/web/fundamentals/push-notifications/)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [PWA Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [VAPID Keys](https://blog.mozilla.org/services/2016/08/23/sending-vapid-identified-webpush-notifications-via-mozillas-push-service/)
