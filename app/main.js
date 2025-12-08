import './style.css';
import { Map, View } from 'ol';
import { ImageWMS } from 'ol/source';
import TileLayer from 'ol/layer/Tile';
import ImageLayer from 'ol/layer/Image';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON.js';
import VectorLayer from 'ol/layer/Vector';
import {Circle, Fill, Stroke, Style} from 'ol/style.js';

// --- Couche de base OSM ---
const couche_osm = new TileLayer({ 
  source: new OSM() 
});

// --- URL WMS de ton GeoServer ---
const wmsUrl = 'http://localhost:8080/geoserver/land_matrix/wms';
const owsUrl = 'http://localhost:8080/geoserver/land_matrix/ows';


// --- Couche 1 : deals ---
const deals_source = new ImageWMS({
  url: wmsUrl,
  params: { 'LAYERS': 'land_matrix:deals2' },
  serverType: 'geoserver',
});
const deals_layer = new ImageLayer({
  source: deals_source,
});

// --- Couche 2 : deals_by_country ---
const deals_by_country_source = new ImageWMS({
  url: wmsUrl,
  params: { 'LAYERS': 'land_matrix:deals_by_country2' },
  serverType: 'geoserver',
});
const deals_by_country_layer = new ImageLayer({
  source: deals_by_country_source,
});

// --- Couche 3 : deals_by_country_centroid ---
const deals_centroid_source = new ImageWMS({
  url: wmsUrl,
  params: { 'LAYERS': 'land_matrix:deals_by_country_centroid2' },
  serverType: 'geoserver',
});
const deals_centroid_layer = new ImageLayer({
  source: deals_centroid_source,
});

// --- Couche 4 :dealsByCountryCentroid - WFS ---
function getStyleCentroid(feature) {
  const nDeals = feature.get('n_deals');
  const rayon = Math.sqrt(nDeals) * 10;
  const style = new Style({
    image: new Circle({
      radius: rayon,
      fill: new Fill({ color: 'rgba(255, 150, 0, 0.5)'  }),
      stroke: new Stroke({ color: 'orange', width: 1 }),
    }),
  });
  return style;
}
const sourceCentroidWFS = new VectorSource({
  format: new GeoJSON(),
  url: owsUrl+'?service=WFS&version=1.0.0&request=GetFeature&typeName=land_matrix%3Adeals_by_country_centroid2&maxFeatures=50&outputFormat=application%2Fjson'
});

// const styleCentroid = new Style({
//   image: new Circle({
//     radius: 50,
//     fill: new Fill({color: 'rgba(255, 150, 0, 0.3)' }),
//     stroke: new Stroke({ color: 'orange', width: 2 }),
//   }),
// });

const layerCentroid = new VectorLayer({
  source: sourceCentroidWFS,
  style: getStyleCentroid
});

// --- Couche 5 :dealsByCountryCentroid - WFS - SURFACE ---
function getStyleCentroidSurface(feature) {
  const suface_ha = feature.get('suface_ha');
  const rayon = Math.sqrt(suface_ha) * 0.02;
  const style = new Style({
    image: new Circle({
      radius: rayon,
      fill: new Fill({ color: 'rgba(0, 255, 0, 0.5)'  }),
      stroke: new Stroke({ color: 'green', width: 1 }),
    }),
  });
  return style;
}
const sourceCentroidWFS_Surface = new VectorSource({
  format: new GeoJSON(),
  url: owsUrl+'?service=WFS&version=1.0.0&request=GetFeature&typeName=land_matrix%3Adeals_by_country_centroid2&maxFeatures=50&outputFormat=application%2Fjson'
});
const layerCentroidSurface = new VectorLayer({
  source: sourceCentroidWFS_Surface,
  style: getStyleCentroidSurface
});

// --- Création de la carte ---
const map = new Map({
  target: 'map',
  layers: [ 
    couche_osm,
    //deals_layer,
    //deals_by_country_layer,
    // deals_centroid_layer,
    layerCentroidSurface,
    layerCentroid,
  ],
  view: new View({
    center: [0, 0],
    zoom: 2,
  }),
});
