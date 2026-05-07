# Système de Statistiques - Guide Complet

## Vue d'ensemble

Le système de statistiques analyse automatiquement tous les matchs terminés d'un tournoi pour générer des statistiques détaillées par équipe et par joueur.

## Affichage

Les statistiques sont disponibles dans l'onglet **"Statistiques"** de chaque tournoi et incluent :

### 🏆 Arbre du Tournoi
- Affiche le bracket complet (si des matchs knockout ont été joués)
- Visualisation de tous les tours (16èmes, quarts, demi-finales, finale)
- Résultats de chaque match

### 📊 Statistiques Globales
- **Total de matchs joués**
- **Total de buts marqués**

### 🏴 Statistiques par Équipe

#### Top Équipes
1. **Meilleure attaque** - Équipe avec le plus de buts marqués
2. **Pire attaque** - Équipe avec le moins de buts marqués
3. **Défense la plus perméable** - Équipe ayant encaissé le plus de buts
4. **Plus de passes décisives** - Équipe totalisant le plus d'assists
5. **Plus de cartons jaunes** - Équipe la plus avertie
6. **Plus de cartons rouges** - Équipe avec le plus d'expulsions

#### Tableau Complet des Équipes
Affiche toutes les équipes avec :
- **MJ** - Matchs joués
- **BP** - Buts pour (marqués)
- **BC** - Buts contre (encaissés)
- **+/-** - Différence de buts
- **Passes** - Passes décisives totales
- **CJ** - Cartons jaunes
- **CR** - Cartons rouges

### 👤 Statistiques par Joueur

#### Top Joueurs
1. **Meilleur buteur** - Joueur avec le plus de buts
2. **Meilleur passeur** - Joueur avec le plus de passes décisives
3. **Meilleur gardien** - Gardien ayant encaissé le moins de buts
4. **Gardien le plus battu** - Gardien ayant encaissé le plus de buts
5. **Plus averti (jaunes)** - Joueur avec le plus de cartons jaunes
6. **Plus averti (rouges)** - Joueur avec le plus de cartons rouges

#### Classement des Buteurs
Top 10 des meilleurs buteurs du tournoi avec :
- Position dans le classement
- Nom du joueur
- Numéro et position
- Équipe
- Buts marqués
- Passes décisives

## Source des Données

### Données par Équipe
Les stats d'équipe sont calculées à partir des **scores des matchs** :
```typescript
// Chaque match terminé contribue aux stats
homeTeam.goalsScored += match.homeScore
homeTeam.goalsConceded += match.awayScore
```

### Données par Joueur
Les stats individuelles proviennent de **MatchPlayerStats** :
```typescript
// Pour chaque match, les stats individuelles sont enregistrées
{
  playerId: "...",
  goals: 2,
  assists: 1,
  yellowCards: 0,
  redCards: 0
}
```

**Important** : Les stats par joueur ne sont disponibles que si elles ont été saisies lors de la soumission des résultats de match.

### Stats de Gardien
Calculées automatiquement :
- Position du joueur = "GK" (Goalkeeper)
- Buts encaissés = Score de l'équipe adverse
- Un seul gardien par équipe est pris en compte

## Comment Ajouter des Stats Joueur

Actuellement, lors de la soumission d'un résultat de match, les `playerStats` sont envoyés vides :

```typescript
// pages/matches/[id].tsx
body: JSON.stringify({
  homeScore,
  awayScore,
  playerStats: [], // ❌ Vide pour le moment
})
```

Pour avoir des stats complètes, il faudra créer un formulaire pour saisir :
- Buteurs et nombre de buts
- Passeurs et nombre de passes
- Cartons jaunes par joueur
- Cartons rouges par joueur

### Format des Stats Joueur

```typescript
playerStats: [
  {
    playerId: "uuid-du-joueur",
    goals: 2,           // Nombre de buts marqués
    assists: 1,         // Nombre de passes décisives
    yellowCards: 1,     // Cartons jaunes reçus
    redCards: 0         // Cartons rouges reçus
  },
  // ... autres joueurs
]
```

