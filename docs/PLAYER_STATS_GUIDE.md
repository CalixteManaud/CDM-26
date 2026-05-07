# Système de Statistiques Joueurs - Guide Complet

## Vue d'ensemble

Système complet de saisie des statistiques individuelles des joueurs lors de la soumission d'un résultat de match.

## 🔐 Permissions

### Qui peut saisir les stats ?

✅ **Admin** - Peut modifier tous les matchs
✅ **Coach Domicile** - Peut modifier les matchs de son équipe
✅ **Coach Extérieur** - Peut modifier les matchs de son équipe
❌ **PARTICIPANT** - Ne peut pas modifier
❌ **GUEST** - Ne peut pas modifier

### Comment ça fonctionne ?

Le système vérifie automatiquement :
```typescript
const isHomeCoach = match.homeTeam.coachUser.clerkId === user.id;
const isAwayCoach = match.awayTeam.coachUser.clerkId === user.id;
const canEditMatch = isAdmin || isHomeCoach || isAwayCoach;
```

Si l'utilisateur est coach, un badge s'affiche indiquant son équipe :
- _(Coach - Nom de l'équipe)_

## 📝 Saisie des Statistiques

### Étape 1 : Entrer les Scores

Avant de pouvoir saisir les stats joueurs, il faut **obligatoirement** entrer les scores :
- Score équipe domicile
- Score équipe extérieure

### Étape 2 : Saisir les Stats Joueurs (Optionnel)

Une fois les scores saisis, une section "Statistiques des Joueurs" apparaît avec :

#### Pour chaque joueur :
1. **Sélection du joueur** - Menu déroulant avec :
   - Numéro de maillot
   - Nom du joueur
   - Équipe
   - Position

2. **Statistiques** :
   - **Buts** - Nombre de buts marqués (min: 0)
   - **Passes** - Passes décisives (min: 0)
   - **Cartons J** - Cartons jaunes (min: 0, max: 2)
   - **Cartons R** - Cartons rouges (min: 0, max: 1)

#### Boutons d'action :
- ➕ **Ajouter un joueur** - Ajoute une nouvelle ligne de stats
- 🗑️ **Supprimer** - Retire une ligne de stats

## ✅ Validation Automatique

### 1. Validation en Temps Réel

Un panneau de validation s'affiche en haut du formulaire montrant :
```
[Équipe Domicile]        [Équipe Extérieure]
Buts saisis: 2 / 2 ✅    Buts saisis: 1 / 1 ✅
```

Si la somme ne correspond pas au score :
```
[Équipe Domicile]        [Équipe Extérieure]
Buts saisis: 1 / 2 ❌    Buts saisis: 1 / 1 ✅

⚠️ Le nombre de buts saisis doit correspondre au score final
```

### 2. Validation à la Soumission

Avant d'enregistrer, le système vérifie :

✅ **Somme des buts = Score**
```typescript
const homeGoals = playerStats
  .filter(stat => isHomePlayer(stat.playerId))
  .reduce((sum, stat) => sum + stat.goals, 0);

if (homeGoals !== homeScore) {
  toast.error(`Buts saisis (${homeGoals}) ≠ Score (${homeScore})`);
  return; // Bloque la soumission
}
```

✅ **Seules les stats complètes sont envoyées**
```typescript
// Filtrer les lignes vides (pas de joueur sélectionné)
const validPlayerStats = playerStats.filter(stat => stat.playerId !== '');
```

## 📊 Format des Données

### Structure envoyée à l'API

```json
{
  "homeScore": 2,
  "awayScore": 1,
  "playerStats": [
    {
      "playerId": "uuid-joueur-1",
      "goals": 2,
      "assists": 1,
      "yellowCards": 0,
      "redCards": 0
    },
    {
      "playerId": "uuid-joueur-2",
      "goals": 1,
      "assists": 0,
      "yellowCards": 1,
      "redCards": 0
    }
  ]
}
```

### Stockage en Base de Données

Table `MatchPlayerStats` :
```sql
CREATE TABLE MatchPlayerStats (
  id UUID PRIMARY KEY,
  matchId UUID REFERENCES Match(id),
  playerId UUID REFERENCES Player(id),
  goals INT DEFAULT 0,
  assists INT DEFAULT 0,
  yellowCards INT DEFAULT 0,
  redCards INT DEFAULT 0
);
```

## 🎯 Cas d'Utilisation

### Cas 1 : Match Simple (Admin)

1. Admin va sur la page du match
2. Entre les scores : 3-1
3. Section stats joueurs apparaît
4. Clique "Ajouter un joueur"
5. Sélectionne Joueur A (Équipe Domicile)
6. Saisit : 2 buts, 1 passe
7. Clique "Ajouter un joueur"
8. Sélectionne Joueur B (Équipe Domicile)
9. Saisit : 1 but, 0 passe
10. Sélectionne Joueur C (Équipe Extérieure)
11. Saisit : 1 but, 1 passe
12. Validation : ✅ Domicile 3/3, Extérieur 1/1
13. Clique "Enregistrer le résultat"

### Cas 2 : Coach Modifie Son Match

1. Coach de l'équipe domicile se connecte
2. Va sur un match de son équipe
3. Voit : _(Coach - Nom de son équipe)_
4. Entre les scores de son match
5. Peut saisir les stats de **tous** les joueurs (des deux équipes)
6. Valide et enregistre

### Cas 3 : Erreur de Validation

1. Utilisateur entre : Domicile 3 - Extérieur 1
2. Ajoute Joueur A : 2 buts
3. Ajoute Joueur B : 2 buts ❌
4. Total domicile : 4 buts (mais score = 3)
5. Panneau devient rouge : "Buts saisis: 4 / 3 ❌"
6. À la soumission : Toast d'erreur
7. Utilisateur corrige : met 1 but pour Joueur B
8. Validation : ✅ 3/3
9. Soumission réussie

## 🔄 Modification des Résultats

Lors de la modification d'un match existant :

1. Les anciennes `MatchPlayerStats` sont **supprimées**
2. Les nouvelles stats sont créées avec les nouvelles valeurs
3. Transaction atomique pour garantir la cohérence

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Supprimer les anciennes stats
  await tx.matchPlayerStats.deleteMany({ where: { matchId } });

  // 2. Créer les nouvelles stats
  await tx.matchPlayerStats.createMany({ data: validPlayerStats });
});
```

## 📈 Impact sur les Statistiques

Les stats joueurs sont utilisées dans :

### 1. Statistiques de Tournoi
- Classement des buteurs
- Classement des passeurs
- Stats de cartons par joueur
- Agrégation par équipe

### 2. Profil Joueur (Futur)
- Total de buts sur la saison
- Moyenne de passes par match
- Historique des cartons

## 🎨 Interface Utilisateur

### Design Réactif

**Validation OK** :
```
┌─────────────────────────────────────┐
│ [Équipe A]       [Équipe B]         │
│ Buts: 2/2 ✅     Buts: 1/1 ✅       │
└─────────────────────────────────────┘
```

**Validation KO** :
```
┌─────────────────────────────────────┐
│ [Équipe A]       [Équipe B]         │
│ Buts: 3/2 ❌     Buts: 1/1 ✅       │
│ ⚠️ Le nombre de buts doit correspondre│
└─────────────────────────────────────┘
```

### Carte Joueur

```
┌────────────────────────────────────────┐
│ Joueur: [#10 - Mbappé (PSG) - ATT] 🗑️│
├────────────────────────────────────────┤
│ Buts:  [2]  Passes: [1]               │
│ CJ:    [0]  CR:     [0]               │
└────────────────────────────────────────┘
```

## 📁 Fichiers Modifiés

### Nouveaux Fichiers
- **`components/match/player-stats-form.tsx`**
  - Composant de formulaire de stats
  - Validation en temps réel
  - Gestion des joueurs multiples

### Fichiers Modifiés
- **`pages/matches/[id].tsx`**
  - Ajout du système de permissions (coach)
  - Intégration du PlayerStatsForm
  - Validation avant soumission

- **`actions/matches.ts`**
  - Ajout `coachUser` dans `getMatchById`
  - Permet la vérification des permissions côté client

## 🚀 Améliorations Futures

### UX
- [ ] Auto-complétion des joueurs fréquents
- [ ] Sauvegarde automatique en brouillon
- [ ] Historique des modifications
- [ ] Duplication des stats d'un joueur

### Fonctionnalités
- [ ] Import depuis feuille de match physique
- [ ] Validation des limites (ex: max 2 jaunes = 1 rouge auto)
- [ ] Temps de jeu par joueur
- [ ] Remplacements et changements

### Stats Avancées
- [ ] Position sur le terrain des buts
- [ ] Minute du but/carton
- [ ] Type de passe (centre, transversale, etc.)
- [ ] Statistiques défensives (tacles, interceptions)

## 📝 Notes Importantes

1. **La saisie des stats est optionnelle** - On peut enregistrer juste les scores
2. **La validation est stricte** - La somme des buts DOIT correspondre exactement
3. **Les coachs ont les mêmes droits que les admins** - Sur leurs matchs uniquement
4. **Les stats vides sont filtrées** - Pas besoin de supprimer manuellement
5. **Transaction atomique** - Soit tout est enregistré, soit rien (cohérence garantie)
