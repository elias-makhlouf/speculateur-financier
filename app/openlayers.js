import './openlayers.css';                       // Import du style CSS d'OpenLayers
import 'ol/ol.css';                              // Import des styles de base OpenLayers

import { Map, View } from 'ol';                  // Import des classes Map et View
import TileLayer from 'ol/layer/Tile';          // Couches tuiles (OSM, ESRI, etc.)
import ImageLayer from 'ol/layer/Image';        // Couches image (WMS)
import VectorLayer from 'ol/layer/Vector';      // Couches vecteur (GeoJSON)

import OSM from 'ol/source/OSM';                // Source OpenStreetMap
import XYZ from 'ol/source/XYZ';                // Source XYZ (ex. ESRI)
import ImageWMS from 'ol/source/ImageWMS';      // Source WMS
import VectorSource from 'ol/source/Vector';    // Source vecteur (GeoJSON, WFS)

import GeoJSON from 'ol/format/GeoJSON';        // Format GeoJSON pour vecteurs

import { Circle, Fill, Stroke, Style } from 'ol/style';   // Styles pour vecteurs
import { ScaleLine } from 'ol/control';                   // Contrôle ligne d’échelle
import { fromLonLat } from 'ol/proj';                     // Conversion coordonnées lon/lat → projection

/* STYLES */
function styleDeals(feature) {                     // Style des cercles représentant les deals
  const surface = feature.get('surface_ha');       // Récupère la surface du deal
  const radius = Math.sqrt(surface) * 0.04;        // Calcule rayon proportionnel
  return new Style({
    image: new Circle({
      radius: Math.max(4, Math.min(radius, 30)),  // Limite le rayon entre 4 et 30px
      fill: new Fill({ color: 'rgba(231, 111, 81, 0.6)' }), // Couleur remplissage
      stroke: new Stroke({ color: '#e76f51', width: 1 })    // Bordure cercle
    })
  });
}