## Affichage Conditionnel

### Avec Stats Joueur (playerStats remplis)
✅ Toutes les stats sont disponibles :
- Meilleur buteur
- Meilleur passeur
- Plus averti
- Classement des buteurs complet

### Sans Stats Joueur (playerStats vides)
⚠️ Stats limitées :
- Stats d'équipe complètes (basées sur les scores)
- Stats de gardien (buts encaissés calculés automatiquement)
- Pas de stats individuelles de buteurs/passeurs
- Les cards de stats joueur n'apparaissent pas

## Fichiers Principaux

### Calcul des Stats
- **`lib/utils/tournament-stats.ts`**
  - `getTournamentStatistics()` - Fonction principale
  - Parcourt tous les matchs terminés
  - Calcule toutes les stats d'équipe et joueur
  - Détermine les tops (meilleur buteur, etc.)

### Action Serveur
- **`actions/statistics.ts`**
  - `getTournamentStats()` - Récupère les stats côté serveur
  - Gère les erreurs

### Composants UI
- **`components/tournament/tournament-statistics.tsx`**
  - `TournamentStatisticsView` - Composant principal
  - `StatCard` - Cartes de stats globales
  - `TeamStatCard` - Cartes de stats d'équipe
  - `PlayerStatCard` - Cartes de stats joueur
  - Tableaux de classement

### Page
- **`pages/tournaments/[id].tsx`**
  - Onglet "Statistiques"
  - Chargement lazy des stats (au clic sur l'onglet)
  - Affiche le bracket + les stats

## Performance

### Chargement Optimisé
Les stats sont chargées **uniquement** quand l'utilisateur clique sur l'onglet "Statistiques" :

```typescript
useEffect(() => {
  if (activeTab === 'stats' && !statistics && tournament) {
    // Charger les stats seulement si nécessaire
    getTournamentStats(tournament.id)
  }
}, [activeTab, tournament, statistics]);
```

### Mise en Cache
Une fois chargées, les stats restent en mémoire (state) jusqu'au rechargement de la page.

## Design

### Couleurs par Type de Stat
- 🟢 **Vert** - Statistiques positives (meilleur buteur, meilleure attaque)
- 🔴 **Rouge** - Statistiques négatives (pire attaque, cartons rouges)
- 🟣 **Violet** - Passes décisives
- 🟡 **Jaune** - Cartons jaunes
- 🔵 **Bleu** - Stats globales
- 🟠 **Orange** - Buts encaissés

### Cartes Gradient
Chaque statistique importante est affichée dans une carte avec :
- Gradient de couleur thématique
- Icône représentative
- Titre clair
- Valeur mise en évidence

### Tableaux
- Design moderne avec hover effects
- Tri par pertinence (buteurs par nombre de buts)
- Couleurs pour différencier les stats (buts en vert, cartons en jaune/rouge)

## Exemple d'Utilisation

1. Va dans un tournoi avec des matchs terminés
2. Clique sur l'onglet "Statistiques"
3. Un loader s'affiche pendant le calcul
4. Les stats s'affichent avec :
   - L'arbre du tournoi (si bracket généré)
   - Les tops par équipe
   - Les tops par joueur
   - Le classement des buteurs
   - Le tableau complet des équipes

## Améliorations Futures

### Formulaire de Stats Joueur
Créer un formulaire dans la page de détail du match pour saisir :
- Les buteurs (sélection multi avec nombre de buts)
- Les passeurs (sélection multi avec nombre de passes)
- Les cartons (sélection simple par couleur)

### Stats Supplémentaires
- Tirs au but
- Possession
- Fautes commises
- Corners
- Hors-jeu

### Export
- Télécharger les stats en PDF
- Export Excel des classements
- Partage sur réseaux sociaux

### Comparaisons
- Comparer deux tournois
- Évolution des stats par phase
- Stats par groupe vs stats globales
