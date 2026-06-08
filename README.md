# Plateforme d'Analyse Video de Football

## 1. Presentation Generale

Ce projet de PFE consiste a developper une plateforme web intelligente pour l'analyse automatique des videos de football. L'objectif principal est de reduire le temps necessaire a l'analyse manuelle des matchs en automatisant la detection des actions importantes et en presentant les resultats dans une interface claire, interactive et exploitable.

La plateforme permet a un utilisateur de se connecter, d'ajouter une video depuis plusieurs sources, de lancer une analyse, puis de consulter les evenements detectes sur une timeline. Elle integre egalement une partie administration pour gerer les utilisateurs, les roles, les quotas et les droits d'acces.

## 2. Probleme Traite

Dans le domaine du football, l'analyse video est une tache importante pour les entraineurs, analystes, recruteurs et staffs techniques. Cependant, cette analyse est souvent longue et repetitif. Il faut regarder une video complete, identifier les moments importants, noter les timestamps, classer les actions et produire un resume.

Le probleme principal est donc le suivant :

- L'analyse manuelle d'un match demande beaucoup de temps.
- Les actions importantes peuvent etre difficiles a retrouver rapidement.
- Les resultats sont souvent disperses entre notes, fichiers video et rapports.
- Le suivi de plusieurs videos devient complexe.
- L'utilisation d'outils d'IA necessite une interface simple et controlee.

## 3. Solution Proposee

La solution developpee est une application web full-stack appelee **Soccer Analytics Platform**. Elle centralise la gestion des videos, l'analyse automatique, la visualisation des evenements et l'administration de la plateforme.

La plateforme permet de :

- Se connecter avec un compte Google.
- Ajouter une video YouTube.
- Telecharger une video locale.
- Analyser un flux live ou une playlist M3U.
- Lancer une detection d'actions de football.
- Generer un resume automatique.
- Visualiser les resultats dans une timeline.
- Sauvegarder les resultats dans la base de donnees.
- Gerer une bibliotheque de videos.
- Controler les quotas d'analyse.
- Administrer les utilisateurs et leurs acces.

## 4. Architecture Globale

Le projet utilise une architecture web en couches avec separation claire entre le frontend, le backend, la base de donnees, les traitements video et la communication temps reel.

```text
PFE/
|-- client/                  Application frontend React
|-- server/                  API backend Express/Node.js
|-- docker-compose.yml       Orchestration Docker
|-- package.json             Scripts globaux
|-- README.md                Documentation du projet
```

L'architecture logique peut etre representee comme suit :

```text
Utilisateur
   |
   v
Frontend React / Vite
   |
   | REST API avec Axios
   | WebSocket avec Socket.IO
   v
Backend Express.js
   |
   |-- Authentification et autorisation
   |-- Gestion des videos
   |-- Gestion des quotas
   |-- Traitement FFmpeg
   |-- Service IA
   |-- Service YouTube
   |-- Service Google Drive
   |
   v
MongoDB / Mongoose
```

## 5. Architecture En Couches

### 5.1 Couche Presentation

La couche presentation correspond au frontend. Elle est developpee avec React et Material UI. Elle contient les pages visibles par l'utilisateur :

- `Login.tsx` : page de connexion Google.
- `Dashboard.tsx` : tableau de bord avec statistiques et quotas.
- `Library.tsx` : bibliotheque des videos.
- `VideoAnalysis.tsx` : interface principale d'analyse video.
- `Admin.tsx` : console d'administration.

### 5.2 Couche Communication

Cette couche permet au frontend de communiquer avec le backend.

- Axios est utilise pour les appels HTTP REST.
- Socket.IO Client est utilise pour recevoir les resultats d'analyse en temps reel.
- Les tokens d'authentification sont ajoutes automatiquement dans les headers HTTP.

### 5.3 Couche API

Le backend expose plusieurs routes :

- `/api/auth` : authentification et gestion des utilisateurs.
- `/api/videos` : gestion des videos, analyse, quotas et administration.
- `/api/inference` : routes liees a l'inference.
- `/api/health` : verification de l'etat du serveur.

### 5.4 Couche Metier

Elle contient les services principaux :

- `youtube.service.ts` : recuperation des informations YouTube et gestion des videos YouTube.
- `ffmpeg.service.ts` : generation des miniatures et enregistrement de morceaux video.
- `ai.service.ts` : lancement de l'analyse IA.
- `googleDrive.service.ts` : upload optionnel vers Google Drive.
- `socket.service.ts` : emission des evenements temps reel.
- `auth.store.ts` : gestion des utilisateurs, roles, blocage et quotas.

### 5.5 Couche Donnees

La base de donnees est MongoDB, utilisee avec Mongoose. Les principaux modeles sont :

