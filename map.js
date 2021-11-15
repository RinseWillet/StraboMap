// TO DO:
// Standardize layer fields



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
    "Light CartoDB": light,
    "Open Street Map": OSM,
    "ESRI World Imagery": Esri_WorldImagery,
    "Dark CartoDB": dark
};

//OVERLAY MAPS

//empty operational layer to add layers to

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
        if (row.type === "tribe") {
            markerURL = "./icons/star-stroked.svg";
            markerSize = [15, 80];
        }
        if (row.type === "forest") {
            markerURL = "./icons/park-alt1.svg";
            markerSize = [30, 80];
        }
        if (row.type === "city") {
            markerURL = "./icons/square-stroked.svg"
            markerSize = [22, 80];
        }
        if (row.type === "place" || row.type === "island") {
            markerURL = "./icons/triangle-stroked.svg"
            markerSize = [25, 80];
        }

        //setting up icons for specific types
        var pointIcon = L.icon({
            iconUrl: markerURL,
            iconSize: markerSize,
        });

        //adding markers to map with icons and binding popups
        var marker = L.marker([row.Lat, row.Lng], {
            icon: pointIcon,
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




//Reading published layer Geoserver @localhost:8080 (layer name is Ptolemy)

// making the apiCall and fetching the json response
const apiCall = async (url) => {
    const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'same-origin'        
        });
        return response.json();
}

const GeoJSONHandling = async (url, feature_style, feature_layergroup) => {

    //calling API with url and retrieving Geojson from Geoserver API
    apiCall(url)
    .then(data => {
        console.log(data)

        //looping over the features in the GeoJSON         
        for (i in data.features) {

            //ignoring features with no coordinates/geometry
            if(data.features[i].geometry == null) {
                console.log("unlocated")
                continue;
            }

            //Adding point features to map
            if(data.features[i].geometry.type === "Point") {
                addGeoJSONtoMap(data.features[i], feature_style, feature_layergroup, "Point")
            }
    }})
}

//adding geojson data to map
const addGeoJSONtoMap = (data, markerstyle, feature_layergroup, type) => {

    //dealing with point data
    if (type === "Point") {
        var geoJSONlayer = L.geoJSON(data, {
            pointToLayer: function (feature, latlng) {
                return new L.circleMarker(latlng, markerstyle)
            },
            onEachFeature: function (feature, layer) {
                var popUpText = createPopupText(data) 
                ;
                layer.bindPopup(popUpText, popStyle)
            }
        });
    feature_layergroup.addLayer(geoJSONlayer);

        //dealing with MutliLine data
    } else if (type === "MultiLineString") {
       L.geoJSON(data, {
            style: function (feature) {
                return { color: 'blue'}
            },
        }).addTo(map); // add data from GeoJSON to map
    }
}

// custom popup style
var popStyle =
    {
        'minWidth' : 150,
        'maxWidth' : 400,
        'className' : 'custom'
    }


//binding popups to points
// to do: standardize layer-fields
const createPopupText = (data) => {
    let description = data.properties.Identifica;
    let text = data.properties.text;
    let ref = data.properties.reference;
    let comment = data.properties.comment;
    let pleiades = data.properties["Pleiader n"];
    if (pleiades === null) {
        var popup_text = "<b>Name : " + description + "</b><br/>Reference : " + ref + "<br/>Text : " + text + "<br/>Comment : " + comment
    } else {
        var popup_text = "<b>Name : " + description + "</b><br/>Reference : " + ref + "<br/>Text : " + text + "<br/>Comment : " + comment +
        "<br/><a href='https://pleiades.stoa.org/places/" + pleiades + "'>Pleiades : " + pleiades + "</a>"
    }   
    return popup_text
}

//Geoserver layer API urls
urlGeoServerPtolemy = "http://localhost:8080/geoserver/ancient_infra/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=ancient_infra%3APtolemy%27s%20Geography&maxFeatures=50&outputFormat=application%2Fjson"

//// MarkerStyles
var AntItColours = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe', '#008080', '#e6beff', '#9a6324', '#fffac8', '#800000', '#aaffc3', '#808000', '#ffd8b1', '#000075', '#808080', '#ffffff', '#000000'];

var AntItMarkerStyle = {
    radius: 4,
    fillColor: "#ff7800",
    color: "#000",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8
};

var StraboMarkerStyle = {
    radius: 4,
    fillColor: "#3cb44b",
    color: "#000",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8
}

var PtolemyMarkerStyle = {
    radius: 4,
    fillColor: "#4363d8",
    color: "#000",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8
}

var PlinyMarkerStyle = {
    radius: 4,
    fillColor: "#4363d8",
    color: "#000",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8
}

var AntItStyle = {
    "color": "#0000FF",
    "weight": 5,
    "opacity": 0.65
};

var CBGRomStyle = {
    "color": "#8B008B",
    "weight": 5,
    "opacity": 0.65
};

var CBGRomStyle = {
    "color": "#00FF00",
    "weight": 5,
    "opacity": 0.65
};

var PtolemyLayergroup = L.layerGroup([])
GeoJSONHandling(urlGeoServerPtolemy, PtolemyMarkerStyle, PtolemyLayergroup)


var AntonineItineraryVector = "/data/AntonineItinerary - vectors.geojson";
var AntonineItineraryPoints = "/data/AntonineItinerary - points.geojson";
var StraboJSON = "/data/strabo.geojson";
var PtolemyJSON = "/data/ptolemy.geojson";
var PlinyJSON = "/data/pliny.geojson";

// loadGeoJSON(AntonineItineraryVector);
// loadGeoJSON(AntonineItineraryPoints);
// loadGeoJSON(StraboJSON);
// loadGeoJSON(PtolemyJSON);
// loadGeoJSON(PlinyJSON);
// addGeoJSON(CaesarBGVector);
// var AntonineItineraryPoints = addGeoJSON("/data/AntonineItinerary - points.geojson");
// var CaesarBGVector = addGeoJSON("/data/CaesarBG - vectors.geojson");

// OVERLAYMAPS VARIABLE
var overlayMaps = {
    "Strabo": StraboLayerGroup,
    "Pliny": PlinyLayerGroup,
    "Ptolemy": PtolemyLayergroup
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