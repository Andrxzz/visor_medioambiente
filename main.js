// Main JavaScript for Visor Medio Ambiente
// - Inicializa mapa Leaflet con OSM
// - Añade capas de puntos y polígonos a partir de GeoJSON de ejemplo
// - Implementa filtros, búsqueda, control de capas y un gráfico mensual con Chart.js
// - Al hacer click en un polígono, el gráfico se actualiza para mostrar solo esa zona

// --- Config y datos de ejemplo -------------------------------------------------
const samplePoints = {
	"type": "FeatureCollection",
	"features": [
		{ "type": "Feature", "properties": { "id": 1, "name": "Estab A", "tipo": "restauracion", "fecha": "2025-01-15" }, "geometry": { "type": "Point", "coordinates": [-3.7038, 40.4168] } },
		{ "type": "Feature", "properties": { "id": 2, "name": "Estab B", "tipo": "limpieza", "fecha": "2025-02-20" }, "geometry": { "type": "Point", "coordinates": [-3.703, 40.4175] } },
		{ "type": "Feature", "properties": { "id": 3, "name": "Estab C", "tipo": "plantacion", "fecha": "2025-03-12" }, "geometry": { "type": "Point", "coordinates": [-3.7045, 40.4155] } }
	]
};

const samplePolygons = {
	"type": "FeatureCollection",
	"features": [
		{ "type": "Feature", "properties": { "id": 101, "name": "Zona Norte" }, "geometry": { "type": "Polygon", "coordinates": [[[-3.706,40.418],[-3.701,40.418],[-3.701,40.415],[-3.706,40.415],[-3.706,40.418]]] } },
		{ "type": "Feature", "properties": { "id": 102, "name": "Zona Sur" }, "geometry": { "type": "Polygon", "coordinates": [[[-3.705,40.415],[-3.700,40.415],[-3.700,40.412],[-3.705,40.412],[-3.705,40.415]]] } }
	]
};

// --- Inicializar mapa ---------------------------------------------------------
const map = L.map('map').setView([40.4168, -3.7038], 15);

const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	maxZoom: 19,
	attribution: '© OpenStreetMap'
}).addTo(map);

// Capas vacías (grupos) que llenaremos con GeoJSON
const pointsLayer = L.geoJSON(null, {
	pointToLayer: (feature, latlng) => L.circleMarker(latlng, { radius: 6, fillColor: '#2a9d8f', color: '#083d3d', weight: 1, fillOpacity: 0.9 }),
	onEachFeature: onEachPoint
});

const polygonsLayer = L.geoJSON(null, {
	style: { color: '#e76f51', weight: 2, fillOpacity: 0.15 },
	onEachFeature: onEachPolygon
});

const baseLayers = { 'OpenStreetMap': osm };
const overlays = { 'Puntos (intervenciones)': pointsLayer, 'Polígonos (zonas)': polygonsLayer };
L.control.layers(baseLayers, overlays, { collapsed: false }).addTo(map);

// Añadir datos de ejemplo
pointsLayer.addData(samplePoints).addTo(map);
polygonsLayer.addData(samplePolygons).addTo(map);

// Ajustar bounds inicial
try { map.fitBounds(polygonsLayer.getBounds()); } catch (e) { /* ignore if empty */ }

// --- Info panel y popups -----------------------------------------------------
const infoPanel = document.getElementById('infoPanel');

function onEachPoint(feature, layer) {
	const p = feature.properties || {};
	const html = `<b>${p.name || 'Sin nombre'}</b><br/>Tipo: ${p.tipo || '-'}<br/>Fecha: ${p.fecha || '-'}<br/>ID: ${p.id || ''}`;
	layer.bindPopup(html);
	layer.on('click', () => showInfo(p));
}

function onEachPolygon(feature, layer) {
	const p = feature.properties || {};
	layer.bindPopup(`<b>${p.name || 'Zona'}</b>`);
	layer.on('click', (ev) => {
		// Zoom to polygon and filter chart
		map.fitBounds(layer.getBounds());
		filterByPolygon(feature);
		showInfo(p);
	});
}