- `User` : utilisateurs, roles, et quotas.
- `Video` : videos ajoutees par les utilisateurs.
- `Analytics` : evenements analytiques systeme.
- `ActivityLog` : historique des activites.
- `System` : donnees et parametres globaux.

## 6. Technologies Utilisees

### 6.1 Frontend

- React `19.2.4`
- React DOM `19.2.4`
- Vite `8.0.4`
- TypeScript `~6.0.2`
- Material UI `9.0.0`
- Emotion `11.14.x`
- React Router DOM `7.14.2`
- Axios `1.15.2`
- Socket.IO Client `4.8.3`
- HLS.js `1.6.16`
- React Player `3.4.0`
- Google OAuth React `0.13.5`
- Lucide React `1.8.0`

### 6.2 Backend

- Node.js `18` via Docker `node:18-alpine`
- Express `5.2.1`
- TypeScript `5.9.3`
- Mongoose `9.4.1`
- MongoDB `7.0`
- Socket.IO `4.8.3`
- Multer `2.1.1`
- Fluent FFmpeg `2.1.3`
- FFmpeg Static `5.3.0`
- Google APIs `171.4.0`
- Passport `0.7.0`
- Passport Google OAuth 2.0 `2.0.0`
- dotenv `17.4.1`
- Redis `7.2-alpine` prevu dans Docker
- Nginx utilise pour le frontend en production

## 7. Pourquoi Ces Technologies

### React

React a ete choisi car il permet de construire une interface dynamique, modulaire et reutilisable. Les composants comme le lecteur video, la timeline, les cartes video et les formulaires peuvent etre separes et maintenus facilement.

### Vite

Vite offre un demarrage rapide du projet, un hot reload efficace et une configuration simple avec TypeScript. Cela accelere fortement le developpement.

### Material UI

Material UI permet d'obtenir rapidement une interface professionnelle avec des composants prets a l'emploi : tableaux, cartes, boutons, dialogues, menus, champs et barres de progression.

### Node.js et Express

Node.js est adapte aux applications qui manipulent beaucoup d'entrees/sorties : fichiers video, requetes HTTP, WebSocket et appels a des services externes. Express offre une structure simple et flexible pour creer une API REST.

### MongoDB et Mongoose

MongoDB est adapte aux donnees semi-structurees. Les videos peuvent contenir des metadonnees differentes selon leur source : YouTube, upload ou stream. Mongoose ajoute des schemas, des validations et des index pour mieux organiser les donnees.

### Socket.IO

Socket.IO a ete choisi pour envoyer les resultats d'analyse en temps reel. Lorsqu'une action est detectee, le backend peut l'envoyer immediatement au frontend sans attendre la fin de toute l'analyse.

### FFmpeg

FFmpeg est un outil puissant pour le traitement video. Il est utilise pour generer des miniatures, enregistrer des morceaux video et preparer les segments a analyser.

## 8. Fonctionnalites Principales

### 8.1 Authentification

L'utilisateur se connecte avec Google. Le frontend recupere le profil Google, puis l'envoie au backend. Le backend verifie si l'email est autorise, cree ou met a jour l'utilisateur, puis retourne une session.

Fonctionnalites d'authentification :

- Connexion Google OAuth.
- Verification de l'email.
- Support des emails approuves.
- Support d'un domaine approuve.
- Gestion des roles `user` et `admin`.
- Redirection automatique vers login si la session est absente ou invalide.

### 8.2 Gestion Des Videos

La plateforme prend en charge trois sources :

- Upload local.
- Video YouTube.
- Flux live ou M3U.

Chaque video possede :

- Un titre.
- Une source.
- Une URL ou un chemin local.
- Un statut.
- Une miniature.
- Un proprietaire.
- Des metadonnees.
- Des resultats d'analyse.

Les statuts possibles sont :

- `ready` : video prete.
- `processing` : analyse en cours.
- `done` : analyse terminee.

### 8.3 Analyse Video

L'utilisateur peut choisir entre deux types d'analyse :

- Detection d'actions : `action-spotting`.
- Resume automatique : `summarization`.

Les modeles affiches dans l'interface sont :

- `V1` et `V2` pour la detection d'actions.
- `S1` et `S2` pour le resume.

### 8.4 Timeline Interactive

Les evenements detectes sont affiches dans une timeline. Chaque evenement contient :

- Un identifiant.
- Un type d'action.
- Un temps de debut.
- Un temps de fin.
- Un score de confiance.

La timeline permet de visualiser rapidement les moments importants de la video.

### 8.5 Bibliotheque Video

La page bibliotheque affiche toutes les videos ajoutees. Pour chaque video, l'utilisateur peut voir :

- La miniature.
- Le titre.
- Le statut.
- Un bouton pour consulter le resultat.
- Un bouton pour supprimer la video.

### 8.6 Tableau De Bord

Le tableau de bord donne une vue globale :

