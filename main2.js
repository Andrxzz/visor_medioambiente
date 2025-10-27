// main2.js - Visor Medioambiente - Puente Alto
if (typeof L === 'undefined') {
  console.error('Leaflet no está cargado');
} else {
  // Setup map and layers
  let map = null;
  const layers = {}; // Store all layers by name

  // Sample data for each layer type (centered around Puente Alto)
  // Empty arrays - ready for real data loading
  const sampleData = {
    intervenciones_comunales: [],
    peee_2024: [],
    peee_2025: [],
    peee_2024_2025: [],
    areas_verdes: [],
    puntos_limpios: [],
    puntos_verdes: [],
    sectores: [],
    unidades_vecinales: [],
    villas: []
  };

  // Layer colors / styles for new groups
  const layerStyles = {
    intervenciones_comunales: { fillColor: '#2c7bb6', color: '#1b4f72' },
    peee_2024: { fillColor: '#d73027', color: '#8b1b16' },
    peee_2025: { fillColor: '#fdae61', color: '#b56b36' },
    peee_2024_2025: { fillColor: '#f46d43', color: '#9b3f28' },
    areas_verdes: { fillColor: '#1b7837', color: '#114c24' },
    puntos_limpios: { fillColor: '#66c2a5', color: '#3f8f74' },
    puntos_verdes: { fillColor: '#a6d96a', color: '#6d9a3f' },
    sectores: { fillColor: '#3498db', color: '#2980b9', weight: 2, fillOpacity: 0.3 },
    unidades_vecinales: {
      fillColor: '#9b59b6',
      color: '#8e44ad',
      weight: 2,
      fillOpacity: 0.3
    },
    villas: {
      fillColor: '#e67e22',
      color: '#d35400',
      weight: 2,
      fillOpacity: 0.25
    },
  };


  function showInfo(props) {
    const panel = document.getElementById('infoPanel');
    if (!panel) return;
    if (!props) { 
      panel.innerHTML = '<h4>Información</h4><p>Seleccione un elemento en el mapa.</p>'; 
      return; 
    }
    const date = props.fecha ? new Date(props.fecha).toLocaleDateString('es-CL') : '-';
    const kitsText = Array.isArray(props.kits) ? props.kits.join(', ') : '-';
    panel.innerHTML = `
      <h4>${props.name || 'Sin nombre'}</h4>
      <p><strong>Tipo:</strong> ${props.tipo || '-'}</p>
      <p><strong>Fecha:</strong> ${date}</p>
      <p><strong>Kits:</strong> ${kitsText}</p>
      <p><strong>ID:</strong> ${props.id || '-'}</p>
    `;
  }

  function onEachFeature(feature, layer) {
    const p = feature.properties || {};
    const kitsText = Array.isArray(p.kits) ? p.kits.join(', ') : '-';
    const html = `
      <b>${p.name || 'Sin nombre'}</b><br/>
      Tipo: ${p.tipo || '-'}<br/>
      Fecha: ${p.fecha || '-'}<br/>
      Kits: ${kitsText}
    `;
    layer.bindPopup(html);
    layer.on('click', () => showInfo(p));
  }

  function createMap() {
    // destroy existing
    try { if (map && map.remove) map.remove(); } catch (e) {}
    
    // create map
    map = L.map('map', { attributionControl: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
      maxZoom: 19, 
      attribution: '© OpenStreetMap' 
    }).addTo(map);
    L.control.attribution({ prefix: false, position: 'bottomright' }).addTo(map);

    // Set view to Puente Alto
    map.setView([-33.61, -70.575], 12);

    // Add zoom control
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Add scale control
    L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);

    // Create Home button
    const HomeControl = L.Control.extend({
      options: { position: 'topright' },
      onAdd: function(map) {
        const btn = L.DomUtil.create('div', 'home-btn leaflet-bar leaflet-control');
        btn.innerHTML = '🏠';
        btn.title = 'Volver al inicio';
        btn.onclick = () => map.setView([-33.61, -70.585], 13);
        return btn;
      }
    });
    new HomeControl().addTo(map);

    // Create Geolocation button
    const GeoControl = L.Control.extend({
      options: { position: 'topright' },
      onAdd: function(map) {
        const btn = L.DomUtil.create('div', 'geo-btn leaflet-bar leaflet-control');
        btn.innerHTML = '📍';
        btn.title = 'Mi ubicación';
        btn.onclick = () => {
          if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                map.setView([lat, lng], 15);
                L.marker([lat, lng]).addTo(map).bindPopup('Tu ubicación').openPopup();
              },
              (err) => alert('No se pudo obtener tu ubicación: ' + err.message)
            );
          } else {
            alert('Geolocalización no disponible en este navegador');
          }
        };
        return btn;
      }
    });
    new GeoControl().addTo(map);

    // Load base layer: Comuna de Puente Alto
    const cargarComuna = () => {
      if (window.comunaGeoJSON) {
        // The GeoJSON uses EPSG:3857 projection, we need to convert coordinates
        const features = window.comunaGeoJSON.features.map(feature => {
          const convertedGeometry = {
            ...feature.geometry,
            coordinates: feature.geometry.coordinates.map(multiPoly =>
              multiPoly.map(poly =>
                poly.map(coord => {
                  // Convert from EPSG:3857 to EPSG:4326 (lat/lng)
                  const x = coord[0];
                  const y = coord[1];
                  const lng = (x / 20037508.34) * 180;
                  const lat = (Math.atan(Math.exp((y / 20037508.34) * Math.PI)) / (Math.PI / 4) - 1) * 90;
                  return [lng, lat];
                })
              )
            )
          };
          return {
            ...feature,
            geometry: convertedGeometry
          };
        });

        const convertedGeoJSON = {
          type: 'FeatureCollection',
          features: features
        };

        L.geoJSON(convertedGeoJSON, {
          style: {
            color: '#e74c3c',
            weight: 3,
            fillOpacity: 0
          }
        }).addTo(map);
        console.log('✓ Capa de comuna agregada al mapa');
      } else {
        setTimeout(cargarComuna, 100);
      }
    };
    cargarComuna();

    // Cargar capa de Sectores
    const cargarSectores = () => {
      fetch('datos/sectores.geojson')
        .then(response => response.json())
        .then(data => {
          const style = layerStyles.sectores;
          layers['sectores'] = L.geoJSON(data, {
            style: {
              fillColor: style.fillColor,
              color: style.color,
              weight: style.weight,
              fillOpacity: style.fillOpacity
            },
            onEachFeature: (feature, layer) => {
              const props = feature.properties || {};
              const sectorName = props.Name || 'Sector desconocido';
              layer.bindPopup(`<b>${sectorName}</b><br>${props.PopupInfo || ''}`);
              layer.on('click', () => {
                showInfo({
                  name: sectorName,
                  tipo: 'Sector',
                  id: props.Name,
                  ...props
                });
              });
            }
          });
          
          // Agregar la capa al mapa por defecto
          layers['sectores'].addTo(map);
          console.log('✓ Capa de sectores agregada al mapa');
        })
        .catch(err => console.error('Error al cargar sectores:', err));
    };
    cargarSectores();

    // Cargar capa de Unidades Vecinales
    const cargarUnidadesVecinales = () => {
      fetch('datos/unidadesvecinales.geojson')
        .then(response => response.json())
        .then(data => {
          const style = layerStyles.unidades_vecinales;
          layers['unidades_vecinales'] = L.geoJSON(data, {
            style: {
              fillColor: style.fillColor,
              color: style.color,
              weight: style.weight,
              fillOpacity: style.fillOpacity
            },
            onEachFeature: (feature, layer) => {
              const props = feature.properties || {};
              const uvName = props.Name || 'Unidad Vecinal desconocida';
              layer.bindPopup(`<b>${uvName}</b>`);
              layer.on('click', () => {
                showInfo({
                  name: uvName,
                  tipo: 'Unidad Vecinal',
                  id: props.id || props.Name,
                  ...props
                });
              });
            }
          });
          
          // Agregar la capa al mapa por defecto
          layers['unidades_vecinales'].addTo(map);
          console.log('✓ Capa de unidades vecinales agregada al mapa');
        })
        .catch(err => console.error('Error al cargar unidades vecinales:', err));
    };
    cargarUnidadesVecinales();

    // Cargar capa de Villas
    const cargarVillas = () => {
      fetch('datos/villas.geojson')
        .then(response => response.json())
        .then(data => {
          const style = layerStyles.villas;
          layers['villas'] = L.geoJSON(data, {
            style: {
              fillColor: style.fillColor,
              color: style.color,
              weight: style.weight,
              fillOpacity: style.fillOpacity
            },
            onEachFeature: (feature, layer) => {
              const props = feature.properties || {};
              const villaName = props.Name || 'Villa desconocida';
              layer.bindPopup(`<b>${villaName}</b>`);
              layer.on('click', () => {
                showInfo({
                  name: villaName,
                  tipo: 'Villa',
                  id: props.id || props.Name,
                  ...props
                });
              });
            }
          });
          
          // Agregar la capa al mapa por defecto
          layers['villas'].addTo(map);
          console.log('✓ Capa de villas agregada al mapa');
        })
        .catch(err => console.error('Error al cargar villas:', err));
    };
    cargarVillas();

    // Create all layers
    Object.keys(sampleData).forEach(layerName => {
      const style = layerStyles[layerName] || { fillColor: '#888', color: '#555' };
      layers[layerName] = L.geoJSON(null, {
        pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
          radius: 7,
          fillColor: style.fillColor,
          color: style.color,
          weight: 2,
          fillOpacity: 0.8
        }),
        onEachFeature: onEachFeature
      });
      
      // Add sample data to layer
      layers[layerName].addData({
        type: 'FeatureCollection',
        features: sampleData[layerName]
      });
      
      // Add to map by default
      layers[layerName].addTo(map);
    });

    setTimeout(() => { try { map.invalidateSize(); } catch (e) {} }, 200);
  }


  function applyFilters() {
    const tipo = document.getElementById('tipoIntervencion').value;
    const kitsFilter = document.getElementById('kitsSelect') ? document.getElementById('kitsSelect').value : 'all';
    
    // Reapply data to all layers with filters
    Object.keys(sampleData).forEach(layerName => {
      if (!layers[layerName]) return;
      
      layers[layerName].clearLayers();
      
      const filtered = sampleData[layerName].filter(f => {
        const props = f.properties || {};
        
        // Filter by tipo
        if (tipo !== 'all' && props.tipo !== tipo) return false;
        
        // Filter by kits
        if (kitsFilter === 'all') return true;
        if (kitsFilter === '2024_2025') {
          return Array.isArray(props.kits) && (props.kits.includes('2024') || props.kits.includes('2025'));
        }
        return Array.isArray(props.kits) && props.kits.includes(kitsFilter);
      });
      
      if (filtered.length > 0) {
        layers[layerName].addData({
          type: 'FeatureCollection',
          features: filtered
        });
      }
    });
  }

  function doSearch() {
    const q = document.getElementById('search').value.trim().toLowerCase();
    if (!q) {
      alert('Introduce texto para buscar');
      return;
    }
    
    let found = null;
    
    // Search across all layer data
    Object.keys(sampleData).forEach(layerName => {
      sampleData[layerName].forEach(f => {
        if ((f.properties.name || '').toLowerCase().includes(q)) {
          found = f;
        }
      });
    });
    
    if (found && map) {
      const coords = found.geometry.coordinates.slice().reverse();
      map.setView(coords, 17);
      L.popup()
        .setLatLng(coords)
        .setContent(`<b>${found.properties.name}</b>`)
        .openOn(map);
      showInfo(found.properties);
    } else {
      alert('No se encontraron resultados para: ' + q);
    }
  }

  // Wire UI on load
  document.addEventListener('DOMContentLoaded', () => {
    createMap();
    
    // Search button
    const btnSearch = document.getElementById('btnSearch');
    if (btnSearch) btnSearch.addEventListener('click', doSearch);
    
    // Enter key for search
    const searchInput = document.getElementById('search');
    if (searchInput) {
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') doSearch();
      });
    }
    
    // Filter dropdowns
    const tipoSelect = document.getElementById('tipoIntervencion');
    if (tipoSelect) tipoSelect.addEventListener('change', applyFilters);
    
    const kitsSelect = document.getElementById('kitsSelect');
    if (kitsSelect) kitsSelect.addEventListener('change', applyFilters);
    
    // Layer checkboxes: new sidebar IDs -> layer keys
    const layerCheckboxes = {
      'chk-sectores': 'sectores',
      'chk-unidades': 'unidades_vecinales',
      'chk-villas': 'villas',
      'chk-sedes': 'intervenciones_comunales',
      'chk-peee-2024': 'peee_2024',
      'chk-peee-2025': 'peee_2025',
      'chk-peee-2024-2025': 'peee_2024_2025',
      'chk-areas-verdes': 'areas_verdes',
      'chk-puntos-limpios': 'puntos_limpios',
      'chk-puntos-verdes': 'puntos_verdes',
      'chk-intervenciones-comunales': 'intervenciones_comunales'
    };

    // Initialize checkbox behavior
    Object.entries(layerCheckboxes).forEach(([checkboxId, layerName]) => {
      const checkbox = document.getElementById(checkboxId);
      if (!checkbox) return;

      // Special handling for sectores checkbox (independent layer)
      if (checkboxId === 'chk-sectores') {
        checkbox.checked = true; // Default checked
        checkbox.addEventListener('change', (ev) => {
          if (layers['sectores']) {
            if (ev.target.checked) {
              layers['sectores'].addTo(map);
            } else {
              map.removeLayer(layers['sectores']);
            }
          }
        });
        return;
      }

      // Special handling for villas checkbox (independent layer)
      if (checkboxId === 'chk-villas') {
        checkbox.checked = true; // Default checked
        checkbox.addEventListener('change', (ev) => {
          if (layers['villas']) {
            if (ev.target.checked) {
              layers['villas'].addTo(map);
            } else {
              map.removeLayer(layers['villas']);
            }
          }
        });
        return;
      }

      // Special handling for unidades vecinales checkbox (independent layer)
      if (checkboxId === 'chk-unidades') {
        checkbox.checked = true; // Default checked
        checkbox.addEventListener('change', (ev) => {
          if (layers['unidades_vecinales']) {
            if (ev.target.checked) {
              layers['unidades_vecinales'].addTo(map);
            } else {
              map.removeLayer(layers['unidades_vecinales']);
            }
          }
        });
        return;
      }

      // If this checkbox maps to the combined intervenciones layer but is a sub-item
      // (sedes), we keep them as visual-only and sync them
      // to the master checkbox.
      const isSubItem = ['chk-sedes'].includes(checkboxId);

      // Master checkbox for the combined layer
      if (checkboxId === 'chk-intervenciones-comunales') {
        // default checked: show combined layer
        checkbox.checked = true;
        checkbox.addEventListener('change', (ev) => {
          if (ev.target.checked) {
            layers['intervenciones_comunales'].addTo(map);
            // sync sub-items visually (only sedes now)
            ['chk-sedes'].forEach(id => { const e = document.getElementById(id); if (e) e.checked = true; });
          } else {
            map.removeLayer(layers['intervenciones_comunales']);
            ['chk-sedes'].forEach(id => { const e = document.getElementById(id); if (e) e.checked = false; });
          }
  });
  return;
      }

      // For sub-items (visual-only), set checked based on master
      if (isSubItem) {
        const master = document.getElementById('chk-intervenciones-comunales');
        checkbox.checked = master ? master.checked : true;
        checkbox.addEventListener('change', () => {
          // do nothing to map - sub-items are informational only
          const masterBox = document.getElementById('chk-intervenciones-comunales');
          if (masterBox && !masterBox.checked) {
            // if master was unchecked but user checks a sub-item, re-enable master
            masterBox.checked = true;
            layers['intervenciones_comunales'].addTo(map);
          }
  });
  return;
      }

      // Other independent layers
      if (layers[layerName]) {
        checkbox.checked = map.hasLayer(layers[layerName]);
        checkbox.addEventListener('change', (ev) => {
          if (ev.target.checked) layers[layerName].addTo(map); else map.removeLayer(layers[layerName]);
        });
      }
    });
  });
}
