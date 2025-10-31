# Mur de Messages - Client Unifié

Ce dossier contient les trois applications client fusionnées en une seule structure.

## Structure

- **Public App** - Interface publique pour afficher et créer des messages
- **Admin App** - Interface d'administration pour modérer les messages
- **QR App** - Interface pour générer des QR codes d'accès

## Lancement en développement

### Application Publique (par défaut)

```bash
npm start
# ou
npm run start:public
```

Accessible sur : http://localhost:5173

### Application Admin

```bash
npm run start:admin
```

Accessible sur : http://localhost:5174

### Application QR

```bash
npm run start:qr
```

Accessible sur : http://localhost:5175

## Build pour production

### Build Public

```bash
npm run build
# ou
npm run build:public
```

Sortie dans : `dist/`

### Build Admin

```bash
npm run build:admin
```

Sortie dans : `dist-admin/`

### Build QR

```bash
npm run build:qr
```

Sortie dans : `dist-qr/`

## Structure des fichiers

```
client/
├── index.html              # Point d'entrée HTML
├── package.json            # Dépendances et scripts
├── vite.config.mjs         # Configuration Vite
└── src/
    ├── App.vue             # Composant principal qui route vers les apps
    ├── main.js             # Point d'entrée JavaScript
    ├── apps/
    │   ├── AppPublic.vue   # Application publique
    │   ├── AppAdmin.vue    # Application admin
    │   └── AppQR.vue       # Application QR
    ├── router/             # Router Vue (uniquement pour public)
    ├── views/              # Vues de l'app publique
    └── svg/                # Assets SVG
```

## Variables d'environnement

L'application utilise la variable `VITE_APP_MODE` pour déterminer quelle application charger :

- `public` (défaut) - Application publique
- `admin` - Application admin
- `qr` - Application QR code

## Dépendances

- **Vue 3** - Framework
- **Vue Router** - Routing (app publique)
- **Axios** - Requêtes HTTP
- **Socket.io-client** - Communication temps réel
- **qrcode** - Génération de QR codes (app QR)
- **Vite** - Build tool
