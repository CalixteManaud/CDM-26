# 📡 Système de Webhooks CAN 26

Le système de webhooks permet aux utilisateurs de recevoir des notifications en temps réel sur les événements importants du tournoi.

## 🎯 Types d'Événements

Le système supporte 5 types d'événements :

### 1. `MATCH_STARTED` 🟢
Déclenché quand un match passe au statut `LIVE`.

**Payload :**
```json
{
  "event": "MATCH_STARTED",
  "timestamp": "2025-12-31T10:00:00.000Z",
  "data": {
    "matchId": "uuid",
    "tournamentId": "uuid",
    "homeTeam": {
      "id": "uuid",
      "name": "Équipe A"
    },
    "awayTeam": {
      "id": "uuid",
      "name": "Équipe B"
    },
    "matchDate": "2025-12-31T15:00:00.000Z",
    "stage": "GROUP"
  }
}
```

### 2. `MATCH_FINISHED` 🏁
Déclenché quand un match est terminé.

**Payload :**
```json
{
  "event": "MATCH_FINISHED",
  "timestamp": "2025-12-31T12:00:00.000Z",
  "data": {
    "matchId": "uuid",
    "tournamentId": "uuid",
    "homeTeam": {
      "id": "uuid",
      "name": "Équipe A"
    },
    "awayTeam": {
      "id": "uuid",
      "name": "Équipe B"
    },
    "score": {
      "home": 3,
      "away": 2
    },
    "winnerId": "uuid",
    "stage": "GROUP"
  }
}
```

### 3. `SCORE_UPDATED` ⚽
Déclenché quand le score d'un match est mis à jour.

**Payload :**
```json
{
  "event": "SCORE_UPDATED",
  "timestamp": "2025-12-31T12:00:00.000Z",
  "data": {
    "matchId": "uuid",
    "tournamentId": "uuid",
    "homeTeam": {
      "id": "uuid",
      "name": "Équipe A"
    },
    "awayTeam": {
      "id": "uuid",
      "name": "Équipe B"
    },
    "score": {
      "home": 3,
      "away": 2
    }
  }
}
```

### 4. `STANDINGS_UPDATED` 📊
Déclenché quand le classement d'une poule est mis à jour.

**Payload :**
```json
{
  "event": "STANDINGS_UPDATED",
  "timestamp": "2025-12-31T12:00:00.000Z",
  "data": {
    "tournamentId": "uuid",
    "groupId": "uuid",
    "standings": [
      {
        "position": 1,
        "teamId": "uuid",
        "teamName": "Équipe A",
        "played": 3,
        "won": 2,
        "drawn": 1,
        "lost": 0,
        "goalsFor": 8,
        "goalsAgainst": 3,
        "points": 7
      }
    ]
  }
}
```

### 5. `BRACKET_UPDATED` 🏆
Déclenché quand le bracket de knockout est mis à jour (progression).

**Payload :**
```json
{
  "event": "BRACKET_UPDATED",
  "timestamp": "2025-12-31T12:00:00.000Z",
  "data": {
    "tournamentId": "uuid",
    "stage": "QUARTER_FINAL",
    "message": "Progression automatique vers les demi-finales"
  }
}
```

## 🔐 Sécurité

Les webhooks peuvent être sécurisés avec un secret. Chaque requête inclura un header `X-Webhook-Signature` contenant une signature HMAC-SHA256 du payload.

**Vérification de la signature (Node.js) :**
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return signature === expectedSignature;
}

// Dans votre endpoint webhook
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const isValid = verifyWebhookSignature(req.body, signature, 'votre-secret');

  if (!isValid) {
    return res.status(401).json({ error: 'Signature invalide' });
  }

  // Traiter l'événement
  console.log('Événement reçu:', req.body.event);
  res.status(200).json({ received: true });
});
```

## 📝 API Endpoints

### Créer un Webhook
```http
POST /api/webhooks
Content-Type: application/json
Authorization: Bearer <clerk-token>

{
  "name": "Mon Webhook Discord",
  "url": "https://discord.com/api/webhooks/...",
  "secret": "mon-secret-optionnel",
  "events": ["MATCH_STARTED", "MATCH_FINISHED"],
  "tournamentId": "uuid" // Optionnel - filtre par tournoi
}
```

### Lister mes Webhooks
```http
GET /api/webhooks
Authorization: Bearer <clerk-token>
```

### Modifier un Webhook
```http
PUT /api/webhooks/:id
Content-Type: application/json
Authorization: Bearer <clerk-token>

{
  "isActive": false,
  "events": ["MATCH_FINISHED"]
}
```

### Supprimer un Webhook
```http
DELETE /api/webhooks/:id
Authorization: Bearer <clerk-token>
```

## 🎮 Exemples d'Utilisation

### Discord Bot
```javascript
// Webhook pour Discord
{
  "name": "Discord CAN 26",
  "url": "https://discord.com/api/webhooks/xxxxx/yyyyy",
  "events": ["MATCH_STARTED", "MATCH_FINISHED", "STANDINGS_UPDATED"]
}
```

### Notifications Slack
```javascript
// Webhook pour Slack
{
  "name": "Slack Notifications",
  "url": "https://hooks.slack.com/services/T00/B00/XXX",
  "events": ["MATCH_STARTED", "BRACKET_UPDATED"]
}
```

### Intégration Custom
```javascript
// Serveur Node.js personnalisé
{
  "name": "API Backend",
  "url": "https://mon-api.com/webhooks/can26",
  "secret": "super-secret-key",
  "events": ["MATCH_FINISHED", "STANDINGS_UPDATED"],
  "tournamentId": "specific-tournament-id"
}
```

## 🔍 Filtres Disponibles

Les webhooks peuvent être filtrés par :
- **Tournoi** : Ne déclenche que pour un tournoi spécifique
- **Équipe** : Ne déclenche que pour une équipe spécifique (à venir)
- **Événements** : Choisir quels types d'événements écouter

## 📊 Statistiques

Chaque webhook stocke :
- `lastTriggeredAt` : Dernier déclenchement
- `triggerCount` : Nombre total de déclenchements
- `failureCount` : Nombre d'échecs

## ⚡ Performance

- **Timeout** : 10 secondes par webhook
- **Exécution** : Asynchrone (ne bloque pas l'API principale)
- **Parallélisation** : Tous les webhooks sont déclenchés en parallèle
- **Retry** : Pas de retry automatique (à implémenter si nécessaire)

## 🚨 Gestion des Erreurs

Les webhooks qui échouent n'empêchent pas le traitement des autres événements. Les erreurs sont loggées mais ne bloquent pas l'application.

## 📌 Notes Importantes

1. Les webhooks sont déclenchés de manière **asynchrone**
2. Un webhook peut recevoir plusieurs événements si plusieurs sont sélectionnés
3. La signature HMAC est **optionnelle** mais **fortement recommandée**
4. Les URLs doivent être accessibles publiquement
5. Le timeout est de 10 secondes maximum

## 🔮 Évolutions Futures

- [ ] Retry automatique en cas d'échec
- [ ] Filtrage par équipe
- [ ] Webhooks pour les événements joueurs
- [ ] Rate limiting par webhook
- [ ] Interface UI pour gérer les webhooks