/* SOURCES & LAYERS */
const coucheOSM = new TileLayer({ source: new OSM(), visible: true });    // Couche OSM visible par défaut
const coucheESRI = new TileLayer({                                       // Couche satellite ESRI
  source: new XYZ({ url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' }),
  visible: false
});

const wmsUrl = 'http://localhost:8080/geoserver/land_matrix_agri/wms'; // URL WMS locale
const wfsUrl = 'http://localhost:8080/geoserver/land_matrix_agri/ows'; // URL WFS locale

const dealsByCountrySource = new ImageWMS({ url: wmsUrl, params: { LAYERS: 'land_matrix_agri:deals_by_country' }, serverType: 'geoserver' }); // WMS Pays
const dealsByCountryLayer = new ImageLayer({ source: dealsByCountrySource, visible: true }); // Couche WMS visible

const dealsSource = new VectorSource({                                   // Source WFS pour deals
  format: new GeoJSON(),
  url: wfsUrl + '?service=WFS&version=1.0.0&request=GetFeature&typeName=land_matrix_agri:deals&outputFormat=application/json'
});
const dealsLayer = new VectorLayer({ source: dealsSource, style: styleDeals, visible: true }); // Couche vecteur deals

/* MAP */
const map = new Map({
  target: 'map',                                                    
  layers: [coucheOSM, coucheESRI, dealsByCountryLayer, dealsLayer], // Toutes les couches
  view: new View({ center: fromLonLat([44, 23]), zoom: 2 }),        // Centre et zoom initiaux
  controls: [new ScaleLine()]                                       // Ajout échelle
});

/* VARIABLES GLOBALES */
const slider = document.getElementById('yearSlider');          // Slider année
const yearValue = document.getElementById('yearValue');        // Affichage valeur année
const resetButton = document.getElementById('resetYear');      // Bouton reset
let selectedYear = null;                                       // Année sélectionnée
let selectedContinent = null;                                  // Continent sélectionné
let continentChart = null;                                     // Graphique barres

/* CONTINENTS EXTENTS */
const continentExtents = {                                     // Coordonnées par continent 
  Americas: [-105, -50, 20, 13],
  Africa: [-21.269531,-31.724326,105.292969,30.073002],
  Asia: [91.977539,-20.590567,218.540039,40.213326],
  Europe : [13, 25, 139, 67],
  World: [-85, -60, 180, 75]
};

// Boutons associés à leurs coordonnées 
const continentMapping = {
  Americas: ["Latin America and the Caribbean"],
  Europe: ["Eastern Europe"],
  Africa: ["Africa"],
  Asia: ["Asia"],
  World: ["Latin America and the Caribbean", "Eastern Europe", "Asia", "Africa"]
};

function zoomToContinent(continent) {                            // Zoom sur un continent
  const e = continentExtents[continent];
  const bottomLeft = fromLonLat([e[0], e[1]]);                   // Coin bas-gauche
  const topRight   = fromLonLat([e[2], e[3]]);                   // Coin haut-droit
  const extent = [bottomLeft[0], bottomLeft[1], topRight[0], topRight[1]];
  map.getView().fit(extent, { padding: [50, 50, 50, 50], duration: 1000 }); // Ajuste la vue
}

/* FILTRAGE DEALS + LÉGENDE + GRAPHIQUE */
function filterDeals() {
  dealsLayer.setStyle(feature => {                                                  // Style dynamique selon filtre
    const matchYear = !selectedYear || feature.get('created_at') === selectedYear;  // Vérifie année
    const allowedRegions = continentMapping[selectedContinent || "World"];
    const matchContinent = allowedRegions.includes(feature.get('region'));          // Vérifie continent
    return (matchYear && matchContinent) ? styleDeals(feature) : null;              // Masque sinon
  });

  updateDynamicLegend(selectedYear);                            // Met à jour légende cercle
  updateBarChart(selectedYear, selectedContinent);              // Met à jour graphique
}

/* LÉGENDE CERCLE */
function updateDynamicLegend(year) {
  const extent = map.getView().calculateExtent(map.getSize());        // Étendue visible
  const features = dealsSource.getFeatures().filter(f => {            // Filtre features visibles et année
    const geom = f.getGeometry();                                     // Récupère la géométrie (pour nous, un point)
    return geom.intersectsExtent(extent) && (!year || f.get('created_at') === year);  // Vérifie si la géométrie est visible sur la carte affiché à l'écran (donc avec l'année aussi)
  });

  const circle = document.getElementById('dynamicCircle');            // Cercle dynamique
  const label = document.getElementById('dynamicLabel');              // Label surface

  if (features.length === 0) {                                // Si rien visible
    label.textContent = "Aucun deals visible";
    circle.style.width = "0px"; circle.style.height = "0px";
    return;
  }

  const maxSurface = Math.max(...features.map(f => f.get('surface_ha'))); // Surface max
  const radius = Math.sqrt(maxSurface) * 0.04;                        // Rayon proportionnel
  const clamped = Math.max(4, Math.min(radius, 30));                  // Clamp min/max
  circle.style.width = circle.style.height = clamped * 2 + 'px';      // Taille cercle
  label.textContent = `${Math.round(maxSurface).toLocaleString()} ha`;// Texte label
}

/* GRAPHIQUE EN BARRE (Une partie qui nous a demandé du fil à retordre !)*/
function updateBarChart(year, continent) {
  const allowedRegions = continentMapping[continent || "World"];      // Filtre régions
  const features = dealsSource.getFeatures().filter(f => {            // Filtre features
    const matchYear = !year || f.get('created_at') === year;          // Matcher avec l'année 
    const matchContinent = !continent || continent === 'World' || allowedRegions.includes(f.get('region')); // Matcher avec les régions
    return matchYear && matchContinent;
  });

  const surfaceByCountry = {};                                   // Calcul surface par pays
  features.forEach(f => {                                        // Boucle : Pour chaque feature
    const code = f.get('code_alpha3') || 'N/A';                  // Récupère le code pays alpha-3, ou 'N/A' si absent
    surfaceByCountry[code] = (surfaceByCountry[code] || 0) + f.get('surface_ha');  // Calcul de la somme : Si ce pays existe déjà dans l’objet, prend sa valeur actuelle (sinon 0) et ajoute 
  });

const labels = Object.keys(surfaceByCountry);          // Récupère tous les codes pays pour les étiquettes du graphique
const data = Object.values(surfaceByCountry);          // Récupère les surfaces correspondantes pour chaque pays
const ctx = document.getElementById('continentChart').getContext('2d'); // Récupère tous elements permettant le graphique (avec getContext())

  if (continentChart) {                                          // Mise à jour graphique existant
    continentChart.data.labels = labels;
    continentChart.data.datasets[0].data = data;
    continentChart.update();
  } else {                                                       // Création graphique
    continentChart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Surface (ha)', data, backgroundColor: 'rgba(231,111,81,0.6)', borderColor: '#e76f51', borderWidth:1 }] },
      options: { responsive:false, plugins:{ legend:{ display:false } }, scales:{ y:{ beginAtZero:true } } }
    });
  }
}

