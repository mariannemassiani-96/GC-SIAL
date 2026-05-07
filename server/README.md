# SIAL API — Backend Atelier

API REST pour le portail SIAL Fabrication.  
Déployé sur : `atelier.apertura.corsica`

## Déploiement sur le serveur OVH

```bash
# 1. Se connecter en SSH
ssh user@votre-serveur-ovh

# 2. Cloner le repo (ou git pull si déjà cloné)
git clone https://github.com/mariannemassiani-96/GC-SIAL.git
cd GC-SIAL/server

# 3. Installer les dépendances
npm install

# 4. Configurer l'environnement
cp .env.example .env
nano .env
# → Changer JWT_SECRET (générer avec: openssl rand -hex 32)
# → Changer ADMIN_EMAIL et ADMIN_PASSWORD
# → PORT=3001

# 5. Lancer
npm start
# Ou avec pm2 pour que ça tourne en permanence :
npm install -g pm2
pm2 start index.js --name sial-api
pm2 save
pm2 startup
```

## Configuration Nginx (reverse proxy)

Ajouter dans la config Nginx du serveur :

```nginx
server {
    listen 443 ssl;
    server_name atelier.apertura.corsica;

    ssl_certificate /etc/letsencrypt/live/apertura.corsica/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/apertura.corsica/privkey.pem;

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        # Frontend Vercel ou statique
        proxy_pass https://gc-sial.vercel.app;
        proxy_set_header Host gc-sial.vercel.app;
    }
}
```

Puis : `sudo nginx -t && sudo systemctl reload nginx`

## DNS

Ajouter un enregistrement A dans votre zone DNS :
```
atelier.apertura.corsica  →  IP_SERVEUR_OVH
```

## API Endpoints

### Auth
- `POST /api/auth/login` — `{email, password}` → `{token, user}`
- `GET /api/auth/me` — infos utilisateur connecté

### Users (admin)
- `GET /api/users` — liste tous les utilisateurs
- `POST /api/users` — créer un utilisateur
- `PUT /api/users/:id` — modifier un utilisateur

### Data (générique pour toutes les apps)
- `GET /api/data/:app/:collection` — tous les documents
- `GET /api/data/:app/:collection/:docId` — un document
- `PUT /api/data/:app/:collection/:docId` — créer/modifier
- `DELETE /api/data/:app/:collection/:docId` — supprimer
- `PUT /api/data/:app/:collection` — import en masse (array)

### Monitoring
- `GET /api/health` — statut + compteurs
- `GET /api/activity` — journal d'activité (admin)

## Utilisateurs par défaut

Au premier lancement, un admin est créé avec les identifiants du `.env`.

Utilisateurs à créer ensuite :
| Email | Nom | Rôle |
|-------|-----|------|
| marianne@apertura.corsica | Marianne | admin |
| ange-joseph@apertura.corsica | Ange-Joseph | chef_atelier |
| marco@sial.fr | Marco | operateur |
| stagiaire1@sial.fr | Stagiaire 1 | stagiaire |
| stagiaire2@sial.fr | Stagiaire 2 | stagiaire |
