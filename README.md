# Arbre de Noël - Zonta

Plateforme de témoignages sur les violences faites aux femmes avec système de modération.

## Architecture

Le projet est composé de 2 applications principales :

### 1. Serveur (`/server`)

- **Port** : 3001
- API REST + Socket.IO pour le temps réel
- Gestion des messages avec détection de toxicité (Perspective API)
- Système de tokens temporaires pour contrôler l'accès
- Base de données SQLite pour persistance

### 2. Client (`/client`) - Application unifiée

Le client contient maintenant 3 modes d'exécution dans une seule structure :

#### Mode Public (défaut)

- **Port** : 5173
- Interface publique pour consulter et poster des messages
- Validation par token pour pouvoir poster
- Affichage uniquement des messages non masqués
- **Commande** : `npm start` ou `npm run start:public`

#### Mode Admin

- **Port** : 5174
- Interface de modération complète
- Visualisation de tous les messages avec métadonnées
- Masquer/afficher des messages individuellement ou en groupe
- Supprimer des messages
- Filtres et statistiques temps réel
- **Commande** : `npm run start:admin`

#### Mode QR

- **Port** : 5175
- Interface spéciale qui génère un QR code avec le token actuel
- Permet d'accéder rapidement au client public avec un token valide
- **Commande** : `npm run start:qr`

## Démarrage rapide

### 1. Serveur

```bash
cd server
npm install
npm start
```

### 2. Client - Configuration

Avant de démarrer le client, créez un fichier `.env` dans le dossier `/client` :

```bash
cd client
cp .env.example .env
```

Modifiez le fichier `.env` pour configurer l'URL du serveur :

```env
VITE_SERVER_URL=http://localhost:3001
```

### 3. Client - Mode Public (par défaut)

```bash
cd client
npm install
npm start
```

### 4. Client - Mode Admin

```bash
cd client
npm run start:admin
```

### 5. Client - Mode QR

```bash
cd client
npm run start:qr
```

> **Note** : Les anciens dossiers `client-admin` et `client-qr` peuvent être supprimés car tout est maintenant unifié dans `/client`.

## Workflow de modération

1. **Messages publics** : Les utilisateurs postent via le client public (avec token valide)
2. **Détection automatique** : Le serveur détecte automatiquement les contenus toxiques/hors-sujet
3. **Modération** : Les administrateurs utilisent le client admin pour :
   - Consulter tous les messages avec leurs scores de toxicité
   - Masquer les messages inappropriés (ils disparaissent du client public)
   - Supprimer définitivement les messages si nécessaire
   - Effectuer des actions groupées
4. **Temps réel** : Toutes les modifications sont propagées instantanément

## Fonctionnalités du Client Admin

### Vue d'ensemble

- **Statistiques temps réel** : Nombre total, visibles, masqués, signalés
- **Filtres** : Afficher/masquer selon le type de messages
- **Actions groupées** : Masquer ou afficher tous les messages

### Gestion des messages

- **Métadonnées complètes** : Auteur, date, ID, score toxicité
- **Badges visuels** : Signalement automatique (toxique, hors-sujet)
- **Modération individuelle** : Checkbox pour masquer/afficher
- **Suppression** : Bouton pour supprimer définitivement

### Interface responsive

- Adaptation automatique mobile/desktop
- Codes couleur pour identification rapide des problèmes
- Mise à jour temps réel via Socket.IO

## Sécurité et accès

- **Client public** : Accès contrôlé par tokens temporaires (1 minute)
- **Client QR** : Génère les tokens d'accès
- **Client admin** : Accès libre (à sécuriser selon les besoins)
- **Serveur** : Validation côté serveur des tokens et données

## Structure du projet

```
arbre-de-noel/
├── server/                 # Backend Node.js
│   ├── index.js
│   ├── models/
│   └── messages.db
├── client/                 # Frontend unifié (3 modes)
│   ├── src/
│   │   ├── apps/
│   │   │   ├── AppPublic.vue   # Mode public
│   │   │   ├── AppAdmin.vue    # Mode admin
│   │   │   └── AppQR.vue       # Mode QR
│   │   ├── App.vue        # Router principal
│   │   ├── main.js
│   │   ├── router/        # Router Vue (mode public)
│   │   └── views/         # Vues du mode public
│   └── package.json
├── client-admin/          # [OBSOLÈTE - à supprimer]
└── client-qr/             # [OBSOLÈTE - à supprimer]
```

## Personnalisation

L'interface admin peut être facilement étendue pour :

- Ajouter des filtres supplémentaires
- Implémenter un système d'authentification administrateur
- Ajouter des rapports et analytics
- Configurer des règles de modération automatique
