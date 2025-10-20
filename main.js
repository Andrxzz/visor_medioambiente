// Main JavaScript for Visor Medio Ambiente
// Reescrito para permitir destruir y recrear el mapa principal si es necesario

// --- Config y datos de ejemplo -------------------------------------------------
const samplePoints = {
	type: 'FeatureCollection',
	features: [
		{ type: 'Feature', properties: { id: 1, name: 'Estab A', tipo: 'restauracion', fecha: '2025-01-15' }, geometry: { type: 'Point', coordinates: [-3.7038, 40.4168] } },
		{ type: 'Feature', properties: { id: 2, name: 'Estab B', tipo: 'limpieza', fecha: '2025-02-20' }, geometry: { type: 'Point', coordinates: [-3.703, 40.4175] } },
		{ type: 'Feature', properties: { id: 3, name: 'Estab C', tipo: 'plantacion', fecha: '2025-03-12' }, geometry: { type: 'Point', coordinates: [-3.7045, 40.4155] } }
	]
};

const samplePolygons = {
	type: 'FeatureCollection',
	features: [
		{ type: 'Feature', properties: { id: 101, name: 'Zona Norte' }, geometry: { type: 'Polygon', coordinates: [[[-3.706,40.418],[-3.701,40.418],[-3.701,40.415],[-3.706,40.415],[-3.706,40.418]]] } },
		{ type: 'Feature', properties: { id: 102, name: 'Zona Sur' }, geometry: { type: 'Polygon', coordinates: [[[-3.705,40.415],[-3.700,40.415],[-3.700,40.412],[-3.705,40.412],[-3.705,40.415]]] } }
	]
};

// Variables que serán recreadas al destruir/crear el mapa
let map = null;
let pointsLayer = null;
let polygonsLayer = null;

// --- Helpers: popups, info panel ---------------------------------------------
const infoPanel = () => document.getElementById('infoPanel');

function showInfo(props) {
	const panel = infoPanel();
	if (!panel) return;
	if (!props) { panel.innerHTML = 'Seleccione un elemento en el mapa o use búsqueda.'; return; }
	const date = props.fecha ? new Date(props.fecha).toLocaleDateString() : '-';
	panel.innerHTML = `<strong>Nombre:</strong> ${props.name || '-'}<br/><strong>Tipo:</strong> ${props.tipo || '-'}<br/><strong>Fecha:</strong> ${date}`;
}

function onEachPoint(feature, layer) {
	const p = feature.properties || {};
	const html = `<b>${p.name || 'Sin nombre'}</b><br/>Tipo: ${p.tipo || '-'}<br/>Fecha: ${p.fecha || '-'}<br/>ID: ${p.id || ''}`;
	layer.bindPopup(html);
	layer.on('click', () => showInfo(p));
}

function onEachPolygon(feature, layer) {
	const p = feature.properties || {};
	layer.bindPopup(`<b>${p.name || 'Zona'}</b>`);
	layer.on('click', () => {
		if (map && layer.getBounds) map.fitBounds(layer.getBounds());
		filterByPolygon(feature);
		showInfo(p);
	});
}

// (Se eliminó la sección de Chart.js y el gráfico mensual según petición)

// --- Filtrado y búsqueda ----------------------------------------------------
function applyFilters() {
	const tipo = document.getElementById('tipoIntervencion').value;
	if (!pointsLayer) return;
	pointsLayer.clearLayers();
	const filtered = samplePoints.features.filter(f => tipo === 'all' ? true : (f.properties.tipo === tipo));
	pointsLayer.addData({ type: 'FeatureCollection', features: filtered });
}

function doSearch() {
	const q = document.getElementById('search').value.trim().toLowerCase();
	if (!q) return alert('Introduce texto para buscar');
	let found = null;
	samplePoints.features.forEach(f => { if ((f.properties.name || '').toLowerCase().includes(q)) found = f; });
	if (found && map) {
		const coords = found.geometry.coordinates.slice().reverse();
		map.setView(coords, 17);
		L.popup().setLatLng(coords).setContent(`<b>${found.properties.name}</b>`).openOn(map);
		showInfo(found.properties);
	} else alert('No se encontraron resultados');
}

