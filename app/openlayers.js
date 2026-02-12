import './openlayers.css';
import 'ol/ol.css';

import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import ImageLayer from 'ol/layer/Image';
import VectorLayer from 'ol/layer/Vector';

import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import ImageWMS from 'ol/source/ImageWMS';
import VectorSource from 'ol/source/Vector';

import GeoJSON from 'ol/format/GeoJSON';

import { Circle, Fill, Stroke, Style } from 'ol/style';
import { ScaleLine } from 'ol/control';
import { fromLonLat } from 'ol/proj';

/* ===================== */
/* STYLES                 */
/* ===================== */
function styleDeals(feature) {
  const surface = feature.get('surface_ha');
  const radius = Math.sqrt(surface) * 0.04;
  return new Style({
    image: new Circle({
      radius: Math.max(4, Math.min(radius, 30)),
      fill: new Fill({ color: 'rgba(231, 111, 81, 0.6)' }),
      stroke: new Stroke({ color: '#e76f51', width: 1 })
    })
  });
}

/* ===================== */
/* SOURCES & LAYERS       */
/* ===================== */
const coucheOSM = new TileLayer({ source: new OSM(), visible: true });
const coucheESRI = new TileLayer({
  source: new XYZ({ url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' }),
  visible: false
});

const wmsUrl = 'http://localhost:8080/geoserver/land_matrix_agri/wms';
const wfsUrl = 'http://localhost:8080/geoserver/land_matrix_agri/ows';

const dealsByCountrySource = new ImageWMS({ url: wmsUrl, params: { LAYERS: 'land_matrix_agri:deals_by_country' }, serverType: 'geoserver' });
const dealsByCountryLayer = new ImageLayer({ source: dealsByCountrySource, visible: true });

const dealsSource = new VectorSource({
  format: new GeoJSON(),
  url: wfsUrl + '?service=WFS&version=1.0.0&request=GetFeature&typeName=land_matrix_agri:deals&outputFormat=application/json'
});
const dealsLayer = new VectorLayer({ source: dealsSource, style: styleDeals, visible: true });

/* ===================== */
/* MAP                    */
/* ===================== */
const map = new Map({
  target: 'map',
  layers: [coucheOSM, coucheESRI, dealsByCountryLayer, dealsLayer],
  view: new View({ center: fromLonLat([44, 23]), zoom: 2 }),
  controls: [new ScaleLine()]
});

/* ===================== */
/* VARIABLES GLOBALES      */
/* ===================== */
const slider = document.getElementById('yearSlider');
const yearValue = document.getElementById('yearValue');
const resetButton = document.getElementById('resetYear');
let selectedYear = null; 
let selectedContinent = null; 
let continentChart = null;

/* ===================== */
/* CONTINENTS EXTENTS      */
/* ===================== */
const continentExtents = {
  Americas: [-105, -50, 20, 13],
  Africa: [-21.269531,-31.724326,105.292969,30.073002],
  Asia: [91.977539,-20.590567,218.540039,40.213326],
  Europe : [13, 25, 139, 67],
  World: [-85, -60, 180, 75]
};

// mapping bouton → valeur réelle dans les données
const continentMapping = {
  Americas: ["Latin America and the Caribbean"],
  Europe: ["Eastern Europe"],
  Africa: ["Africa"],
  Asia: ["Asia"],
  World: ["Latin America and the Caribbean", "Eastern Europe", "Asia", "Africa"]
};

function zoomToContinent(continent) {
  const e = continentExtents[continent];
  const bottomLeft = fromLonLat([e[0], e[1]]); // minLon, minLat
  const topRight   = fromLonLat([e[2], e[3]]); // maxLon, maxLat
  const extent = [
    bottomLeft[0], bottomLeft[1],
    topRight[0], topRight[1]
  ];
  map.getView().fit(extent, { padding: [50, 50, 50, 50], duration: 1000 });
}

/* ===================== */
/* FILTRAGE DEALS + LÉGENDE + GRAPHIQUE */
/* ===================== */
function filterDeals() {
  dealsLayer.setStyle(feature => {
    const matchYear = !selectedYear || feature.get('created_at') === selectedYear;
    const allowedRegions = continentMapping[selectedContinent || "World"];
    const matchContinent = allowedRegions.includes(feature.get('region'));
    return (matchYear && matchContinent) ? styleDeals(feature) : null;
  });

  updateDynamicLegend(selectedYear);
  updateBarChart(selectedYear, selectedContinent);
}

/* ===================== */
/* LÉGENDE CERCLE         */
/* ===================== */
function updateDynamicLegend(year) {
  const extent = map.getView().calculateExtent(map.getSize());
  const features = dealsSource.getFeatures().filter(f => {
    const geom = f.getGeometry();
    return geom.intersectsExtent(extent) && (!year || f.get('created_at') === year);
  });

  const circle = document.getElementById('dynamicCircle');
  const label = document.getElementById('dynamicLabel');

  if (features.length === 0) {
    label.textContent = "Aucun deals visible";
    circle.style.width = "0px"; circle.style.height = "0px";
    return;
  }

  const maxSurface = Math.max(...features.map(f => f.get('surface_ha')));
  const radius = Math.sqrt(maxSurface) * 0.04;
  const clamped = Math.max(4, Math.min(radius, 30));
  circle.style.width = circle.style.height = clamped * 2 + 'px';
  label.textContent = `${Math.round(maxSurface).toLocaleString()} ha`;
}

/* ===================== */
/* GRAPHIQUE BARRES       */
/* ===================== */
function updateBarChart(year, continent) {
  const allowedRegions = continentMapping[continent || "World"]; // récupère les vrais noms
  const features = dealsSource.getFeatures().filter(f => {
    const matchYear = !year || f.get('created_at') === year;
    const matchContinent = !continent || continent === 'World' || allowedRegions.includes(f.get('region'));
    return matchYear && matchContinent;
  });

  const surfaceByCountry = {};
  features.forEach(f => {
    const code = f.get('code_alpha3') || 'N/A';
    surfaceByCountry[code] = (surfaceByCountry[code] || 0) + f.get('surface_ha');
  });

  const labels = Object.keys(surfaceByCountry);
  const data = Object.values(surfaceByCountry);
  const ctx = document.getElementById('continentChart').getContext('2d');

  if (continentChart) {
    continentChart.data.labels = labels;
    continentChart.data.datasets[0].data = data;
    continentChart.update();
  } else {
    continentChart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Surface (ha)', data, backgroundColor: 'rgba(231,111,81,0.6)', borderColor: '#e76f51', borderWidth:1 }] },
      options: { responsive:false, plugins:{ legend:{ display:false } }, scales:{ y:{ beginAtZero:true } } }
    });
  }
}


