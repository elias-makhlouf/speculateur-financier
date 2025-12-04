import './style.css';
import {Map, View} from 'ol';
import { ImageWMS } from 'ol/source';
import TileLayer from 'ol/layer/Tile';
import ImageLayer from 'ol/layer/Image';
import OSM from 'ol/source/OSM';

const couche_osm = new TileLayer({ source: new OSM() });

const ma_source = new ImageWMS({
  url: 'https://ahocevar.com/geoserver/wms',
  params: {'LAYERS' : 'topp:states' },
  serverType: 'geoserver',
});

const ma_couche = new ImageLayer({
  source: ma_source,
});

const map = new Map({
  target: 'map',
  layers: [ couche_osm, ma_couche ],
  view: new View({
    center: [0, 0],
    zoom: 2
  })
});

