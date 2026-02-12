/***************************************************
 * Carte Leaflet – Investissements agricoles
 ***************************************************/

// --- Carte ---
var map = L.map('map', { center:[10,0], zoom:2 });

// --- Fonds de carte ---
var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OpenStreetMap' }).addTo(map);
var satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution:'© Esri' });

// --- Fonctions couleur ---
function getColor(f){
    var p = f.properties;
    if(p.crop_oil_palm) return '#f4f006ff';
    if(p.crop_soya_beans) return '#e6550d';
    if(p.crop_sugar_cane) return '#ffc400ff';
    return '#363d7aff';
}
function getOAIColor(value){
    if(value==null) return '#ccc';
    if(value>1.5) return '#4dac26';
    if(value>1) return '#b8e186';
    if(value>0.5) return '#f1b6da';
    if(value>0) return '#d01c8b';
    return '#fdfdfdff';
}

// --- Popup ---
function buildPopup(f){
    var p=f.properties;
    return `<strong>Deal #${p.id}</strong><br/>
            Pays : ${p.country||'—'}<br/>
            Année : ${p.created_at||'—'}<br/>
            Surface : ${p.surface_ha? p.surface_ha.toLocaleString():'—'} ha<br/>
            Cultures : ${p.crops||'—'}<br/>
            Risques sociaux : ${p.negative_impacts_for_local_communities?'Oui':'Non'}`;
}

// --- Couche OAI ---
var oaiLayer = L.geoJSON(paysOAI, {
    style: function(f){ return { fillColor:getOAIColor(Number(f.properties.moyOAI)), weight:1, color:'#666', opacity:1, fillOpacity:0.4 }; },
    onEachFeature: function(f,l){
        var oaiValue = Number(f.properties.moyOAI);
        l.bindPopup(`<strong>${f.properties.SOVEREIGNT}</strong><br/>OAI : ${!isNaN(oaiValue)?oaiValue.toFixed(2):'—'}`);
    }
}).addTo(map);
map.attributionControl.addAttribution('FAOSTAT');

// --- Couche deals (cercles fixes) ---
var dealsLayer = L.geoJSON(deals, {
    pointToLayer:function(f,latlng){ return L.circleMarker(latlng,{ radius:5, fillColor:getColor(f), color:'#ffffffff', opacity:1, weight:0.5, fillOpacity:2 }); },
    onEachFeature:function(f,l){ l.bindPopup(buildPopup(f)); }
}).addTo(map);

// --- Forcer deals au-dessus ---
function bringDealsToFront(){ dealsLayer.bringToFront(); }
setTimeout(bringDealsToFront,200);
map.on('overlayadd', function(e){ if(e.name==='Investissements agricoles') bringDealsToFront(); });

// --- Contrôle couches ---
var baseMaps = {'OpenStreetMap':osm,'Satellite':satellite};
var overlayMaps = {'Indice d’orientation agricole (OAI)':oaiLayer,'Investissements agricoles':dealsLayer};
L.control.layers(baseMaps, overlayMaps, { collapsed:true }).addTo(map);

// // --- Gestion légendes HTML ---
// var legendOAIDiv = document.getElementById('legendOAI');
// var legendDealsDiv = document.getElementById('legendDeals');
// map.on('overlayadd', e => {
//     if(e.name==='Indice d’orientation agricole (OAI)') legendOAIDiv.style.display='block';
//     if(e.name==='Investissements agricoles') { legendDealsDiv.style.display='block'; bringDealsToFront(); }
// });
// map.on('overlayremove', e => {
//     if(e.name==='Indice d’orientation agricole (OAI)') legendOAIDiv.style.display='none';
//     if(e.name==='Investissements agricoles') legendDealsDiv.style.display='none';
// });


// --- Gestion légendes HTML ---
var legendOAIDiv = document.getElementById('legendOAI');
var legendDealsDiv = document.getElementById('legendDeals');

// Affichage initial selon l'état des couches
legendOAIDiv.style.display = map.hasLayer(oaiLayer) ? 'block' : 'none';
legendDealsDiv.style.display = map.hasLayer(dealsLayer) ? 'block' : 'none';

map.on('overlayadd', e => {
    if(e.name==='Indice d’orientation agricole (OAI)') legendOAIDiv.style.display='block';
    if(e.name==='Investissements agricoles') { 
        legendDealsDiv.style.display='block'; 
        bringDealsToFront(); 
    }
});

map.on('overlayremove', e => {
    if(e.name==='Indice d’orientation agricole (OAI)') legendOAIDiv.style.display='none';
    if(e.name==='Investissements agricoles') legendDealsDiv.style.display='none';
});



// --- Filtrage par secteur ---
var cropTypes = ['oilpalm','soy','sugarcane','other'];
document.querySelectorAll('#legendDeals .swatch').forEach((swatch,idx)=>{
    swatch.addEventListener('click', ()=>{
        var cropClass=cropTypes[idx];
        dealsLayer.eachLayer(layer=>{
            var f=layer.feature.properties;
            var show=false;
            if(cropClass==='oilpalm' && f.crop_oil_palm) show=true;
            if(cropClass==='soy' && f.crop_soya_beans) show=true;
            if(cropClass==='sugarcane' && f.crop_sugar_cane) show=true;
            if(cropClass==='other' && !f.crop_oil_palm && !f.crop_soya_beans && !f.crop_sugar_cane) show=true;
            layer.setStyle({ opacity:show?1:0, fillOpacity:show?1:0 });
        });
    });
});

// --- Bouton Réinitialiser ---
document.getElementById('resetFilters').addEventListener('click', ()=>{
    dealsLayer.eachLayer(layer=> layer.setStyle({ opacity:1, fillOpacity:1 }));
});

// --- Bouton retour menu ---
document.getElementById('backToMenu').addEventListener('click', ()=>{ window.location.href='index.html'; });
