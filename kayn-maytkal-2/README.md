# Kayn Maytkal

Prototype PWA mobile-first pour trouver des restaurants, fast-foods, cafés et boulangeries proches de la position de l'utilisateur.

## Fonctionnalités
- Géolocalisation navigateur
- Recherche par nom/cuisine/adresse
- Filtres par catégorie et distance
- Tri par distance ou nom
- Carte interactive Leaflet + OpenStreetMap
- Itinéraire via Google Maps
- Favoris persistants avec localStorage
- Installation possible comme PWA
- Couleurs de marque : jaune + noir

## Lancer en local
La géolocalisation fonctionne mieux via `localhost` ou HTTPS.

```bash
python3 -m http.server 8080
```
Puis ouvrir `http://localhost:8080` depuis ce dossier.

## Source des lieux
L'application interroge l'API publique Overpass / OpenStreetMap. Les résultats dépendent des données disponibles dans OpenStreetMap.
