# Système de Bracket - Guide Complet

## Vue d'ensemble

Le système de bracket gère automatiquement la progression des phases éliminatoires d'un tournoi, de la génération initiale jusqu'à la finale.

## Fonctionnement

### 1. Phase de Poules (GROUP)

**Génération des matchs**
- L'admin clique sur "Générer les matchs" dans l'onglet Matchs
- Tous les matchs de poule sont créés (round-robin)
- Chaque équipe joue contre toutes les autres de son groupe

**Soumission des résultats**
- L'admin entre les scores de chaque match
- Les classements (standings) sont automatiquement recalculés après chaque match

**Terminer la phase de poules**
- Une fois tous les matchs terminés, un bouton vert "Terminer la phase de poules" apparaît
- L'admin clique dessus pour valider la fin de la phase de groupe
- Le statut `groupStageComplete` passe à `true`

### 2. Génération du Bracket Initial

**Conditions**
- La phase de poules doit être terminée (`groupStageComplete: true`)
- L'admin va dans l'onglet "Bracket"
- Le bouton "Générer le bracket d'élimination" est disponible

**Processus**
- Le système récupère les 2 meilleurs de chaque groupe (via standings)
- Détermine le stage initial selon le nombre total de qualifiés :
  - **4 équipes** → Demi-finales (SEMI_FINAL)
  - **8 équipes** → Quarts de finale (QUARTER_FINAL)
  - **16 équipes** → 8èmes de finale (ROUND_OF_16)
- Crée les pairings optimaux (1er vs dernier, 2ème vs avant-dernier, etc.)

### 3. Progression Automatique du Bracket ✨

**C'est la nouveauté !** Le système progresse automatiquement d'un tour à l'autre.

#### Cas 1 : 16èmes de finale (16 équipes)

1. L'admin entre les résultats des 8 matchs de 16èmes
2. Dès que le **dernier match** est terminé :
   - ✅ Le système détecte automatiquement que tous les matchs sont finis
   - ✅ Il récupère les 8 gagnants
   - ✅ Il génère automatiquement les **4 matchs de quarts de finale**
   - ✅ Un toast apparaît : "4 matchs de QUARTER_FINAL générés automatiquement"

#### Cas 2 : Quarts de finale (8 équipes)

1. L'admin entre les résultats des 4 matchs de quarts
2. Dès que le **dernier match** est terminé :
   - ✅ Génération automatique des **2 matchs de demi-finales**
   - ✅ Toast : "2 matchs de SEMI_FINAL générés automatiquement"

#### Cas 3 : Demi-finales (4 équipes)

1. L'admin entre les résultats des 2 matchs de demi-finales
2. Dès que le **dernier match** est terminé :
   - ✅ Génération automatique de la **finale**
   - ✅ Toast : "1 match de FINAL généré automatiquement"

#### Cas 4 : Finale

1. L'admin entre le résultat de la finale
2. Dès que le match est terminé :
   - ✅ Le système détecte le vainqueur du tournoi
   - ✅ Toast spécial : "🏆 Tournoi terminé ! Vainqueur : [Nom de l'équipe]"

## Exemple de Flux Complet (16 équipes)

```
1. Phase de poules (4 groupes de 4 équipes)
   └─> Admin génère les matchs de groupe
   └─> Admin entre tous les résultats
   └─> Admin clique "Terminer la phase de poules"

2. Génération du bracket
   └─> Admin va dans l'onglet "Bracket"
   └─> Admin clique "Générer le bracket"
   └─> 8 matchs de 16èmes créés automatiquement

3. 16èmes de finale
   └─> Admin entre les 8 résultats
   └─> Après le 8ème résultat → 4 matchs de quarts générés AUTO ✨

4. Quarts de finale
   └─> Admin entre les 4 résultats
   └─> Après le 4ème résultat → 2 matchs de demi-finales générés AUTO ✨

5. Demi-finales
   └─> Admin entre les 2 résultats
   └─> Après le 2ème résultat → Finale générée AUTO ✨

6. Finale
   └─> Admin entre le résultat
   └─> Toast : "🏆 Tournoi terminé !"
```

## Algorithme de Progression

### Détection
```typescript
// Après chaque soumission de résultat d'un match knockout :
1. Récupérer tous les matchs du même stage
2. Vérifier si tous sont FINISHED
3. Vérifier que tous ont un winnerTeamId
4. Si oui → Progresser au stage suivant
```

### Génération
```typescript
// Pour créer le tour suivant :
1. Récupérer les gagnants dans l'ordre des matchs
2. Créer les pairings : [gagnant 1 vs gagnant 2], [gagnant 3 vs gagnant 4], etc.
3. Créer les matchs avec le nouveau stage
4. Espacer les dates d'un jour
```

### Stages de Progression
```typescript
ROUND_OF_16 → QUARTER_FINAL (8 → 4 matchs)
QUARTER_FINAL → SEMI_FINAL (4 → 2 matchs)
SEMI_FINAL → FINAL (2 → 1 match)
FINAL → null (Tournoi terminé)
```

## Messages Utilisateur

### Toast de Progression
- "4 matchs de QUARTER_FINAL générés automatiquement"
- "2 matchs de SEMI_FINAL générés automatiquement"
- "1 match de FINAL généré automatiquement"

### Toast de Fin de Tournoi
- "🏆 Tournoi terminé ! Vainqueur : [Nom de l'équipe]"

## Sécurités et Validations

✅ **Vérifications avant progression** :
- Tous les matchs du stage sont FINISHED
- Tous les matchs ont un vainqueur (pas de match nul)
- Le stage suivant n'existe pas déjà
- Le nombre de gagnants est pair (sauf pour la finale)

✅ **Gestion des erreurs** :
- Si la progression échoue, le résultat du match est quand même enregistré
- L'erreur est loggée mais ne bloque pas l'utilisateur
- L'admin peut toujours générer manuellement via l'interface si besoin

## Fichiers Concernés

### Nouvelles fonctions
- `lib/utils/bracket-progression.ts` - Logique de progression automatique
  - `progressKnockoutStage()` - Génère le tour suivant
  - `checkTournamentComplete()` - Vérifie si le tournoi est fini

### Modifications
- `pages/api/matches/[id]/submit-result.ts` - Appelle la progression après soumission
- `pages/matches/[id].tsx` - Affiche les toasts de progression
- `lib/utils/bracket-generator.ts` - Génération initiale du bracket

## Avantages

✅ **Automatique** - Plus besoin de générer manuellement chaque tour
✅ **Rapide** - Progression immédiate dès le dernier résultat
✅ **Sûr** - Validations strictes avant chaque progression
✅ **Transparent** - L'admin est informé via des toasts clairs
✅ **Robuste** - Les erreurs de progression ne bloquent pas l'enregistrement des résultats
