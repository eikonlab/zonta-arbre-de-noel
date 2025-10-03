# Client Admin - Interface de Modération

Interface d'administration pour modérer les messages du mur de témoignages.

## Fonctionnalités

- **Visualisation complète** : Affiche tous les messages avec leurs métadonnées (auteur, date, ID, toxicité, signalements)
- **Modération individuelle** : Checkbox pour masquer/afficher chaque message
- **Actions groupées** : Boutons pour masquer ou afficher tous les messages d'un coup
- **Filtres** : Options pour afficher/masquer les messages visibles, cachés ou signalés
- **Suppression** : Possibilité de supprimer définitivement un message
- **Temps réel** : Mise à jour automatique quand de nouveaux messages arrivent
- **Statistiques** : Vue d'ensemble du nombre de messages total, visibles, masqués et signalés

## Démarrage

```bash
cd client-admin
npm install
npm start
```

L'interface sera accessible sur http://localhost:3003

## Interface

### En-tête

- Titre et statistiques en temps réel
- 4 cartes avec les compteurs : Total, Visibles, Masqués, Signalés

### Contrôles

- **Filtres** : Checkboxes pour contrôler quels types de messages afficher
- **Actions groupées** :
  - 🔄 Actualiser : Recharge les messages
  - 👁️ Tout afficher : Rend tous les messages visibles
  - 🙈 Tout masquer : Masque tous les messages

### Messages

Chaque message affiche :

- **Métadonnées** : Auteur, date/heure, ID unique
- **Status** : Badges pour les signalements (toxic, hors-sujet) et score de toxicité
- **Contenu** : Texte complet du message
- **Actions** :
  - Checkbox pour masquer/afficher individuellement
  - Bouton supprimer

### Codes couleur

- **Bleu** : Messages normaux
- **Jaune** : Messages signalés (hors-sujet)
- **Rouge** : Messages toxiques
- **Gris** : Messages masqués (opacity réduite)

## API utilisée

L'interface communique avec le serveur via :

- `GET /messages` : Récupérer tous les messages
- `PATCH /messages/:id` : Mettre à jour le status hidden d'un message
- `DELETE /messages/:id` : Supprimer un message
- `PATCH /messages/bulk` : Action groupée sur plusieurs messages
- Socket.IO pour les mises à jour temps réel

## Responsive

L'interface s'adapte automatiquement aux écrans mobiles avec :

- Réorganisation des éléments en colonne
- Taille de police adaptée
- Espacement optimisé pour le tactile