function showInfo(props) {
	if (!props) { infoPanel.innerHTML = 'Seleccione un elemento en el mapa o use búsqueda.'; return; }
	const date = props.fecha ? new Date(props.fecha).toLocaleDateString() : '-';
	infoPanel.innerHTML = `<strong>Nombre:</strong> ${props.name || '-'}<br/><strong>Tipo:</strong> ${props.tipo || '-'}<br/><strong>Fecha:</strong> ${date}`;
}

// --- Filtros y búsqueda -----------------------------------------------------
const chkPoint = document.getElementById('chkPoint');
const chkPolygon = document.getElementById('chkPolygon');
const tipoSelect = document.getElementById('tipoIntervencion');
const sourceSelect = document.getElementById('sourceSelect');
const searchInput = document.getElementById('search');
const btnSearch = document.getElementById('btnSearch');

chkPoint.addEventListener('change', () => {
	if (chkPoint.checked) map.addLayer(pointsLayer); else map.removeLayer(pointsLayer);
});
chkPolygon.addEventListener('change', () => {
	if (chkPolygon.checked) map.addLayer(polygonsLayer); else map.removeLayer(polygonsLayer);
});

tipoSelect.addEventListener('change', applyFilters);
sourceSelect.addEventListener('change', () => {
	// For demo we only have local geojson; show note how to switch in comments
	alert('Fuente cambiada a: ' + sourceSelect.value + '\nEn esta demo los datos son locales. Implementa llamadas a servicios o BD aquí.');
});

btnSearch.addEventListener('click', () => {
	const q = searchInput.value.trim().toLowerCase();
	if (!q) return alert('Introduce texto para buscar');
	// Buscamos en propiedades name de puntos
	let found = null;
	samplePoints.features.forEach(f => { if ((f.properties.name || '').toLowerCase().includes(q)) found = f; });
	if (found) {
		const coords = found.geometry.coordinates.slice().reverse();
		map.setView(coords, 17);
		L.popup().setLatLng(coords).setContent(`<b>${found.properties.name}</b>`).openOn(map);
		showInfo(found.properties);
	} else alert('No se encontraron resultados');
});

function applyFilters() {
	const tipo = tipoSelect.value;
	// Filtrar puntos
	pointsLayer.clearLayers();
	const filtered = samplePoints.features.filter(f => tipo === 'all' ? true : (f.properties.tipo === tipo));
	pointsLayer.addData({ type: 'FeatureCollection', features: filtered });
	updateChart(filtered);
}

// --- Chart.js: gráfico de barras mensual ------------------------------------
const ctx = document.getElementById('barChart').getContext('2d');
let barChart = new Chart(ctx, {
	type: 'bar',
	data: { labels: [], datasets: [{ label: 'Trabajos', data: [], backgroundColor: '#4a90e2' }] },
	options: { responsive: true, maintainAspectRatio: false }
});

function updateChart(pointFeatures) {
	// pointFeatures: array de features para contar por mes
	const features = pointFeatures || samplePoints.features;
	// inicializar meses
	const months = Array.from({ length: 12 }, (_, i) => i + 1);
	const counts = months.map(() => 0);
	features.forEach(f => {
		const date = f.properties && f.properties.fecha ? new Date(f.properties.fecha) : null;
		if (date && !isNaN(date)) counts[date.getMonth()]++;
	});

	barChart.data.labels = months.map(m => `M${m}`);
	barChart.data.datasets[0].data = counts;
	barChart.update();
}

// Inicializar con todos los puntos
updateChart();

// --- Interacción: click en polígono filtra los puntos usando Turf ----------------
function filterByPolygon(polygonFeature) {
	// Encontrar puntos dentro del polígono
	const pts = samplePoints.features.filter(f => turf.booleanPointInPolygon(f, polygonFeature));
	// Mostrar sólo esos puntos en la capa
	pointsLayer.clearLayers();
	pointsLayer.addData({ type: 'FeatureCollection', features: pts });
	// Actualizar gráfico
	updateChart(pts);
}

// --- Notas: cambiar la fuente de datos --------------------------------------
/*
	Para usar GeoJSON remoto: fetch('mi.geojson').then(r=>r.json()).then(data=>{ pointsLayer.clearLayers(); pointsLayer.addData(data); });
	Para usar servicios: implementar fetch a APIs/ WFS y transformar a GeoJSON.
	Para usar BD (PostGIS): crear un servicio intermedio que consulte y devuelva GeoJSON.
*/

