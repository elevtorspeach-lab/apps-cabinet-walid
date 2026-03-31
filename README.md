# Cabinet ARAQI HOUSSAINI

Application de gestion de cabinet juridique avec interface web, synchronisation serveur locale et packaging desktop Electron.

## Contenu du projet

- `index.html`, `app.js`, `style.css`: application web principale
- `server/`: API Express pour persistance, authentification et synchronisation
- `desktop-app/`: application desktop Electron avec copie offline du front
- `workers/`: Web Workers pour filtrage et export
- `assets/`: ressources d'export Audience
- `.github/workflows/`: build desktop, verification et deploiement GitHub Pages

## Fonctionnalites principales

- gestion des clients et dossiers
- suivi des audiences, diligences et salles
- gestion des utilisateurs et roles
- import/export de donnees
- mode local/offline
- build desktop macOS et Windows

## Demarrage rapide

### 1. Version web statique

Ouvrir `index.html` dans le navigateur.

### 2. Version web avec serveur local

Prerequis:

- Node.js 20+

Commandes:

```bash
cd server
npm install
npm start
```

Puis ouvrir:

- `http://127.0.0.1:3000`
- ou `http://localhost:3000`

### 3. Application desktop

```bash
cd desktop-app
npm install
npm run start
```

## Comptes par defaut

- local: `manager / 1234`
- serveur: `manager / 1234`

L'application accepte aussi l'alias gestionnaire entre les modes local et distant.

## Workflows GitHub inclus

- deploiement web sur GitHub Pages
- build Windows portable
- build macOS
- verification de syntaxe et synchronisation des assets offline

## Publication sur GitHub

Le depot local est deja initialise en Git et pointe vers:

- `https://github.com/elevtorspeach-lab/cabinet-app.git`

Pour publier les changements:

```bash
git add .
git commit -m "Update cabinet app"
git push origin main
```

## Documentation

- guide utilisateur: [`GUIDE_UTILISATION.md`](./GUIDE_UTILISATION.md)
- checklist de release: [`RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md)
- aide upload GitHub: [`GITHUB_UPLOAD_STEPS.txt`](./GITHUB_UPLOAD_STEPS.txt)
