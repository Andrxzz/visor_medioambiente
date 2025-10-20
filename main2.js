// main2.js - minimal map + sidebar wiring
if (typeof L === 'undefined') {
  console.error('Leaflet no está cargado');
} else {
  // Setup map and layers
  let map = null;
  let pointsLayer = null;
  let polygonsLayer = null;

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

  function showInfo(props) {
    const panel = document.getElementById('infoPanel');
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
      // filter points inside polygon
      try {
        const pts = samplePoints.features.filter(f => turf.booleanPointInPolygon(f, feature));
        pointsLayer.clearLayers();
        pointsLayer.addData({ type: 'FeatureCollection', features: pts });
      } catch (e) { /* ignore */ }
      showInfo(p);
    });
  }

  function createMap() {
    // destroy existing
    try { if (map && map.remove) map.remove(); } catch (e) {}

    map = L.map('map', { attributionControl: false }).setView([40.4168, -3.7038], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map);
    L.control.attribution({ prefix: false, position: 'bottomright' }).addTo(map);

    pointsLayer = L.geoJSON(null, { pointToLayer: (feature, latlng) => L.circleMarker(latlng, { radius: 6, fillColor: '#2a9d8f', color: '#083d3d', weight: 1, fillOpacity: 0.9 }), onEachFeature: onEachPoint });
    polygonsLayer = L.geoJSON(null, { style: { color: '#e76f51', weight: 2, fillOpacity: 0.15 }, onEachFeature: onEachPolygon });

    const overlays = { 'Puntos (intervenciones)': pointsLayer, 'Polígonos (zonas)': polygonsLayer };
    L.control.layers(null, overlays, { collapsed: false }).addTo(map);

    pointsLayer.addData(samplePoints).addTo(map);
    polygonsLayer.addData(samplePolygons).addTo(map);

    try { map.fitBounds(polygonsLayer.getBounds()); } catch (e) { }

    setTimeout(() => { try { map.invalidateSize(); } catch (e) {} }, 200);
  }

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

  // wire UI
  document.addEventListener('DOMContentLoaded', () => {
    createMap();
    document.getElementById('btnSearch').addEventListener('click', doSearch);
    document.getElementById('tipoIntervencion').addEventListener('change', applyFilters);
    document.getElementById('sourceSelect').addEventListener('change', () => {
      alert('Fuente cambiada a: ' + document.getElementById('sourceSelect').value + '\nEn esta demo los datos son locales.');
    });
    document.getElementById('chkPoint').addEventListener('change', (ev) => { if (!map || !pointsLayer) return; if (ev.target.checked) map.addLayer(pointsLayer); else map.removeLayer(pointsLayer); });
    document.getElementById('chkPolygon').addEventListener('change', (ev) => { if (!map || !polygonsLayer) return; if (ev.target.checked) map.addLayer(polygonsLayer); else map.removeLayer(polygonsLayer); });
  });
}