/* SLIDER ANNÉE */
yearValue.textContent = "Aucune sélection";                     // Texte initial
slider.value = slider.min;                                       // Slider au min

slider.addEventListener('input', () => {                        // Quand slider bouge
  selectedYear = parseInt(slider.value);                        // Met à jour année
  yearValue.textContent = selectedYear;
  filterDeals();                                                 // Rafraîchit cartes/graphique
});

resetButton.addEventListener('click', () => {                    // Réintilisation de l'année
  selectedYear = null;
  yearValue.textContent = "Aucune sélection";
  slider.value = slider.min;
  filterDeals();
});

/* BOUTONS CONTINENT */
document.querySelectorAll('.continent-buttons button').forEach(btn => {
  btn.addEventListener('click', () => {                          // Filtre par continent
    selectedContinent = btn.dataset.continent;
    zoomToContinent(selectedContinent);                         // Zoomer sur la selection selon bbox qu'on a définit en haut
    filterDeals();
  });
});

/* FONDS DE CARTE */
document.getElementById('baseOSM').addEventListener('change', () => { coucheOSM.setVisible(true); coucheESRI.setVisible(false); }); // Basculer OSM
document.getElementById('baseESRI').addEventListener('change', () => { coucheOSM.setVisible(false); coucheESRI.setVisible(true); }); // Basculer ESRI

// Gestion visibilité des couches
document.getElementById('toggleWFS').addEventListener('change', e => {
  dealsLayer.setVisible(e.target.checked);                      // Affiche/masque WFS

  const display = e.target.checked ? 'block' : 'none';
  document.getElementById('dynamicCircle').parentElement.style.display = display; // légende cercle
  document.getElementById('continentChart').style.display = display;              // graphique
  document.getElementById('dynamicCircleTitle').style.display = display;
});

document.getElementById('toggleWMS').addEventListener('change', e => {
  dealsByCountryLayer.setVisible(e.target.checked);              // Affiche/masque WMS

  const display = e.target.checked ? 'block' : 'none';
  document.getElementById('legendWMS').parentElement.style.display = display;     // légende WMS
});

/* CLIC SUR FEATURES */
map.on('singleclick', evt => {                                   // Quand on clique sur des features
  const features = map.getFeaturesAtPixel(evt.pixel);           // on récupère features
  const container = document.getElementById('attributesContent');
  container.innerHTML = '';

  if (!features.length) { container.innerHTML = '<p>Aucun deal sélectionné</p>'; return; }

  features.forEach(f => {                                        // et on affiche ses attributs ; pour cela on initie une boucle
    const props = f.getProperties();                            // Permet de récuperér les valeurs
    const div = document.createElement('div');
    div.className = 'deal-card';                                  // Attribue une classe CSS pour le style du "card" affichant le deal
    div.innerHTML = `
      <strong>Pays :</strong> ${props.country || 'N/A'}<br>       
      <strong>Surface :</strong> ${props.surface_ha} ha<br>
      <strong>Année :</strong> ${props.created_at}<br>
      <strong>Type :</strong> ${props.crops}
    `;
    container.appendChild(div);
  });
});

/* LÉGENDE WMS */
function updateWmsLegend() {                                      // Met à jour légende WMS
  const resolution = map.getView().getResolution();
  document.getElementById('legendWMS').src = dealsByCountrySource.getLegendUrl(resolution);
}
map.getView().on('change:resolution', updateWmsLegend);           // Quand zoom change
updateWmsLegend();

