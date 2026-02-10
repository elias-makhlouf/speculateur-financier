import './openlayers.css';

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

const coucheOSM = new TileLayer({
  source: new OSM(),
  visible: true
});

const coucheESRI = new TileLayer({
  source: new XYZ({
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
  }),
  visible: false
});

const wmsUrl = 'http://localhost:8080/geoserver/land_matrix/wms';

const dealsByCountrySource = new ImageWMS({
  url: wmsUrl,
  params: {
    LAYERS: 'land_matrix:deals_by_country'
  },
  serverType: 'geoserver'
});

const dealsByCountryLayer = new ImageLayer({
  source: dealsByCountrySource,
  visible: true
});

function styleDeals(feature) {
  const surface = feature.get('surface_ha');
  const radius = Math.sqrt(surface) * 0.04;

  return new Style({
    image: new Circle({
      radius: Math.max(4, Math.min(radius, 30)),
      fill: new Fill({
        color: 'rgba(231, 111, 81, 0.6)'
      }),
      stroke: new Stroke({
        color: '#e76f51',
        width: 1
      })
    })
  });
}
const wfsUrl = 'http://localhost:8080/geoserver/land_matrix_agri/ows';

const dealsSource = new VectorSource({
  format: new GeoJSON(),
  url:
    wfsUrl +
    '?service=WFS&version=1.0.0&request=GetFeature' +
    '&typeName=land_matrix_agri:deals' +
    '&outputFormat=application/json'
});

const dealsLayer = new VectorLayer({
  source: dealsSource,
  style: styleDeals,
  visible: true
});

const map = new Map({
  target: 'map',
  layers: [
    coucheOSM,
    coucheESRI,
    dealsByCountryLayer,
    dealsLayer
  ],
  view: new View({
    center: fromLonLat([0, 0]),
    zoom: 2
  }),
  controls: [
    new ScaleLine()
  ]
});


const slider = document.getElementById('yearSlider');
const yearValue = document.getElementById('yearValue');

slider.addEventListener('input', () => {
  const year = parseInt(slider.value);
  yearValue.textContent = year;

  dealsLayer.setStyle(feature => {
    if (feature.get('created_at') === year) {
      return styleDeals(feature);
    }
    return null;
  });
});

document.getElementById('baseOSM').addEventListener('change', () => {
  coucheOSM.setVisible(true);
  coucheESRI.setVisible(false);
});

document.getElementById('baseESRI').addEventListener('change', () => {
  coucheOSM.setVisible(false);
  coucheESRI.setVisible(true);
});






