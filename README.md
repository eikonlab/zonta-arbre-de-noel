# Arbre de Noël - Mur de Messages

Plateforme de témoignages sur les violences faites aux femmes avec système de modération.

## Architecture

Le projet est composé de 4 applications :

### 1. Serveur (`/server`)

- **Port** : 3001
- API REST + Socket.IO pour le temps réel
- Gestion des messages avec détection de toxicité (Perspective API)
- Système de tokens temporaires pour contrôler l'accès
- Base de données SQLite pour persistance

### 2. Client Public (`/client`)

- **Port** : 3000 (par défaut)
- Interface publique pour consulter et poster des messages
- Validation par token pour pouvoir poster
- Affichage uniquement des messages non masqués

### 3. Client QR (`/client-qr`)

- **Port** : 3002
- Interface spéciale qui génère un QR code avec le token actuel
- Permet d'accéder rapidement au client public avec un token valide

### 4. Client Admin (`/client-admin`) 🆕

- **Port** : 3003
- **Interface de modération complète**
- Visualisation de tous les messages avec métadonnées
- Masquer/afficher des messages individuellement ou en groupe
- Supprimer des messages
- Filtres et statistiques temps réel

## Démarrage rapide

### 1. Serveur

```bash
cd server
npm install
npm start
```

### 2. Client public

```bash
cd client
npm install
npm start
```

### 3. Client QR

```bash
cd client-qr
npm install
npm start
```

### 4. Client admin (nouveau)

```bash
cd client-admin
npm install
npm start
```

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

## Personnalisation

L'interface admin peut être facilement étendue pour :

- Ajouter des filtres supplémentaires
- Implémenter un système d'authentification administrateur
- Ajouter des rapports et analytics
- Configurer des règles de modération automatique