/* LÉGENDE + DÉPLACEMENT */
map.getView().on('change:resolution', () => { updateDynamicLegend(selectedYear); }); // Redessine cercle
map.on('moveend', () => { updateDynamicLegend(selectedYear); });                    // Redessine cercle après déplacement

/* FILTRAGE INITIAL */
dealsSource.once('change', () => { filterDeals(); });              // Filtrage au chargement WFS

/* RETOUR AU MENU */
document.getElementById('backToMenu').addEventListener('click', () => {
    window.location.href = 'index.html';                          // Retour page accueil
});

/* CONSEIL D'INVESTISSEUR */
const tipButton = document.getElementById('tipButton');          // Bouton conseil
const tipPanel = document.getElementById('tipPanel');            // Panel conseil
const tipText = document.getElementById('tipText');              // Texte conseil
const closeTip = document.getElementById('closeTip');            // Bouton fermer

const investmentTips = {
    Americas: "Le Chili est en pleine expansion depuis 2025, surtout dans les surfaces agricoles intensives – à surveiller de près. Le Brésil et l’Argentine restent des marchés stables mais moins dynamiques, parfaits pour les placements sûrs. Le Paraguay, en revanche, devient un hotspot émergent : volumes en forte hausse et potentiel de rendement élevé pour les investisseurs audacieux.",
    Africa: "Les leaders actuels sont le Soudan, la République du Congo et la République Démocratique du Congo, où les surfaces agricoles investies affichent des taux exceptionnels. L’Éthiopie est en train de devenir un terrain de jeu stratégique, avec un nombre de deals qui explose ces dernières années. Depuis 2020, le Nord de l’Afrique attire de plus en plus l’attention des investisseurs – opportunité à long terme pour les plantations résilientes au climat et les projets à impact social.", 
    Asia: "L’Indonésie domine le marché avec plus de 150 000 hectares investis, un véritable eldorado pour les investisseurs en huile de palme et autres cultures tropicales. Le Cambodge voit également son nombre de deals augmenter, signe d’une émergence à surveiller. La Chine reste sélective : peu de deals mais très vastes en superficie – un jeu à haut risque mais potentiellement très rentable. Restez attentifs aux régulations locales, elles peuvent faire ou défaire vos marges.",
    Europe: "L’Ukraine reste le grenier à blé incontournable – investissements sûrs mais la concurrence est féroce. La Russie avait un rythme croissant entre 2020 et 2021, mais les tensions politiques ont réduit les opportunités récentes. L’Ouzbékistan émerge lentement, offrant une fenêtre d’entrée intéressante avant que le marché ne sature. Les cultures céréalières et l’infrastructure agricole sont des paris stables, mais il faut bien calibrer son timing.",
    World: "Diversifiez vos investissements selon la région et l’année des deals. Analysez les tendances locales pour réduire le risque. Filtrer par continent pour voir toutes nos recommandations et repérer les hotspots émergents avant les autres acteurs du marché."
};

// Ouvrir le panel
tipButton.addEventListener('click', () => {
    tipPanel.style.display = tipPanel.style.display === 'block' ? 'none' : 'block'; // Toggle panel
    updateTipText(selectedContinent || "World");                                    // Met à jour texte
});

// Fermer le panel
closeTip.addEventListener('click', () => { tipPanel.style.display = 'none'; }); // Fermer panel

// Mettre à jour le conseil selon le continent
function updateTipText(continent) { tipText.textContent = investmentTips[continent] || investmentTips["World"]; } // Affiche le conseil du continent ou le conseil global

// TipText prend un continent en paramètre.
// investmentTips[continent] récupère le conseil correspondant dans l’objet investmentTips.
// si le continent n’a pas de conseil (par ex. à l'état initiale), on affiche le conseil global “World”.
// tipText.textContent = … : met à jour le texte visible dans le panel HTML.

// Quand on change de continent
document.querySelectorAll('.continent-buttons button').forEach(btn => {
    btn.addEventListener('click', () => {
        selectedContinent = btn.dataset.continent;      // Récupère le continent du bouton cliqué
        zoomToContinent(selectedContinent);             // Zoom sur l'étendue du continent
        filterDeals();                                  // Mise à jour cartes/graphique
        updateTipText(selectedContinent);               // Mise à jour conseil
    });
});
