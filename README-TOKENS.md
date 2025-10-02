# Configuration de l'Arbre de Noël - Système de Tokens

## Vue d'ensemble

Ce système implémente un accès sécurisé au mur de messages via des tokens qui changent toutes les minutes. Il comprend :

1. **Serveur** - Génère et valide les tokens
2. **Client principal** - Le mur de messages (nécessite un token valide)
3. **Client QR** - Affiche le QR code avec l'URL et le token valide

## Configuration des ports

- **Serveur** : http://localhost:3001
- **Client principal** : http://localhost:5173
- **Client QR** : http://localhost:5174

## Installation et démarrage

### 1. Serveur

```bash
cd server
npm install
npm start
```

### 2. Client principal

```bash
cd client
npm install
npm run dev
```

### 3. Client QR

```bash
cd qr-client
npm install
npm run dev
```

## Utilisation

1. **Démarrez tous les services** dans l'ordre ci-dessus
2. **Accédez au client QR** : http://localhost:5174
3. **Scannez le QR code** ou copiez l'URL affichée
4. **Accédez au mur de messages** avec l'URL contenant le token valide

## Sécurité

- Les tokens changent automatiquement toutes les minutes
- Sans token valide, le formulaire de messages n'est pas accessible
- Le client QR se met à jour automatiquement avec le nouveau token
- La validation du token se fait côté serveur

## URLs d'exemple

- Client QR : http://localhost:5174
- Client avec token : http://localhost:5173?token=abc123def456...
- API validation : http://localhost:3001/api/validate-token/abc123def456...
- API token actuel : http://localhost:3001/api/current-token

## Personnalisation

Pour changer les ports ou l'URL du client, modifiez :

- `qr-client/App.vue` : ligne `const CLIENT_URL`
- `qr-client/vite.config.mjs` : port du client QR
- `client/vite.config.js` : port du client principal (si différent de 5173)
