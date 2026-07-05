# Arrows

Plugin pour [Obsidian](https://obsidian.md/) qui permet de dessiner des flèches dans vos notes, comme si vous reliais à la main différentes parties du texte.

**Fonctionne uniquement en mode Aperçu en direct (Live Preview).**

![demo](screenshots/demo.png)

## Utilisation

### Dessiner des flèches

Tapez `{identifiant-flèche|couleur}` pour marquer le **début** d’une flèche, par ex. `{ma-flèche|#1e90ff}`.

Puis tapez `{identifiant-flèche}` ailleurs pour marquer la **fin** de la flèche : ici `{ma-flèche}`.

Une flèche est tracée du début vers la fin, le long de la marge.

```
Lorem ipsum dolor sit amet, consectetur {ma-flèche|#1e90ff} adipiscing elit. Tempus tortor ac, commodo purus.

Morbi et lacus suscipit, dignissim purus at, dapibus augue. {ma-flèche} Aliquam non lectus varius.
```

<img width=450 src="./screenshots/drawing-arrows.png">

---

### Flèches diagonales

Pour une flèche **diagonale**, ajoutez `|diagonal` au début de la flèche, par ex. `{ma-flèche2|#ff5555|diagonal}`.

```
Lorem ipsum dolor sit amet, consectetur {ma-flèche2|#ff5555|diagonal} adipiscing elit. Tempus tortor ac, commodo purus.

Morbi et lacus suscipit, dignissim purus at, dapibus {ma-flèche2} augue. Aliquam non lectus varius.
```

<img width=450 src="./screenshots/diagonal.png">

---

### Flèches droites (straight)

Pour une ligne **droite** entre le début et la fin (sans suivre la marge), ajoutez `|straight` au début, par ex. `{ma-flèche3|#1e90ff|straight}`.

```
Lorem ipsum dolor sit amet, consectetur {ma-flèche3|#1e90ff|straight} adipiscing elit. Tempus tortor ac, commodo purus.

Morbi et lacus suscipit, dignissim purus at, dapibus {ma-flèche3} augue. Aliquam non lectus varius.
```

---

### Plusieurs flèches

Utilisez des **identifiants différents** pour plusieurs flèches, par ex. `{autre-flèche|orange}` :

```
Lorem ipsum dolor sit amet, {autre-flèche|orange} consectetur adipiscing elit. {ma-flèche3}

Morbi et lacus suscipit, dignissim purus at, dapibus augue. Aliquam non lectus varius, tempus tortor ac, commodo purus. {autre-flèche}
```

<img width=450 src="./screenshots/more-arrows.png">

---

### Multi-flèches

Un même début peut avoir **plusieurs fins** : une flèche est dessinée vers chaque `{identifiant}` correspondant.

```
Lorem ipsum dolor sit amet, {multi|limegreen} consectetur adipiscing elit.

Morbi et lacus suscipit, dignissim purus at, dapibus augue. Aliquam non lectus varius, tempus tortor ac, commodo purus. {multi}

Pellentesque posuere ex non facilisis bibendum. Integer iaculis dolor dignissim, ultrices ligula eu, malesuada metus. {multi}
```

<img width=450 src="./screenshots/multi-arrows.png">

---

### Flèches de marge : position horizontale

Pour les flèches **margin**, réglez la position horizontale avec `|x-pos` où `x-pos` est un entier entre **0** et **30**, par ex. `{ma-flèche|blue|10}`.

```
Lorem ipsum dolor sit amet, {première|dodgerblue|20} consectetur adipiscing elit. {deuxième|limegreen|10}

Morbi et lacus suscipit, dignissim purus at, dapibus augue. {troisième|tomato} Aliquam non lectus varius, tempus tortor ac, commodo purus.

Pellentesque posuere {troisième} ex non facilisis bibendum. {deuxième}
Integer iaculis dolor dignissim, ultrices ligula eu, malesuada metus. {première}
```

<img width=450 src="./screenshots/adjusting-margin-arrows.png">

---

### Encadrés (box) et texte relié

Vous pouvez entourer un morceau de texte d’une **bordure** et faire partir la flèche du **milieu bas** de l’encadré vers le **milieu haut** de la cible (comme pour les autres types de flèches).

- **Début avec box** : ajoutez le sous-type `box` au type de flèche, par ex. `straight,box`, `diagonal,box`, ou seulement `box` pour une flèche de marge.
- **Fermeture** : `{/identifiant}` termine l’encadré ; tout le texte **entre** la fin du tag d’ouverture et cette balise est dans la box.
- **Fin avec box** : pour que l’**arrivée** soit aussi un encadré, utilisez `{identifiant|box}` comme fin de flèche (sans répéter tout le détail du début), puis `{/identifiant}` pour fermer.

**Deux couleurs** (séparées par une virgule) : la **première** colore la flèche, la **seconde** la bordure des box. Exemple : `{id|#1e90ff40, #fff|straight,box}`.

Si la fin `{id|box}` ne précise pas de couleur de bordure, elle **reprend la couleur de bordure du début** (la deuxième couleur si vous en avez donné deux), puis sinon la couleur de la flèche.

Exemple minimal (deux box reliées avec le même identifiant) :

```
phrase de test {arrow3|#1e90ff40, #fff|straight,box} mon texte à entourer {/arrow3} de test

phrase de test {arrow3|box} mon texte à entourer {/arrow3} de test
```

Les balises `{/identifiant}` sont masquées à l’affichage (sauf lorsque le curseur est dessus pour pouvoir éditer). Les points ● aux extrémités sont masqués quand l’identifiant est en mode box.

---

### Pointes de flèche

- Ajoutez une pointe au **début** : `|arrow` sur le tag de début.
- Retirez la pointe à la **fin** : `{identifiant|no-arrow}` sur le tag de fin.

```
Lorem ipsum dolor sit amet, {double|#3d6eff|arrow} consectetur adipiscing elit.

Morbi et lacus suscipit, {double} dignissim purus at, dapibus augue. {ligne|#9d6efa} Aliquam non lectus varius, tempus tortor ac, commodo purus.

Pellentesque posuere ex non facilisis bibendum. {ligne|no-arrow}
```

<img width=450 src="./screenshots/arrowheads.png">

---

### Navigation entre les flèches

Quand le curseur est **en dehors** de la syntaxe `{…}`, les identifiants sont affichés comme un petit cercle ● pour un rendu plus propre.

Un clic sur un ● fait défiler l’éditeur vers l’**identifiant suivant** correspondant, pratique dans les longues notes.

---

## Syntaxe complète

**Début de flèche** — `{identifiant|couleur|opacité|type|position-x|pointe}` où :

| Champ | Description |
|--------|-------------|
| `identifiant` | Chaîne unique pour lier début et fin(s). |
| `couleur` | Couleur CSS (`red`, `#ff0000`, etc.). Pour les box : deux couleurs séparées par une virgule : **flèche**, puis **bordure** (ex. `#1e90ff, #ffffff`). |
| `opacité` (optionnel) | Nombre entre 0 et 1 (ex. `0.6`). Défaut : 1. |
| `type` (optionnel) | `diagonal`, `margin`, ou `straight`. Peut être combiné avec `box` : `straight,box`, `diagonal,box`, ou `box` seul pour une flèche de marge avec box. Défaut : `margin`. |
| `position-x` (optionnel) | Entier 0–30 pour la position horizontale des flèches **margin**. Défaut : 0. |
| `pointe` (optionnel) | `no-arrow` ou `arrow` au **début** pour ajouter une pointe au départ. Défaut : `no-arrow`. |

**Fin de flèche** :

- `{identifiant}` — fin classique.
- `{identifiant|no-arrow}` — sans pointe à l’arrivée.
- `{identifiant|box}` — fin qui ouvre une **box** ; le texte jusqu’à `{/identifiant}` est encadré.

**Fermeture de box** : `{/identifiant}` — ferme l’encadré ouvert par un début ou une fin en mode `box`.

Une flèche est tracée du (ou des) début(s) vers **toutes** les fins portant le même identifiant.

---

## Limitations

- Uniquement **Aperçu en direct** (pas en mode source seul de la même façon).

## Contribution

Les contributions et les PR sont les bienvenues.

## Provenance

Ce dépôt est maintenu par [l'Atelier](https://atelier.atechnologie.fr/) et s’appuie sur le plugin original [Arrows](https://github.com/artisticat1/arrows) de **artisticat1** (licence MIT). L’auteur original est crédité comme contributeur du projet d’origine.

> **Catalogue Obsidian** : si vous soumettez ce plugin au catalogue communautaire, la politique Obsidian sur les forks peut exiger l’accord écrit de l’auteur original ou la preuve qu’il est injoignable et inactif depuis 6 mois.

## Catalogue Obsidian

- **ID plugin** : `arrows-in-md`
- **Dépôt** : [github.com/Morglaf/arrows](https://github.com/Morglaf/arrows)
- **Licence** : MIT — [LICENSE](LICENSE)
- **Réseau** : non
- **Release** : `.\Release-Plugin.ps1`

## Remerciements

Le projet utilise la bibliothèque [leader-line](https://anseki.github.io/leader-line/) pour le rendu des flèches.
