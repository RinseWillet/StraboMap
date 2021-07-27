//BASEMAPS

// Open Street Map tile layer as base map. The phrase .addTo(map) ensures this base map is displayed by default
var OSM = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>'
  });  

// ESRI World Imagery Basemap
var Esri_WorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
	attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

// Light Carto basemap tiles
var light = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attribution">CARTO</a>'
  });

//Dark basemap without labels by CartoDB
var dark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
	subdomains: 'abcd',
	maxZoom: 19
});

// variable with all the basemaps
var BaseMaps = {
    "Light CartoDB" : light,
    "Open Street Map" : OSM,
    "ESRI World Imagery" : Esri_WorldImagery,
    "Dark CartoDB" : dark    
};

//OVERLAY MAPS

//CSV  Layers
const addCSV = async (url, layerGroup) => {

    //read the csv file
    const response = await fetch(url);
    const csvData = await response.text();

    // Use PapaParse to convert string to array of objects   
    var data = Papa.parse(csvData, { header: true, dynamicTyping: true }).data;

    // For each row in data, create a marker and add it to an array for the Layer Group   
    for (var i in data) {

        // For each row, columns  `Description`, `Ref`, `Text`, `comment`, `Lat`, `Lng`, and `Pleiades` are required
        var row = data[i];      

        var Description = row.Description;
        var Ref = row.Ref;
        var text = row.Text;
        var comment = row.comment;
        if (comment === null) {
            comment = " - "
        }
        var pleiades = row.Pleiades;        
        var popup = "<b>Name : " + Description + "</b><br/>Reference : " + Ref + "<br/>Text : " + text + "<br/>Comment : " + comment +
         "<br/><a href='https://pleiades.stoa.org/places/" + pleiades + "'>Pleiades : " + pleiades + "</a>";

        // icons for different categories of points
        var markerURL = "";
        var markerSize = [];
        if(row.type === "tribe") {
            markerURL = "./icons/star-stroked.svg";
            markerSize = [15, 80];            
        }
        if(row.type === "forest") {
            markerURL = "./icons/park-alt1.svg";
            markerSize = [30, 80];           
        }
        if(row.type === "city") {
            markerURL = "./icons/square-stroked.svg"
            markerSize = [22, 80];            
        }
        if(row.type === "place" || row.type === "island") {
            markerURL = "./icons/triangle-stroked.svg"
            markerSize = [25, 80];            
        }

        //setting up icons for specific types
        var pointIcon = L.icon({
            iconUrl: markerURL,
            iconSize: markerSize,
        });

        //adding markers to map with icons and binding popups
        var marker = L.marker([row.Lat, row.Lng], {icon: pointIcon,
            opacity: 1
        }).bindPopup(popup);
        layerGroup.addLayer(marker).addTo(map);
    }
}

// Strabo (source: strabo.csv)
var StraboLayerGroup = L.layerGroup([])

addCSV("strabo.csv", StraboLayerGroup);

// Pliny (source: pliny.csv)
var PlinyLayerGroup = L.layerGroup([])
addCSV("pliny.csv", PlinyLayerGroup);

//GEOJSON Layers
const addGeoJSON = async (url) => {
    const response = await fetch(url);
    const data = await response.json();
    L.geoJson(data).addTo(map);
}

var AntonineItineraryVector = addGeoJSON("/data/AntonineItinerary - vectors.geojson");
var AntonineItineraryPoints = addGeoJSON("/data/AntonineItinerary - points.geojson");
var CaesarBGVector = addGeoJSON("/data/CaesarBG - vectors.geojson");

// OVERLAYMAPS VARIABLE
var overlayMaps = {
    "Strabo": StraboLayerGroup,
    "Pliny" : PlinyLayerGroup,
    "Antonine Itinerary" :     
};

// SET UP INITIAL MAP
var map = L.map('map', {
    center: [50.5, -2.5],
    zoom: 5,
    scrollWheelZoom: true,
    tap: false,
    layers: [light, StraboLayerGroup]    
});

// SET UP CONTROL PANEL for selecting the baselayers
var controlLayers = L.control.layers(BaseMaps, overlayMaps, {
    position: "topright",
    collapsed: true
}).addTo(map);

//GEOLOCATION - CENTRE MAP ON YOUR POSITION
map.locate(
    {
     setView: true, 
     maxZoom: 7 
    }
);

//MARKING YOUR LOCATION
function onLocationMarker(e) {
    L.marker(e.latlng, {
        icon: new L.icon({
            iconUrl: './icons/home.svg',
            iconSize: [30, 47.8],
        }),
    })
        .addTo(map)
        .bindPopup('you are here')
        .openPopup();
}

map.on('locationfound', onLocationMarker);

map.attributionControl.setPrefix(
    'View <a href="https://github.com/RinseWillet/StraboMap" target="_blank">code on GitHub</a>'
);