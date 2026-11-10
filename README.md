# Tower Value

Tower defense heroic fantasy jouable dans le navigateur. Sept éléments, aucun ne gagne seul :
chaque tour prépare le terrain de la suivante.

**Jouer :** <https://pythonicguks.github.io/tower_value/>

## Les éléments

| Tour | Effet | Synergie |
|---|---|---|
| Archers (physique) | Dégâts francs | Brise les ennemis givrés : dégâts ×4, armure ignorée |
| Ondine (eau) | Mouille en zone | Lave l'huile, éteint les flammes |
| Givre (glace) | Givre les cibles **mouillées** | L'ennemi s'arrête jusqu'à la prochaine attaque physique |
| Foudre (électricité) | Dégâts | ×2 sur les mouillés, rebondit entre eux ; ×0,3 sur les boueux |
| Chaudron (huile) | Huile en zone | Prépare le feu ; recouvre l'eau |
| Brasier (feu) | Embrase les cibles **huilées** | Sèche les mouillés, dégèle les givrés |
| Obélisque (sable) | Embourbe les cibles **mouillées** | Boue : fort ralentissement, mais isole de la foudre |

Les ennemis ont leurs propres règles (armures, spectres, salamandres ignifugées, trolls qui se
régénèrent, boss) : le grimoire du jeu les détaille.

## Campagne et métaprogression

Huit batailles. Chacune rapporte de une à trois étoiles selon les vies conservées
(3 ★ à 90 % des vies, 2 ★ à 50 %). Les étoiles :

- débloquent les tours par paliers : Foudre à 1 ★, Huile et Brasier à 3 ★, Sables à 5 ★ ;
- se dépensent au Sanctuaire en talents permanents, réattribuables à volonté.

La progression est enregistrée dans le navigateur (`localStorage`).

## Commandes

Souris ou tactile : toucher un emplacement pour bâtir, une tour pour l'améliorer ou la vendre.

| Touche | Action |
|---|---|
| `1` à `7` | Bâtir sur l'emplacement sélectionné |
| `A` | Améliorer la tour sélectionnée |
| `V` | Vendre |
| `N` ou `Entrée` | Appeler la vague suivante (prime en or) |
| `Espace` | Pause |
| `F` | Vitesse ×1 / ×2 / ×3 |
| `Échap` | Désélectionner, puis menu de pause |

## Lancer en local

Aucune dépendance, aucune étape de build : des fichiers statiques et des modules ES.

```sh
python3 -m http.server 8000
# puis http://localhost:8000
```

(Un serveur est nécessaire : les modules ES ne se chargent pas depuis `file://`.)

## Déploiement GitHub Pages

Dans le dépôt : **Settings → Pages → Build and deployment → Deploy from a branch**,
branche `main`, dossier `/ (root)`. Chaque `git push` sur `main` met le site à jour.

## Organisation du code

| Fichier | Rôle |
|---|---|
| `js/data.js` | Tours, ennemis, talents, niveaux — tout l'équilibrage est ici |
| `js/sim.js` | Simulation (états, réactions, vagues), sans aucun accès au DOM |
| `js/render.js` | Rendu Canvas 2D : décors, tours, ennemis et effets dessinés par code |
| `js/main.js` | Écrans, interface, entrées, sauvegarde, boucle de jeu |
| `js/sfx.js` | Bruitages synthétisés (Web Audio) |
| `tools/` | Outils d'équilibrage en ligne de commande (Node) |

### Équilibrage

Chaque niveau décrit la **composition** de ses vagues ; l'effectif et le rythme sont calculés
à partir de deux réglages du niveau dans `js/data.js` :

- `flux` — dégâts par seconde exigés par pièce d'or disponible : c'est le curseur de difficulté ;
- `span` — durée d'arrivée des vagues.

```sh
node tools/balance.mjs         # vérifie les cartes, puis fait jouer un joueur automatique
node tools/balance.mjs tune    # cherche le flux le plus dur encore tenable, niveau par niveau
node tools/bench.mjs           # compare le rendement des combinaisons de tours
node tools/budget.mjs          # budget points de vie / or de chaque vague
```