/* ===================== */
/* SLIDER ANNÉE           */
/* ===================== */
yearValue.textContent = "Aucune sélection";
slider.value = slider.min;

slider.addEventListener('input', () => {
  selectedYear = parseInt(slider.value);
  yearValue.textContent = selectedYear;
  filterDeals();
});

resetButton.addEventListener('click', () => {
  selectedYear = null;
  yearValue.textContent = "Aucune sélection";
  slider.value = slider.min;
  filterDeals();
});

/* ===================== */
/* BOUTONS CONTINENT       */
/* ===================== */
document.querySelectorAll('.continent-buttons button').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedContinent = btn.dataset.continent;
    zoomToContinent(selectedContinent);
    filterDeals();
  });
});

/* ===================== */
/* FONDS DE CARTE         */
/* ===================== */
document.getElementById('baseOSM').addEventListener('change', () => { coucheOSM.setVisible(true); coucheESRI.setVisible(false); });
document.getElementById('baseESRI').addEventListener('change', () => { coucheOSM.setVisible(false); coucheESRI.setVisible(true); });

// document.getElementById('toggleWMS').addEventListener('change', e => { dealsByCountryLayer.setVisible(e.target.checked); });
// document.getElementById('toggleWFS').addEventListener('change', e => { dealsLayer.setVisible(e.target.checked); });

