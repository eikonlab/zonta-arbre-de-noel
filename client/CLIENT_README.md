# Unified Client Application

This unified client application can run in three different modes:

## Modes

### Public Mode (Default)

The main public-facing message wall application.

- **Port**: 3000
- **Features**: Message display, routing to different message views
- **Dependencies**: Vue, Vue Router, Socket.io, Axios

### Admin Mode

Administrative interface for message moderation.

- **Port**: 3001
- **Features**: Message moderation, statistics, bulk actions
- **Dependencies**: Vue, Socket.io, Axios

### QR Mode

QR code generator for access to the public application.

- **Port**: 3002
- **Features**: QR code generation, token management
- **Dependencies**: Vue, QRCode, Axios

## Running the Application

### Development

```bash
# Public mode (default)
npm start
# or
npm run start:public

# Admin mode
npm run start:admin

# QR mode
npm run start:qr
```

### Production Build

```bash
# Public mode (default)
npm run build
# or
npm run build:public

# Admin mode
npm run build:admin

# QR mode
npm run build:qr
```

## URL Parameters

You can also switch modes using URL parameters:

- Public: `http://localhost:3000` or `http://localhost:3000?mode=public`
- Admin: `http://localhost:3000?mode=admin`
- QR: `http://localhost:3000?mode=qr`

## Environment Variables

Set `VITE_APP_MODE` to control the default mode:

```bash
VITE_APP_MODE=admin npm start
```

## File Structure

```
src/
├── App.vue (main router between modes)
├── main.js (application entry point)
├── apps/
│   ├── AppPublic.vue (public message wall)
│   ├── AppAdmin.vue (admin interface)
│   └── AppQR.vue (QR code generator)
├── router/ (used by public mode)
├── views/ (public mode views)
└── svg/ (assets)
```