- Nombre total de videos.
- Nombre de videos traitees.
- Nombre de videos en cours de traitement.
- Nombre de videos pretes.
- Consommation du quota.
- Quota restant.

### 8.7 Administration

La console d'administration permet de :

- Voir les utilisateurs.
- Ajouter un utilisateur.
- Modifier son role.
- Bloquer ou debloquer un compte.
- Modifier les quotas.
- Appliquer des quotas globaux.
- Exporter la liste des utilisateurs en CSV.

## 9. Donnees Manipulees

### 9.1 Donnees Utilisateur

Le modele `User` contient :

- `email`
- `name`
- `picture`
- `googleId`
- `role`
- `blocked`
- `quota`
- `lastLoginAt`
- `createdBy`
- `createdAt`
- `updatedAt`

Le quota contient :

- `dailyLimit`
- `weeklyLimit`
- `monthlyLimit`
- `dailyUsed`
- `weeklyUsed`
- `monthlyUsed`

### 9.2 Donnees Video

Le modele `Video` contient :

- `title`
- `source`
- `url`
- `status`
- `thumbnail`
- `ownerEmail`
- `startTime`
- `endTime`
- `metadata`
- `createdAt`
- `updatedAt`

Le champ `metadata` permet de stocker :

- Les informations YouTube.
- Les resultats d'inference.
- Les evenements detectes.
- Le resume genere.
- Le modele utilise.
- La date de fin d'analyse.

### 9.3 Donnees D'Analyse

Un evenement d'analyse contient :

- `id`
- `label`
- `start`
- `end`
- `confidence`

Exemples d'actions detectees :

- Goal
- Penalty
- Kick-off
- Substitution
- Offside
- Shots on target
- Shots off target
- Clearance
- Ball out of play
- Throw-in
- Goal kick
- Corner
- Free kick
- Yellow card
- Red card
- Foul
- Tackle
- Dribble
- Save
- Full-time
- Half-time

## 10. Pipeline D'Analyse

Le processus complet est le suivant :

1. L'utilisateur choisit une source video.
2. Le frontend envoie la source au backend.
3. Le backend cree une entree `Video` dans MongoDB.
4. FFmpeg genere une miniature si possible.
5. L'utilisateur lance l'analyse.
6. Le backend verifie l'authentification.
7. Le backend verifie le quota.
8. Le statut de la video passe a `processing`.
9. FFmpeg prepare ou enregistre un morceau video.
10. Le morceau peut etre envoye vers Google Drive si la configuration existe.
11. Le service IA analyse le segment.
12. Les evenements sont envoyes au frontend avec Socket.IO.
13. Le frontend met a jour la timeline.
14. Les resultats sont sauvegardes dans MongoDB.
15. Le statut de la video passe a `done`.

## 11. Intelligence Artificielle

Le projet integre une couche IA organisee autour de deux fonctions :

- `spot` pour la detection d'actions.
- `summarize` pour le resume.

Dans l'etat actuel, l'inference est simulee. Cela signifie que le systeme genere des evenements et des resumes de maniere controlee afin de tester toute la chaine applicative. Cette approche permet de valider :

- L'ajout des videos.
- La preparation video.
- Le lancement de l'analyse.
- L'affichage temps reel.
- La timeline.
- La sauvegarde des resultats.
- La gestion des quotas.

L'architecture reste prete pour remplacer cette simulation par un vrai modele de machine learning.

## 12. Securite

Le projet integre plusieurs mecanismes de securite :

- Connexion via Google OAuth.
- Verification de l'email utilisateur.
- Liste d'emails approuves via variable d'environnement.
- Domaine email approuve via variable d'environnement.
- Roles `user` et `admin`.
- Middleware `requireAuth` pour proteger les routes.
- Middleware `requireAdmin` pour proteger les routes administrateur.
- Blocage et deblocage des utilisateurs.
- Protection contre le blocage accidentel des comptes administrateur.
- Quotas pour limiter l'utilisation des analyses.
- Filtrage des fichiers uploades avec Multer.
- Acceptation uniquement des fichiers video.
- Taille maximale d'upload limitee a 100 MB.
- CORS configure avec `CLIENT_ORIGIN`.
- Variables d'environnement pour les secrets et configurations.

Remarque importante : dans l'etat actuel du code, le token applicatif est encode en Base64. Pour une version de production, il est recommande d'utiliser un vrai JWT signe avec `JWT_SECRET`, une date d'expiration, HTTPS et une strategie de stockage plus securisee.

## 13. API Principale

### Authentification

- `POST /api/auth/google` : connexion Google.
- `GET /api/auth/me` : recuperer l'utilisateur courant.
- `GET /api/auth/users` : lister les utilisateurs, admin uniquement.
- `POST /api/auth/users` : creer un utilisateur, admin uniquement.
- `PATCH /api/auth/users/:email/block` : bloquer un utilisateur.
- `PATCH /api/auth/users/:email/unblock` : debloquer un utilisateur.
- `POST /api/auth/logout` : deconnexion.

