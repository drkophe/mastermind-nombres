# 🚀 Créer le projet Mastermind directement sur GitHub

## Étape 1 : Créer le repository

1. **Aller sur GitHub** : [github.com](https://github.com)
2. **Se connecter** à votre compte (ou créer un compte gratuit)
3. **Cliquer sur le "+" en haut à droite** → "New repository"
4. **Configurer le repository** :
   ```
   Repository name: mastermind-nombres
   Description: Jeu Mastermind multijoueur avec nombres 4 chiffres
   ✅ Public (gratuit)
   ✅ Add a README file
   ```
5. **Cliquer sur "Create repository"**

## Étape 2 : Créer les fichiers du projet

### 📄 Fichier 1 : package.json

1. **Dans votre repository**, cliquer sur "Add file" → "Create new file"
2. **Nom du fichier** : `package.json`
3. **Contenu** (copier-coller) :

```json
{
  "name": "mastermind-nombres",
  "version": "1.0.0",
  "description": "Jeu Mastermind multijoueur avec des nombres à 4 chiffres",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "keywords": [
    "mastermind",
    "jeu",
    "multijoueur",
    "socket.io",
    "nodejs"
  ],
  "author": "Votre nom",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.4"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  },
  "engines": {
    "node": ">=14.0.0"
  }
}
```

4. **Commit** : Cliquer sur "Commit new file" (en bas)

### 📄 Fichier 2 : server.js

1. **"Add file" → "Create new file"**
2. **Nom** : `server.js`
3. **Contenu** : [Copier tout le code JavaScript du serveur de l'artifact "server.js"]

*Note : Le code est trop long pour ce guide, je vous donnerai le contenu exact après.*

### 📄 Fichier 3 : public/index.html

1. **"Add file" → "Create new file"**
2. **Nom** : `public/index.html` 
   ⚠️ **Important** : Taper exactement `public/index.html` - GitHub créera automatiquement le dossier `public`
3. **Contenu** : [Copier tout le code HTML de l'artifact "index.html"]

### 📄 Fichier 4 : README.md (optionnel mais recommandé)

1. **Modifier le README.md existant** en cliquant dessus puis sur l'icône crayon (✏️)
2. **Contenu** :

```markdown
# 🎯 Mastermind Nombres

Jeu Mastermind multijoueur en temps réel où les joueurs doivent deviner un nombre à 4 chiffres (0001-9999).

## 🎮 Comment jouer

1. Rejoignez avec votre nom
2. Le premier joueur devient l'hôte et peut démarrer des parties
3. Devinez le nombre en analysant les indices :
   - **Bien placés** : chiffres corrects à la bonne position
   - **Mal placés** : chiffres corrects mais mal positionnés

## 🚀 Fonctionnalités

- ✅ Multijoueur temps réel avec Socket.IO
- ✅ Chat entre joueurs
- ✅ Deux modes : nombre aléatoire ou défini par l'hôte
- ✅ Interface responsive
- ✅ Scores en temps réel

## 🌐 Démo en ligne

[Lien vers votre app Render] (à ajouter après déploiement)

## 🛠️ Technologies

- Node.js + Express
- Socket.IO
- HTML/CSS/JavaScript
```

## Étape 3 : Vérifier la structure

Votre repository doit maintenant contenir :
```
mastermind-nombres/
├── package.json
├── server.js
├── public/
│   └── index.html
└── README.md
```

## Étape 4 : Déployer sur Render

1. **Aller sur [render.com](https://render.com)**
2. **Créer un compte** (gratuit)
3. **Cliquer sur "New +"** → "Web Service"
4. **"Connect GitHub"** et autoriser l'accès
5. **Sélectionner votre repository** `mastermind-nombres`
6. **Configuration** :
   ```
   Name: mastermind-nombres
   Environment: Node
   Region: Frankfurt (Europe) ou Oregon (US)
   Branch: main
   Build Command: npm install
   Start Command: npm start
   Plan: Free
   ```
7. **Cliquer sur "Create Web Service"**

## Étape 5 : Attendre le déploiement

- Le déploiement prend **2-5 minutes**
- Vous verrez les logs en temps réel
- Une fois terminé, vous obtiendrez une URL comme : `https://mastermind-nombres-xyz.onrender.com`

## ✅ Résultat final

Votre jeu sera accessible via l'URL fournie par Render !

## 🔧 Si quelque chose ne marche pas

### Problèmes courants :

1. **Build échoue** : Vérifiez que `package.json` est correct
2. **App ne démarre pas** : Regardez les logs Render
3. **Socket.IO ne fonctionne pas** : C'est normal, ça marche une fois déployé

### Modifications après déploiement :

- Modifiez directement les fichiers sur GitHub
- Render redéploie automatiquement à chaque commit
- Rechargez l'app après quelques minutes

## 💡 Conseils

- **Testez d'abord** le déploiement avec les fichiers de base
- **Personnalisez ensuite** couleurs/textes directement sur GitHub
- **Plan gratuit** : l'app s'endort après 15min d'inactivité (normal)

---

**Prêt à créer votre jeu ? Suivez les étapes et vous aurez votre Mastermind en ligne en 10 minutes ! 🎉**