// --- Spatial filter using Turf ------------------------------------------------
function filterByPolygon(polygonFeature) {
	const pts = samplePoints.features.filter(f => turf.booleanPointInPolygon(f, polygonFeature));
	if (!pointsLayer) return;
	pointsLayer.clearLayers();
	pointsLayer.addData({ type: 'FeatureCollection', features: pts });
}

// --- Map creation / destruction ---------------------------------------------
function createMap() {
	// destroy previous map if exists
	if (map) {
		try { map.remove(); } catch (e) { /* ignore */ }
		map = null;
	}

	// ensure container is empty
	const mapEl = document.getElementById('map');
	if (!mapEl) return;
	mapEl.innerHTML = '';

	// Wait until the container has non-zero size (helps when layout changes)
	const mapElCheck = document.getElementById('map');
	const waitForSize = (resolve) => {
		const r = mapElCheck.getBoundingClientRect();
		if (r.width > 0 && r.height > 0) return resolve();
		setTimeout(() => waitForSize(resolve), 50);
	};
	const init = () => {
	// create map
	map = L.map('map', { attributionControl: false }).setView([40.4168, -3.7038], 15);
	const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
	// ensure attribution appears inside the map (bottomright)
	L.control.attribution({ prefix: false, position: 'bottomright' }).addTo(map);

		// create layers
		pointsLayer = L.geoJSON(null, { pointToLayer: (feature, latlng) => L.circleMarker(latlng, { radius: 6, fillColor: '#2a9d8f', color: '#083d3d', weight: 1, fillOpacity: 0.9 }), onEachFeature: onEachPoint });
		polygonsLayer = L.geoJSON(null, { style: { color: '#e76f51', weight: 2, fillOpacity: 0.15 }, onEachFeature: onEachPolygon });

		const overlays = { 'Puntos (intervenciones)': pointsLayer, 'Polígonos (zonas)': polygonsLayer };
		L.control.layers({ 'OpenStreetMap': osm }, overlays, { collapsed: false }).addTo(map);

		// add data
		pointsLayer.addData(samplePoints).addTo(map);
		polygonsLayer.addData(samplePolygons).addTo(map);

		try { map.fitBounds(polygonsLayer.getBounds()); } catch (e) { /* ignore */ }

		// ensure render
		setTimeout(() => { try { map.invalidateSize(); } catch (e) {} }, 200);

		// debug: log map container rect and computed styles
		try {
			const rect = document.getElementById('map').getBoundingClientRect();
			console.log('Map container rect:', rect);
			console.log('Map container computed style left:', window.getComputedStyle(document.getElementById('mapContainer')).left);
		} catch (e) { /* ignore */ }
	};
	// wait for non-zero size then init
	waitForSize(init);
}

// --- Initialize UI listeners -----------------------------------------------
function initUI() {
	document.getElementById('btnSearch').addEventListener('click', doSearch);
	document.getElementById('tipoIntervencion').addEventListener('change', applyFilters);
	document.getElementById('sourceSelect').addEventListener('change', () => {
		alert('Fuente cambiada a: ' + document.getElementById('sourceSelect').value + '\nEn esta demo los datos son locales. Implementa llamadas a servicios o BD aquí.');
	});
	document.getElementById('chkPoint').addEventListener('change', (ev) => { if (!map || !pointsLayer) return; if (ev.target.checked) map.addLayer(pointsLayer); else map.removeLayer(pointsLayer); });
	document.getElementById('chkPolygon').addEventListener('change', (ev) => { if (!map || !polygonsLayer) return; if (ev.target.checked) map.addLayer(polygonsLayer); else map.removeLayer(polygonsLayer); });
}

// --- Bootstrapping ---------------------------------------------------------
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => {
		createMap();
		initUI();
	});
} else {
	createMap();
	initUI();
}

/*
Notes:
 - Para reemplazar datos por GeoJSON remoto, usar fetch y pointsLayer.clearLayers(); pointsLayer.addData(remoteData);
 - Para usar PostGIS o servicios, construir un endpoint que devuelva GeoJSON y llamarlo desde aquí.
*/