### Videos

- `GET /api/videos` : lister les videos.
- `POST /api/videos/upload` : uploader une video.
- `POST /api/videos/youtube` : ajouter une video YouTube.
- `POST /api/videos/stream` : ajouter un flux.
- `DELETE /api/videos/:id` : supprimer une video.
- `GET /api/videos/actions/classes` : lister les classes d'actions.
- `GET /api/videos/summarization/models` : lister les modeles de resume.
- `POST /api/videos/inference/start` : lancer une analyse.
- `PUT /api/videos/:id/inference` : sauvegarder un resultat d'analyse.
- `GET /api/videos/quota` : consulter le quota.
- `GET /api/videos/admin/overview` : statistiques admin.
- `PUT /api/videos/admin/quota/:email` : modifier un quota.
- `GET /api/videos/admin/quotas` : lister tous les quotas.

## 14. Communication Temps Reel

Socket.IO est utilise pour envoyer les evenements en direct au frontend.

Evenements principaux :

- `inference:started`
- `inference:event`
- `inference:playhead`
- `inference:summary`
- `inference:completed`
- `inference:error`
- `quota_update`

Cela permet une experience plus fluide : l'utilisateur voit les resultats apparaitre sans recharger la page.

## 15. Deploiement

Le projet contient une configuration Docker avec :

- Un service backend.
- Un service frontend.
- Un service MongoDB.
- Un service Redis.
- Un service Nginx optionnel pour la production.

### Lancement En Developpement

Installer les dependances :

```bash
npm install
cd client
npm install
cd ../server
npm install
```

Lancer le client et le serveur :

```bash
npm run dev
```

Acces :

- Frontend : `http://localhost:5173`
- Backend : `http://localhost:5000`
- Health check : `http://localhost:5000/api/health`

### Lancement Avec Docker

```bash
docker compose up --build
```

En Docker :

- Frontend : `http://localhost:3000`
- Backend : `http://localhost:5000`
- MongoDB : `localhost:27017`
- Redis : `localhost:6379`

## 16. Variables D'Environnement

Exemples de variables necessaires :

```env
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017/soccer_analysis
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
JWT_SECRET=your-jwt-secret
GOOGLE_DRIVE_FOLDER_ID=your-folder-id
DAILY_QUOTA=10
WEEKLY_QUOTA=40
MONTHLY_QUOTA=120
ADMIN_EMAILS=admin@example.com
APPROVED_EMAILS=user@example.com
APPROVED_DOMAIN=example.com
```

## 17. Avantages De La Solution

La plateforme presente plusieurs avantages :

- Gain de temps dans l'analyse des matchs.
- Centralisation des videos.
- Support de plusieurs sources video.
- Interface moderne et intuitive.
- Visualisation des actions sur une timeline.
- Resultats en temps reel.
- Systeme de roles et d'administration.
- Gestion des quotas.
- Architecture extensible.
- Possibilite d'integrer un vrai modele IA.
- Deploiement possible avec Docker.
- Stockage structure avec MongoDB.
- Traitement video avec FFmpeg.

## 18. Limites Actuelles

Certaines parties sont encore perfectibles :

- L'inference IA est actuellement simulee.
- Le token d'authentification doit etre remplace par un JWT signe en production.
- Redis est prevu dans Docker mais pas encore pleinement exploite.
- Certains schemas comme `Event` peuvent etre enrichis pour stocker les evenements dans une collection separee.
- Des tests automatises peuvent etre ajoutes.
- La gestion avancee des sessions peut etre amelioree.

## 19. Ameliorations Futures

Les ameliorations possibles sont :

- Integration d'un vrai modele de detection d'actions sportives.
- Ajout d'une collection dediee aux evenements detectes.
- Export des resultats en PDF, CSV ou JSON.
- Tableau statistique plus avance.
- Analyse par equipe et par joueur.
- Support multi-langue.
- Notifications utilisateur.
- Historique detaille des analyses.
- Systeme de files d'attente pour les traitements lourds.
- Utilisation complete de Redis pour les jobs et le cache.
- Securisation complete avec JWT signe, refresh token et HTTPS.

## 20. Conclusion

Ce PFE propose une solution complete pour l'analyse video de football. Il combine une interface web moderne, une API backend structuree, une base de donnees MongoDB, un traitement video avec FFmpeg, une communication temps reel avec Socket.IO et une couche IA prete a evoluer vers un vrai modele.

La solution repond a un besoin concret : faciliter l'identification, l'organisation et l'exploitation des actions importantes dans une video de football. Elle offre une base solide pour une plateforme professionnelle d'analyse sportive, avec une architecture claire, extensible et adaptee aux evolutions futures.
