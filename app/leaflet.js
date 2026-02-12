/***************************************************
 * Carte Leaflet – Investissements agricoles
 ***************************************************/

// --- Carte ---
var map = L.map('map', { center:[10,0], zoom:2 });              // Crée la carte Leaflet centrée sur [lat, lon] avec zoom 2

// --- Fonds de carte ---
var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', 
    { attribution:'© OpenStreetMap' }).addTo(map);              // Couche OpenStreetMap par défaut (avec les crédits)
var satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', 
    { attribution:'© Esri' });                                  // Couche satellite ESRI (avec les crédits)

// --- Fonctions couleur ---
function getColor(f){                                       // Fonction qui détermine la couleur d’un deal selon la culture
    var p = f.properties;                                   
    if(p.crop_oil_palm) return '#f4f006ff';               // Jaune pour huile de palme
    if(p.crop_soya_beans) return '#e6550d';               // Orange pour soja
    if(p.crop_sugar_cane) return '#ffc400ff';             // Jaune doré pour canne à sucre
    return '#363d7aff';                                   // Bleu foncé pour les autres
}
function getOAIColor(value){                                // Fonctione qui détermine la couleur d’un pays selon l’OAI
    if(value==null) return '#ccc';                        // Gris si pas de valeur
    if(value>1.5) return '#4dac26';                       // Vert foncé si OAI>1.5
    if(value>1) return '#b8e186';                         // Vert clair
    if(value>0.5) return '#f1b6da';                       // Rose clair
    if(value>0) return '#d01c8b';                         // Rose foncé
    return '#fdfdfdff';                                   // Blanc sinon
}

// --- Popup ---
function buildPopup(f){                                       // Crée le contenu HTML du popup pour chaque deal
    var p=f.properties;                                       
    return `<strong>Deal #${p.id}</strong><br/>
            Pays : ${p.country||'—'}<br/>
            Année : ${p.created_at||'—'}<br/>
            Surface : ${p.surface_ha? p.surface_ha.toLocaleString():'—'} ha<br/>
            Cultures : ${p.crops||'—'}<br/>
            Risques sociaux : ${p.negative_impacts_for_local_communities?'Oui':'Non'}`;  // Affiche 'Oui' si impact social
}

// --- Couche OAI ---
var oaiLayer = L.geoJSON(paysOAI, {                            // Crée une couche GeoJSON pour les pays avec OAI
    style: function(f){                                        // Style de chaque feature
        return { fillColor:getOAIColor(Number(f.properties.moyOAI)), 
                 weight:1, color:'#666', opacity:1, fillOpacity:0.4 }; 
    },
    onEachFeature: function(f,l){                             // Début de la boucle
        var oaiValue = Number(f.properties.moyOAI);           // Valeur OAI du pays
        l.bindPopup(`<strong>${f.properties.SOVEREIGNT}</strong><br/>OAI : ${!isNaN(oaiValue)?oaiValue.toFixed(2):'—'}`); // Popup
    }
}).addTo(map);                                                // Ajoute à la carte
map.attributionControl.addAttribution('FAOSTAT');             // Ajoute de la source de données 

// --- Couche deals (cercles fixes) ---
var dealsLayer = L.geoJSON(deals, {                          
    pointToLayer:function(f,latlng){                           // Convertit chaque point GeoJSON en cercle
        return L.circleMarker(latlng,{ 
            radius:5, fillColor:getColor(f), color:'#ffffffff', opacity:1, weight:0.5, fillOpacity:2 // Paramètre du point
        }); 
    },
    onEachFeature:function(f,l){ l.bindPopup(buildPopup(f)); }  // Associe un popup à chaque cercle
}).addTo(map);

// --- Forcer deals au-dessus ---
function bringDealsToFront(){ dealsLayer.bringToFront(); }        // Force l’affichage des cercles au-dessus des autres couches
map.on('overlayadd', function(e){                                 // Quand une couche  est ajoutée
    if(e.name==='Investissements agricoles') bringDealsToFront(); // Remet les deals au-dessus
});

// --- Contrôle couches ---
var baseMaps = {'OpenStreetMap':osm,'Satellite':satellite};  // Fonds de carte
var overlayMaps = {'Indice d’orientation agricole (OAI)':oaiLayer,'Investissements agricoles':dealsLayer}; // les couches de données de superpositions
L.control.layers(baseMaps, overlayMaps, { collapsed:true }).addTo(map); // Ajoute le contrôle des couches

// --- Gestion légendes HTML ---
var legendOAIDiv = document.getElementById('legendOAI');     // Initialisation de la légende OAI
var legendDealsDiv = document.getElementById('legendDeals');   // Initialisation de la légende deals

// Affichage initial selon l'état des couches
legendOAIDiv.style.display = map.hasLayer(oaiLayer) ? 'block' : 'none';       // Affiche si OAI visible
legendDealsDiv.style.display = map.hasLayer(dealsLayer) ? 'block' : 'none';   // Affiche si deals visible

map.on('overlayadd', e => {                     // Quand une couche de superposition/de données est activée
    if(e.name==='Indice d’orientation agricole (OAI)') legendOAIDiv.style.display='block';
    if(e.name==='Investissements agricoles') { 
        legendDealsDiv.style.display='block'; 
        bringDealsToFront();                   // alors on s'assure que les cercles deals restent au-dessus
    }
});

map.on('overlayremove', e => {                  // Quand une couche de données est désactivée
    if(e.name==='Indice d’orientation agricole (OAI)') legendOAIDiv.style.display='none';
    if(e.name==='Investissements agricoles') legendDealsDiv.style.display='none';
});

// --- Filtrage par secteur ---
var cropTypes = ['oilpalm','soy','sugarcane','other'];                      // Classes correspondant aux cultures dans l'ordre de la légende
document.querySelectorAll('#legendDeals .swatch').forEach((swatch,idx)=>{   // Pour chaque carré de couleur dans la légende
    swatch.addEventListener('click', ()=>{                                  // Quand on clique sur ce carré
        var cropClass=cropTypes[idx];                                        // Identifie la culture correspondant au carré

        dealsLayer.eachLayer(layer=>{                                        // Parcourt toutes les features de la couche deals
            var f=layer.feature.properties;                                  // Récupère les propriétés de la feature
            var show=false;                                                  // Variable pour savoir si le cercle doit être affiché

            if(cropClass==='oilpalm' && f.crop_oil_palm) show=true;         // Si filtrage huile de palme et feature correspondante
            if(cropClass==='soy' && f.crop_soya_beans) show=true;           // Si filtrage soja et feature correspondante
            if(cropClass==='sugarcane' && f.crop_sugar_cane) show=true;     // Si filtrage canne à sucre et feature correspondante
            if(cropClass==='other' && !f.crop_oil_palm && !f.crop_soya_beans && !f.crop_sugar_cane) show=true; // Autres cultures

            layer.setStyle({ opacity:show?1:0, fillOpacity:show?1:0 });      // Masque ou affiche le cercle selon le filtre
        });
    });
});

// --- Bouton Réinitialiser ---
document.getElementById('resetFilters').addEventListener('click', ()=>{ 
    dealsLayer.eachLayer(layer=> layer.setStyle({ opacity:1, fillOpacity:1 })); // Réinitialise tous les cercles visibles
});

// --- Bouton retour menu ---
document.getElementById('backToMenu').addEventListener('click', ()=>{ 
    window.location.href='index.html';                   // Redirige vers la page d’accueil
});