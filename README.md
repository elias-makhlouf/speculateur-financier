# AreaINVEST Analytics

**Description :**
Speculateur Financier est une application web permettant de visualiser différentes cartes interactives et données financières. L’application utilise GeoServer pour gérer et servir les données géospatiales et est entièrement packagée dans des conteneurs Docker pour un déploiement facile.

## Prérequis

* [Docker](https://www.docker.com/get-started) installé
* [Docker Compose](https://docs.docker.com/compose/) installé

## Installation

1. Clonez le dépôt :

```bash
git clone https://github.com/elias-makhlouf/speculateur-financier.git
cd speculateur-financier/app
```

2. Vérifiez la structure des fichiers :

```
speculateur financier/
├─ app/
│   └─ img/
│   └─ index.html
│   └─ leaflet.html
│   └─ openlayers.html
│   └─ index.css
│   └─ leaflet.css
│   └─ openlayers.css
│   └─ leaflet.js
│   └─ openlayers.js
├─ geoserver/
│   └─ opt/
│       └─ data/
├─ gitignore
├─ Caddyfile
└─ docker-compose.yml
```

---

## Application

Pour démarrer tous les conteneurs :

```bash
docker compose up -d
```
Pour arrêter les conteneurs :

```bash
docker compose down
```