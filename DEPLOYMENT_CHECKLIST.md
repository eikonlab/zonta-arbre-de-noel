# 🚀 Production Deployment Checklist

Use this checklist to ensure your PWA works correctly in production.

## ⚠️ CRITICAL: HTTPS is MANDATORY

- [ ] Domain has SSL/TLS certificate installed
- [ ] All traffic redirects from HTTP to HTTPS
- [ ] Certificate is valid and not expired

## 📋 Pre-Deployment

### Server Configuration

- [ ] Update `server/.env` with production values (VAPID keys, etc.)
- [ ] Keep same VAPID keys (don't regenerate!)
- [ ] Update `VAPID_SUBJECT` to production email
- [ ] Add production Perspective API key if using
- [ ] Update CORS in `server/index.js` to allow production domain
- [ ] **Don't set PORT or IP** - hosting platform provides these automatically

### Client Configuration

- [ ] Update `client/.env` with production URLs
- [ ] **IMPORTANT**: Change `VITE_ADMIN_PASSWORD` to strong password
- [ ] Set correct `VITE_SERVER_URL` (your API endpoint)
- [ ] Verify `VITE_VAPID_PUBLIC_KEY` matches server

### Security

- [ ] Strong admin password set (not "zonta2024")
- [ ] `.env` files added to `.gitignore`
- [ ] VAPID private key kept secret
- [ ] CORS configured for specific domains (not `*`)

## 🔨 Build & Deploy

### Build Client

```bash
cd client
npm run build
# Creates dist/ folder
```

### Deploy Server

- [ ] Server deployed to hosting platform
- [ ] Environment variables configured in platform dashboard
- [ ] **Platform sets PORT and IP automatically** - don't override
- [ ] Using process manager if self-hosting (PM2 recommended)
- [ ] CORS updated in code to allow production domain

### Deploy Client

- [ ] `dist/` folder uploaded to web server
- [ ] Web server configured for HTTPS
- [ ] Service worker `/sw.js` accessible from root
- [ ] Manifest `/manifest.json` accessible
- [ ] Icons accessible: `/icon-192.png`, `/icon-512.png`
- [ ] SPA routing configured (all routes → index.html)

## ✅ Post-Deployment Verification

### HTTPS & SSL

- [ ] Visit site shows 🔒 padlock in browser
- [ ] No mixed content warnings in console
- [ ] Certificate is trusted (not self-signed warning)

### PWA Functionality

- [ ] Open DevTools → Application → Service Workers
  - [ ] Service Worker shows as "activated"
  - [ ] No registration errors
- [ ] Open DevTools → Application → Manifest
  - [ ] Manifest loads correctly
  - [ ] Icons display properly
  - [ ] Name and theme color correct

### Authentication

- [ ] Can access `/admin` → redirects to login
- [ ] Can login with credentials
- [ ] "Stay logged in" persists after refresh
- [ ] Logout works correctly

### Push Notifications

- [ ] Click notification button in admin
- [ ] Browser prompts for permission
- [ ] Button shows "activated" after enabling
- [ ] Post test message with toxic content
- [ ] Notification appears in browser
- [ ] Clicking notification opens admin page

### PWA Installation

- [ ] Install icon appears in address bar (Chrome/Edge)
- [ ] Can install app to desktop/home screen
- [ ] Installed app opens in standalone mode
- [ ] App icon displays correctly

### Offline Support

- [ ] Disconnect internet
- [ ] Reload page - basic pages still work
- [ ] Service worker serves cached content

### API Connectivity

- [ ] Admin page loads messages from server
- [ ] WebSocket connection works (real-time updates)
- [ ] Can create/update/delete messages
- [ ] No CORS errors in console

## 🐛 Troubleshooting

### Service Worker Not Working

```bash
# Check these in browser DevTools → Console
- "Service Worker registered" message appears
- No HTTPS warnings
- No 404 for /sw.js
```

### Push Notifications Failing

```bash
# Check these
- VAPID keys match client/server
- HTTPS is enabled
- Notification permission granted
- No errors in server logs when posting message
```

### PWA Not Installable

```bash
# Requirements for installability
- Served over HTTPS ✓
- Has web manifest with name/icons ✓
- Has service worker ✓
- Icons 192x192 and 512x512 accessible ✓
```

### Login Not Working

```bash
# Verify
- Check client .env has correct credentials
- Clear browser localStorage: localStorage.clear()
- Check browser console for errors
```

## 📊 Monitoring

### Server Logs

```bash
# If using PM2
pm2 logs zonta-server

# Check for:
- "Service Worker registered" from clients
- "New push subscription" when enabling notifications
- No errors when sending notifications
```

### Browser Console

Open DevTools → Console, check for:

- [ ] No HTTPS/mixed content errors
- [ ] No CORS errors
- [ ] Service Worker registration success
- [ ] WebSocket connection success

## 🔄 Updates & Maintenance

### Updating the App

1. Make code changes
2. Increment cache version in `sw.js`: `CACHE_NAME = 'zonta-admin-v2'`
3. Build: `npm run build`
4. Deploy new `dist/` folder
5. Service worker will auto-update on next visit

### Updating VAPID Keys (Avoid if Possible)

⚠️ This will break existing subscriptions!

1. Generate new keys: `npx web-push generate-vapid-keys`
2. Update server `.env`
3. Update client `.env`
4. Rebuild and redeploy
5. All users must re-enable notifications

### Certificate Renewal

```bash
# Let's Encrypt auto-renews
# Test renewal
sudo certbot renew --dry-run

# Manual renewal if needed
sudo certbot renew
```

## 📞 Support Contacts

- **Server Issues**: Check PM2 logs, Nginx error logs
- **Client Issues**: Browser console, Network tab
- **SSL Issues**: Check certificate expiry, renewal cron
- **Push Issues**: Verify VAPID keys, check server logs

---

## Quick Reference

**Default Credentials**: admin / [your-password]
**Server Port**: 8102
**VAPID Keys**: In server/.env (keep private key secret!)
**Service Worker**: Must be served from root path `/sw.js`
**HTTPS**: Absolutely required for PWA features

**Test Sites**:

- PWA Features: https://www.pwabuilder.com/
- Manifest Validator: https://manifest-validator.appspot.com/
- SSL Test: https://www.ssllabs.com/ssltest/