// Gestion visibilité des couches
document.getElementById('toggleWFS').addEventListener('change', e => {
  dealsLayer.setVisible(e.target.checked);

  // Masquer/afficher légende cercle + graphique
  const display = e.target.checked ? 'block' : 'none';
  document.getElementById('dynamicCircle').parentElement.style.display = display; // légende cercle
  document.getElementById('continentChart').style.display = display;                // graphique
  document.getElementById('dynamicCircleTitle').style.display = display;
});

document.getElementById('toggleWMS').addEventListener('change', e => {
  dealsByCountryLayer.setVisible(e.target.checked);

  // Masquer/afficher légende WMS
  const display = e.target.checked ? 'block' : 'none';
  document.getElementById('legendWMS').parentElement.style.display = display;
});


/* ===================== */
/* CLIC SUR FEATURES       */
/* ===================== */
map.on('singleclick', evt => {
  const features = map.getFeaturesAtPixel(evt.pixel);
  const container = document.getElementById('attributesContent');
  container.innerHTML = '';

  if (!features.length) { container.innerHTML = '<p>Aucun deal sélectionné</p>'; return; }

  features.forEach(f => {
    const props = f.getProperties();
    const div = document.createElement('div');
    div.className = 'deal-card';
    div.innerHTML = `
      <strong>Pays :</strong> ${props.country || 'N/A'}<br>
      <strong>Surface :</strong> ${props.surface_ha} ha<br>
      <strong>Année :</strong> ${props.created_at}<br>
      <strong>Type :</strong> ${props.crops}
    `;
    container.appendChild(div);
  });
});

/* ===================== */
/* LÉGENDE WMS             */
/* ===================== */
function updateWmsLegend() {
  const resolution = map.getView().getResolution();
  document.getElementById('legendWMS').src = dealsByCountrySource.getLegendUrl(resolution);
}
map.getView().on('change:resolution', updateWmsLegend);
updateWmsLegend();

/* ===================== */
/* LÉGENDE + DÉPLACEMENT  */
/* ===================== */
map.getView().on('change:resolution', () => { updateDynamicLegend(selectedYear); });
map.on('moveend', () => { updateDynamicLegend(selectedYear); });

/* ===================== */
/* FILTRAGE INITIAL       */
/* ===================== */
dealsSource.once('change', () => { filterDeals(); });

/* ===================== */
/* RETOUR AU MENU       */
/* ===================== */

document.getElementById('backToMenu').addEventListener('click', () => {
    window.location.href = 'index.html'; // ou ton URL d'accueil
});


/* ===================== */
/* CONSEIL D'INVESTISSEUR       */
/* ===================== */

const tipButton = document.getElementById('tipButton');
const tipPanel = document.getElementById('tipPanel');
const tipText = document.getElementById('tipText');
const closeTip = document.getElementById('closeTip');

const investmentTips = {
    Americas: "Investissez dans l’agriculture durable en Amérique Latine. Privilégiez les cultures à forte demande locale et les partenariats avec des coopératives.",
    Africa: "En Afrique, concentrez-vous sur les cultures résilientes au climat et les projets à impact social. Vérifiez la consultation des communautés locales.",
    Asia: "En Asie, l’huile de palme et le riz offrent de fortes opportunités, mais attention aux réglementations environnementales strictes.",
    Europe: "Pour l’Europe de l’Est, les cultures céréalières et le développement d’infrastructures agricoles sont des secteurs stables.",
    World: "Diversifiez vos investissements selon la région et l’année des deals. Analysez les tendances locales pour réduire le risque. Filtrer par continent pour voir toutes nos recommandations"
};

// Ouvrir le panel
tipButton.addEventListener('click', () => {
    tipPanel.style.display = tipPanel.style.display === 'block' ? 'none' : 'block';
    updateTipText(selectedContinent || "World");
});

// Fermer le panel
closeTip.addEventListener('click', () => {
    tipPanel.style.display = 'none';
});

// Mettre à jour le conseil selon le continent
function updateTipText(continent) {
    tipText.textContent = investmentTips[continent] || investmentTips["World"];
}

// Quand on change de continent
document.querySelectorAll('.continent-buttons button').forEach(btn => {
    btn.addEventListener('click', () => {
        selectedContinent = btn.dataset.continent;
        zoomToContinent(selectedContinent);
        filterDeals();
        updateTipText(selectedContinent);
    });
});

