// main2.js - Visor Medioambiente - Puente Alto
console.log('🔍 Verificando librerías...');
console.log('Leaflet:', typeof L !== 'undefined' ? '✓' : '✗');
console.log('Turf:', typeof turf !== 'undefined' ? '✓' : '✗');
console.log('Chart.js:', typeof Chart !== 'undefined' ? '✓' : '✗');

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
    puntos_limpios: [],
    puntos_verdes_comunidad: [],
    puntos_verdes_internos: [],
    sectores: [],
    unidades_vecinales: [],
    villas: [],
    sedes_sociales: []
  };

  // Layer colors / styles for new groups
  const layerStyles = {
    intervenciones_comunales: { fillColor: '#2c7bb6', color: '#1b4f72' },
    peee_2024: { fillColor: '#d73027', color: '#8b1b16' },
    peee_2025: { fillColor: '#fdae61', color: '#b56b36' },
    peee_2024_2025: { fillColor: '#f46d43', color: '#9b3f28' },
    puntos_limpios: { fillColor: '#2563eb', color: '#1e40af' },
    puntos_verdes_comunidad: { fillColor: '#10b981', color: '#059669' },
    puntos_verdes_internos: { fillColor: '#f59e0b', color: '#d97706' },
    sectores: { fillColor: '#3b82f6', color: '#2563eb', weight: 2.5, fillOpacity: 0.25 },
    unidades_vecinales: {
      fillColor: '#a855f7',
      color: '#9333ea',
      weight: 2.5,
      fillOpacity: 0.25
    },
    villas: {
      fillColor: '#10b981',
      color: '#059669',
      weight: 2.5,
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
    
    // create map (sin zoom control por defecto)
    map = L.map('map', { attributionControl: false, zoomControl: false });
    
    // Definir los basemaps
    const basemaps = {
      gris: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap, © CARTO',
        id: 'gris'
      }),
      openstreetmap: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
        maxZoom: 19, 
        attribution: '© OpenStreetMap',
        id: 'openstreetmap'
      }),
      satelital: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: '© Esri',
        id: 'satelital'
      })
    };
    
    // Agregar basemap por defecto (GRIS con calles)
    basemaps.gris.addTo(map);
    
    L.control.attribution({ prefix: false, position: 'bottomright' }).addTo(map);

    // Set view to Puente Alto (centro de la comuna)
    map.setView([-33.591975, -70.566936], 13);

    // Add zoom control solo a la derecha
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Add scale control
    L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);

    // Agregar control de basemap
    const BasemapControl = L.Control.extend({
      options: { position: 'topright' },
      onAdd: function(map) {
        const container = L.DomUtil.create('div', 'basemap-control leaflet-bar leaflet-control');
        container.innerHTML = `
          <button class="basemap-toggle" title="Cambiar mapa base">🗺️</button>
          <div class="basemap-options" style="display: none;">
            <button data-basemap="openstreetmap" class="basemap-option active">Estándar</button>
            <button data-basemap="gris" class="basemap-option">Gris</button>
            <button data-basemap="satelital" class="basemap-option">Satélite</button>
          </div>
        `;
        
        const toggle = container.querySelector('.basemap-toggle');
        const optionsPanel = container.querySelector('.basemap-options');
        
        // Toggle panel
        L.DomEvent.on(toggle, 'click', function(e) {
          L.DomEvent.stopPropagation(e);
          L.DomEvent.preventDefault(e);
          if (optionsPanel.style.display === 'none') {
            optionsPanel.style.display = 'block';
          } else {
            optionsPanel.style.display = 'none';
          }
        });
        
        // Cambiar basemap
        const options = container.querySelectorAll('.basemap-option');
        options.forEach(btn => {
          L.DomEvent.on(btn, 'click', function(e) {
            L.DomEvent.stopPropagation(e);
            L.DomEvent.preventDefault(e);
            const basemapName = btn.getAttribute('data-basemap');
            
            // Remover todos los basemaps
            Object.values(basemaps).forEach(layer => map.removeLayer(layer));
            
            // Agregar el seleccionado
            basemaps[basemapName].addTo(map);
            
            // Actualizar botón activo
            options.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Cerrar panel
            optionsPanel.style.display = 'none';
          });
        });
        
        // Prevenir que los clicks en el panel se propaguen al mapa
        L.DomEvent.disableClickPropagation(container);
        
        return container;
      }
    });
    new BasemapControl().addTo(map);

    // Agregar indicador de norte
    const NorthControl = L.Control.extend({
      options: { position: 'topleft' },
      onAdd: function(map) {
        const container = L.DomUtil.create('div', 'north-arrow leaflet-bar leaflet-control');
        container.innerHTML = `
          <div class="north-arrow-content">
            <div class="north-arrow-pointer">▲</div>
            <div class="north-arrow-label">N</div>
          </div>
        `;
        container.title = 'Norte';
        return container;
      }
    });
    new NorthControl().addTo(map);

    // Create Home button - centra en el centroide de Puente Alto
    const HomeControl = L.Control.extend({
      options: { position: 'topright' },
      onAdd: function(map) {
        const btn = L.DomUtil.create('div', 'home-btn leaflet-bar leaflet-control');
        btn.innerHTML = '🏠';
        btn.title = 'Centrar en Puente Alto';
        btn.onclick = () => {
          // Si existe la capa de comuna, calcular su centroide
          if (layers['comuna']) {
            const bounds = layers['comuna'].getBounds();
            const center = bounds.getCenter();
            map.setView(center, 13);
          } else {
            // Coordenadas del centro de Puente Alto
            map.setView([-33.6117, -70.5750], 13);
          }
        };
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

    // Cargar capa del Plan Regulador Comunal (PRC)
    const cargarPRC = () => {
      fetch('datos/prc.geojson')
        .then(response => response.json())
        .then(data => {
          // Colores variados para diferentes tipos de zonas
          const zonaColores = {
            'H': '#f59e0b',      // Naranja - Habitacional
            'E': '#10b981',      // Verde - Equipamiento
            'IM': '#8b5cf6',     // Morado - Industrial Mixto
            'INF': '#ef4444',    // Rojo - Infraestructura
            'AV': '#22c55e',     // Verde claro - Áreas Verdes
            'ZCP': '#3b82f6',    // Azul - Zona de Conservación Patrimonial
            'default': '#6b7280' // Gris - Otras zonas
          };
          
          const getColorForZona = (zona) => {
            if (!zona) return zonaColores.default;
            
            // Extraer prefijo de la zona (ej: "H5" -> "H", "E(i)2" -> "E")
            const prefix = zona.match(/^[A-Z]+/)?.[0] || '';
            return zonaColores[prefix] || zonaColores.default;
          };
          
          layers['prc'] = L.geoJSON(data, {
            style: (feature) => {
              const zona = feature.properties.zona || '';
              const color = getColorForZona(zona);
              
              return {
                fillColor: color,
                color: color,
                weight: 2,
                fillOpacity: 0.35,
                opacity: 0.7
              };
            },
            onEachFeature: (feature, layer) => {
              const props = feature.properties || {};
              const zona = props.zona || 'Zona desconocida';
              const nombreZona = props.nombre_zon || '';
              const uperm = props.uperm || 'No especificado';
              const uproh = props.uproh || 'No especificado';
              
              // Crear popup con información detallada
              const popupContent = `
                <div style="min-width: 250px;">
                  <b style="font-size: 14px; color: ${getColorForZona(zona)};">📋 ${zona}</b><br>
                  <div style="margin-top: 6px; font-size: 11px; color: #6b7280;">
                    ${nombreZona}
                  </div>
                  <hr style="margin: 8px 0; border: none; border-top: 1px solid #e5e7eb;">
                  <div style="margin-top: 8px;">
                    <b style="font-size: 12px; color: #059669;">✅ Usos Permitidos:</b><br>
                    <div style="font-size: 11px; color: #374151; margin-top: 4px; line-height: 1.4;">
                      ${uperm}
                    </div>
                  </div>
                  <div style="margin-top: 10px;">
                    <b style="font-size: 12px; color: #dc2626;">❌ Usos Prohibidos:</b><br>
                    <div style="font-size: 11px; color: #374151; margin-top: 4px; line-height: 1.4;">
                      ${uproh}
                    </div>
                  </div>
                </div>
              `;
              
              layer.bindPopup(popupContent, {
                maxWidth: 350,
                className: 'prc-popup'
              });
              
              // Agregar etiqueta con el código de zona
              layer.bindTooltip(zona, {
                permanent: false,
                direction: 'center',
                className: 'prc-label',
                opacity: 0.9
              });
              
              // Efecto hover
              layer.on('mouseover', function() {
                this.setStyle({
                  fillOpacity: 0.6,
                  weight: 3
                });
              });
              
              layer.on('mouseout', function() {
                this.setStyle({
                  fillOpacity: 0.35,
                  weight: 2
                });
              });
            }
          });
          
          // NO agregar la capa automáticamente, esperar al checkbox
          const checkbox = document.getElementById('chk-prc');
          if (checkbox && checkbox.checked) {
            layers['prc'].addTo(map);
          }
          
          console.log('✓ Capa del Plan Regulador Comunal cargada con', data.features.length, 'zonas');
        })
        .catch(err => console.error('Error al cargar PRC:', err));
    };
    cargarPRC();

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
              
              // Agregar popup al hacer click
              layer.bindPopup(`<b>${sectorName}</b><br>${props.PopupInfo || ''}`);
              
              // Agregar etiqueta permanente con el nombre del sector
              const bounds = layer.getBounds();
              const center = bounds.getCenter();
              
              layer.bindTooltip(sectorName, {
                permanent: true,
                direction: 'center',
                className: 'sector-label',
                opacity: 1
              });
              
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
          
          // Agregar la capa al mapa solo si el checkbox está marcado
          const checkbox = document.getElementById('chk-sectores');
          if (checkbox && checkbox.checked) {
            layers['sectores'].addTo(map);
          }
          console.log('✓ Capa de sectores cargada');
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
          
          // Agregar la capa al mapa solo si el checkbox está marcado
          const checkbox = document.getElementById('chk-unidades');
          if (checkbox && checkbox.checked) {
            layers['unidades_vecinales'].addTo(map);
          }
          console.log('✓ Capa de unidades vecinales cargada');
        })
        .catch(err => console.error('Error al cargar unidades vecinales:', err));
    };
    cargarUnidadesVecinales();

    // Función para generar colores únicos para cada villa
    function generarColorUnico(index, total) {
      // Generar colores usando HSL para asegurar variedad
      const hue = (index * 360 / total) % 360;
      const saturation = 65 + (index % 3) * 10; // 65%, 75%, 85%
      const lightness = 50 + (index % 2) * 10; // 50%, 60%
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }

    // Variable global para almacenar villas seleccionadas
    let selectedVillaLayer = null;
    let villasGeoJSONData = null;
    let villasColorsMap = {};

    // Cargar capa de Villas con colores únicos para cada una
    const cargarVillas = () => {
      fetch('datos/villas.geojson')
        .then(response => response.json())
        .then(data => {
          villasGeoJSONData = data;
          
          // Asignar un color único a cada villa
          data.features.forEach((feature, index) => {
            const villaName = feature.properties.Name || 'Villa desconocida';
            villasColorsMap[villaName] = generarColorUnico(index, data.features.length);
          });
          
          layers['villas'] = L.geoJSON(data, {
            style: (feature) => {
              const villaName = feature.properties.Name || 'Villa desconocida';
              const color = villasColorsMap[villaName];
              return {
                fillColor: color,
                color: color,
                weight: 2,
                fillOpacity: 0.5,
                opacity: 0.8
              };
            },
            onEachFeature: (feature, layer) => {
              const props = feature.properties || {};
              const villaName = props.Name || 'Villa desconocida';
              const color = villasColorsMap[villaName];
              
              layer.bindPopup(`
                <b>${villaName}</b><br>
                <span style="color: ${color};">● Villa</span>
              `);
              
              layer.on('click', () => {
                showInfo({
                  name: villaName,
                  tipo: 'Villa',
                  id: props.id || props.Name,
                  ...props
                });
                resaltarVilla(villaName);
              });
            }
          });
          
          // NO agregar la capa automáticamente, esperar al checkbox
          const checkbox = document.getElementById('chk-villas');
          if (checkbox && checkbox.checked) {
            layers['villas'].addTo(map);
          }
          
          // Cargar panel de villas
          cargarPanelVillas(data);
          
          console.log('✓ Capa de villas cargada con', data.features.length, 'villas');
        })
        .catch(err => console.error('Error al cargar villas:', err));
    };
    cargarVillas();

    // Función para cargar el panel lateral de villas
    function cargarPanelVillas(data) {
      const villasPanel = document.getElementById('villasPanel');
      const villasListContent = document.getElementById('villasListContent');
      const closeButton = document.getElementById('closeVillasPanel');
      
      if (!villasPanel || !villasListContent) return;
      
      // Obtener todas las villas y ordenarlas alfabéticamente
      const villas = data.features
        .map(feature => ({
          nombre: feature.properties.Name || 'Villa desconocida',
          color: villasColorsMap[feature.properties.Name || 'Villa desconocida']
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
      
      // Generar HTML del panel con buscador
      let html = `
        <div class="villas-search-box">
          <input 
            type="text" 
            id="villasSearchInput" 
            class="villas-search-input"
            placeholder="Buscar villa..." 
          />
        </div>
        <div id="villasItemsContainer">
      `;
      
      villas.forEach(villa => {
        html += `
          <div class="villa-item" data-villa-name="${villa.nombre}">
            <span class="villa-item-dot" style="background-color: ${villa.color};"></span>
            <span class="villa-name">${villa.nombre}</span>
          </div>
        `;
      });
      
      html += '</div>';
      villasListContent.innerHTML = html;
      
      // Event listeners para cada villa
      document.querySelectorAll('.villa-item').forEach(item => {
        item.addEventListener('click', function() {
          // Remover clase selected de todos
          document.querySelectorAll('.villa-item').forEach(i => i.classList.remove('selected'));
          // Agregar clase selected al clickeado
          this.classList.add('selected');
          
          const villaName = this.getAttribute('data-villa-name');
          resaltarVilla(villaName);
        });
      });
      
      // Funcionalidad del buscador
      const searchInput = document.getElementById('villasSearchInput');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          const searchTerm = e.target.value.toLowerCase();
          const items = document.querySelectorAll('.villa-item');
          let visibleCount = 0;
          
          items.forEach(item => {
            const villaName = item.getAttribute('data-villa-name').toLowerCase();
            if (villaName.includes(searchTerm)) {
              item.classList.remove('hidden');
              visibleCount++;
            } else {
              item.classList.add('hidden');
            }
          });
          
          // Mostrar mensaje si no hay resultados
          let noResultsMsg = document.getElementById('villasNoResults');
          if (visibleCount === 0 && searchTerm !== '') {
            if (!noResultsMsg) {
              noResultsMsg = document.createElement('div');
              noResultsMsg.id = 'villasNoResults';
              noResultsMsg.className = 'villas-no-results';
              noResultsMsg.innerHTML = `
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 8px;">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <p style="margin: 0; color: #6b7280; font-size: 13px;">No se encontraron villas</p>
              `;
              document.getElementById('villasItemsContainer').appendChild(noResultsMsg);
            }
            noResultsMsg.style.display = 'block';
          } else if (noResultsMsg) {
            noResultsMsg.style.display = 'none';
          }
        });
      }
      
      // Event listener para cerrar el panel
      if (closeButton) {
        closeButton.addEventListener('click', () => {
          villasPanel.style.display = 'none';
          // Desmarcar checkbox de villas
          const checkbox = document.getElementById('chk-villas');
          if (checkbox) checkbox.checked = false;
          // Remover capa del mapa
          if (layers['villas']) {
            map.removeLayer(layers['villas']);
          }
        });
      }
      
      // NO mostrar el panel automáticamente - esperar al checkbox
      villasPanel.style.display = 'none';
    }

    // Función para resaltar una villa seleccionada
    function resaltarVilla(villaName) {
      if (!villasGeoJSONData || !map) return;
      
      // Buscar la villa en los datos
      const villaFeature = villasGeoJSONData.features.find(f => 
        (f.properties.Name || '').toUpperCase() === villaName.toUpperCase()
      );
      
      if (!villaFeature) {
        console.warn('Villa no encontrada:', villaName);
        return;
      }
      
      // Asegurar que la capa de villas esté visible
      const villasCheckbox = document.getElementById('chk-villas');
      if (villasCheckbox && !villasCheckbox.checked) {
        villasCheckbox.checked = true;
        villasCheckbox.dispatchEvent(new Event('change'));
      }
      
      // Remover resaltado anterior
      if (selectedVillaLayer) {
        map.removeLayer(selectedVillaLayer);
        selectedVillaLayer = null;
      }
      
      // Crear nueva capa resaltada en amarillo
      selectedVillaLayer = L.geoJSON(villaFeature, {
        style: {
          fillColor: '#fbbf24',
          color: '#f59e0b',
          weight: 4,
          fillOpacity: 0.6,
          opacity: 1
        },
        onEachFeature: (feature, layer) => {
          const nombre = feature.properties.Name || 'Villa desconocida';
          const color = villasColorsMap[nombre] || '#3b82f6';
          layer.bindPopup(`
            <b style="font-size: 14px;">${nombre}</b><br>
            <span style="color: ${color}; font-size: 12px;">● Villa</span><br>
            <em style="color: #fbbf24; font-size: 11px;">Villa seleccionada</em>
          `);
          
          // Abrir popup automáticamente
          setTimeout(() => {
            layer.openPopup();
          }, 300);
        }
      }).addTo(map);
      
      // Hacer zoom a la villa
      const bounds = selectedVillaLayer.getBounds();
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 16
      });
      
      console.log('✓ Villa resaltada:', villaName);
    }

    // Cargar capa de Sedes Sociales
    const cargarSedesSociales = () => {
      // Crear ícono personalizado naranja con marco blanco
      const sedeIcon = L.divIcon({
        className: 'sede-social-icon',
        html: `<div style="
          width: 12px;
          height: 12px;
          background-color: #f97316;
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
        popupAnchor: [0, -8]
      });

      fetch('datos/sedesociales.geojson')
        .then(response => response.json())
        .then(data => {
          layers['sedes_sociales'] = L.geoJSON(data, {
            pointToLayer: (feature, latlng) => {
              return L.marker(latlng, { icon: sedeIcon });
            },
            onEachFeature: (feature, layer) => {
              const props = feature.properties || {};
              const sedeName = props.Name || 'Sede Social';
              layer.bindPopup(`<b>${sedeName}</b><br>Sede Social`);
              layer.on('click', () => {
                showInfo({
                  name: sedeName,
                  tipo: 'Sede Social',
                  ...props
                });
              });
            }
          });
          
          // Agregar la capa al mapa solo si el checkbox está marcado
          const checkbox = document.getElementById('chk-sedes');
          if (checkbox && checkbox.checked) {
            layers['sedes_sociales'].addTo(map);
          }
          console.log('✓ Capa de sedes sociales cargada');
        })
        .catch(err => console.error('Error al cargar sedes sociales:', err));
    };
    cargarSedesSociales();

    // Cargar Puntos Limpios
    const cargarPuntosLimpios = () => {
      const puntosLimpiosIcon = L.divIcon({
        className: 'punto-limpio-icon',
        html: `<div style="
          width: 14px;
          height: 14px;
          background-color: #2563eb;
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        popupAnchor: [0, -9]
      });

      fetch('datos/puntoslimpios.geojson')
        .then(response => response.json())
        .then(data => {
          // Filtrar solo Puntos Limpios (FolderPath: "Puntos Limpios/Puntos Limpios")
          const puntosLimpiosFeatures = data.features.filter(f => 
            f.properties.FolderPath === 'Puntos Limpios/Puntos Limpios'
          );
          
          const filteredData = {
            type: 'FeatureCollection',
            features: puntosLimpiosFeatures
          };

          layers['puntos_limpios'] = L.geoJSON(filteredData, {
            pointToLayer: (feature, latlng) => {
              return L.marker(latlng, { icon: puntosLimpiosIcon });
            },
            onEachFeature: (feature, layer) => {
              const props = feature.properties || {};
              const puntoName = props.Name || 'Punto Limpio';
              layer.bindPopup(`<b>${puntoName}</b><br>${props.PopupInfo || 'Punto Limpio'}`);
              layer.on('click', () => {
                showInfo({
                  name: puntoName,
                  tipo: 'Punto Limpio',
                  ...props
                });
              });
            }
          });
          
          // Agregar la capa al mapa solo si el checkbox está marcado
          const checkbox = document.getElementById('chk-puntos-limpios');
          if (checkbox && checkbox.checked) {
            layers['puntos_limpios'].addTo(map);
          }
          console.log('✓ Capa de puntos limpios cargada');
        })
        .catch(err => console.error('Error al cargar puntos limpios:', err));
    };
    cargarPuntosLimpios();

    // Cargar Puntos Verdes hacia la comunidad
    const cargarPuntosVerdesComunidad = () => {
      const puntosVerdesComunidadIcon = L.divIcon({
        className: 'punto-verde-comunidad-icon',
        html: `<div style="
          width: 14px;
          height: 14px;
          background-color: #10b981;
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        popupAnchor: [0, -9]
      });

      fetch('datos/puntoslimpios.geojson')
        .then(response => response.json())
        .then(data => {
          // Filtrar Puntos Verdes hacia la comunidad
          const puntosVerdesComunidadFeatures = data.features.filter(f => 
            f.properties.FolderPath === 'Puntos Limpios/Puntos Verdes hacia la comunidad'
          );
          
          const filteredData = {
            type: 'FeatureCollection',
            features: puntosVerdesComunidadFeatures
          };

          layers['puntos_verdes_comunidad'] = L.geoJSON(filteredData, {
            pointToLayer: (feature, latlng) => {
              return L.marker(latlng, { icon: puntosVerdesComunidadIcon });
            },
            onEachFeature: (feature, layer) => {
              const props = feature.properties || {};
              const puntoName = props.Name || 'Punto Verde';
              layer.bindPopup(`<b>${puntoName}</b><br>${props.PopupInfo || 'Punto Verde hacia la comunidad'}`);
              layer.on('click', () => {
                showInfo({
                  name: puntoName,
                  tipo: 'Punto Verde hacia la comunidad',
                  ...props
                });
              });
            }
          });
          
          // Agregar la capa al mapa solo si el checkbox está marcado
          const checkbox = document.getElementById('chk-puntos-verdes-comunidad');
          if (checkbox && checkbox.checked) {
            layers['puntos_verdes_comunidad'].addTo(map);
          }
          console.log('✓ Capa de puntos verdes comunidad cargada');
        })
        .catch(err => console.error('Error al cargar puntos verdes comunidad:', err));
    };
    cargarPuntosVerdesComunidad();

    // Cargar Puntos Verdes internos
    const cargarPuntosVerdesInternos = () => {
      const puntosVerdesInternosIcon = L.divIcon({
        className: 'punto-verde-interno-icon',
        html: `<div style="
          width: 14px;
          height: 14px;
          background-color: #f59e0b;
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        popupAnchor: [0, -9]
      });

      fetch('datos/puntoslimpios.geojson')
        .then(response => response.json())
        .then(data => {
          // Filtrar Puntos Verdes internos
          const puntosVerdesInternosFeatures = data.features.filter(f => 
            f.properties.FolderPath === 'Puntos Limpios/Puntos verdes Internos'
          );
          
          const filteredData = {
            type: 'FeatureCollection',
            features: puntosVerdesInternosFeatures
          };

          layers['puntos_verdes_internos'] = L.geoJSON(filteredData, {
            pointToLayer: (feature, latlng) => {
              return L.marker(latlng, { icon: puntosVerdesInternosIcon });
            },
            onEachFeature: (feature, layer) => {
              const props = feature.properties || {};
              const puntoName = props.Name || 'Punto Verde';
              layer.bindPopup(`<b>${puntoName}</b><br>${props.PopupInfo || 'Punto Verde interno'}`);
              layer.on('click', () => {
                showInfo({
                  name: puntoName,
                  tipo: 'Punto Verde interno',
                  ...props
                });
              });
            }
          });
          
          // Agregar la capa al mapa solo si el checkbox está marcado
          const checkbox = document.getElementById('chk-puntos-verdes-internos');
          if (checkbox && checkbox.checked) {
            layers['puntos_verdes_internos'].addTo(map);
          }
          console.log('✓ Capa de puntos verdes internos cargada');
        })
        .catch(err => console.error('Error al cargar puntos verdes internos:', err));
    };
    cargarPuntosVerdesInternos();

    // Función para convertir coordenadas UTM Zone 19S (EPSG:32719) a WGS84 (EPSG:4326)
    function convertUTM19SToWGS84(easting, northing) {
      // Parámetros de UTM Zone 19S
      const a = 6378137.0; // Radio ecuatorial WGS84
      const f = 1 / 298.257223563; // Aplanamiento WGS84
      const k0 = 0.9996; // Factor de escala
      const e = Math.sqrt(2 * f - f * f); // Excentricidad
      const e2 = e * e;
      const n = f / (2 - f);
      const n2 = n * n;
      const n3 = n2 * n;
      const n4 = n3 * n;
      const n5 = n4 * n;
      
      // Zona 19S: meridiano central -69°
      const lon0 = -69.0 * Math.PI / 180;
      const falseEasting = 500000.0;
      const falseNorthing = 10000000.0; // Para hemisferio sur
      
      // Coeficientes A
      const A = (a / (1 + n)) * (1 + n2/4 + n4/64);
      
      // Normalizar coordenadas
      const x = easting - falseEasting;
      const y = northing - falseNorthing;
      
      // Latitud del pie de página
      const xi = y / (k0 * A);
      
      // Coeficientes beta
      const beta1 = (1/2)*n - (2/3)*n2 + (5/16)*n3 + (41/180)*n4 - (127/288)*n5;
      const beta2 = (13/48)*n2 - (3/5)*n3 + (557/1440)*n4 + (281/630)*n5;
      const beta3 = (61/240)*n3 - (103/140)*n4 + (15061/26880)*n5;
      const beta4 = (49561/161280)*n4 - (179/168)*n5;
      
      const xi1 = xi 
                - beta1 * Math.sin(2*xi) 
                - beta2 * Math.sin(4*xi) 
                - beta3 * Math.sin(6*xi) 
                - beta4 * Math.sin(8*xi);
      
      const chi = Math.asin(Math.sin(xi1) / Math.cosh(x / (k0 * A)));
      
      // Latitud
      const lat = chi 
                + (e2/2 + 5*e2*e2/24 + e2*e2*e2/12) * Math.sin(2*chi)
                + (7*e2*e2/48 + 29*e2*e2*e2/240) * Math.sin(4*chi)
                + (7*e2*e2*e2/120) * Math.sin(6*chi);
      
      // Coeficientes eta
      const eta1 = (1/2)*n - (2/3)*n2 + (37/96)*n3 - (1/360)*n4 - (81/512)*n5;
      const eta2 = (1/48)*n2 + (1/15)*n3 - (437/1440)*n4 + (46/105)*n5;
      const eta3 = (17/480)*n3 - (37/840)*n4 - (209/4480)*n5;
      const eta4 = (4397/161280)*n4 - (11/504)*n5;
      
      const eta1p = xi1 
                  - eta1 * Math.sin(2*xi1) 
                  - eta2 * Math.sin(4*xi1) 
                  - eta3 * Math.sin(6*xi1) 
                  - eta4 * Math.sin(8*xi1);
      
      // Longitud
      const lon = lon0 + Math.atan(Math.sinh(x / (k0 * A)) / Math.cos(xi1));
      
      return [lon * 180 / Math.PI, lat * 180 / Math.PI];
    }

    // Cargar capa PEEE 2024
    const cargarPEEE2024 = () => {
      const peee2024Icon = L.divIcon({
        className: 'peee-2024-icon',
        html: `<div style="
          width: 10px;
          height: 10px;
          background-color: #dc2626;
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [10, 10],
        iconAnchor: [5, 5],
        popupAnchor: [0, -7]
      });

      fetch('datos/pee2024.geojson')
        .then(response => response.json())
        .then(data => {
          // Convertir coordenadas UTM a WGS84
          const convertedFeatures = data.features.map(feature => {
            const [easting, northing] = feature.geometry.coordinates;
            const [lon, lat] = convertUTM19SToWGS84(easting, northing);
            
            return {
              ...feature,
              geometry: {
                type: 'Point',
                coordinates: [lon, lat]
              }
            };
          });

          const convertedData = {
            type: 'FeatureCollection',
            features: convertedFeatures
          };

          layers['peee_2024'] = L.geoJSON(convertedData, {
            pointToLayer: (feature, latlng) => {
              return L.marker(latlng, { icon: peee2024Icon });
            },
            onEachFeature: (feature, layer) => {
              const props = feature.properties || {};
              const nombre = `${props.NOMBRE || ''} ${props.APELLIDO_1 || ''}`.trim() || 'Participante';
              const sector = props.APELLIDO_2 || '-';
              const direccion = props.DIRECCIÓN || '-';
              const telefono = props.TELÉFONO || '-';
              
              layer.bindPopup(`
                <b>${nombre}</b><br>
                <strong>Sector:</strong> ${sector}<br>
                <strong>Dirección:</strong> ${direccion}<br>
                <strong>Teléfono:</strong> ${telefono}<br>
                <em>PEEE 2024</em>
              `);
              
              layer.on('click', () => {
                showInfo({
                  name: nombre,
                  tipo: 'PEEE 2024',
                  sector: sector,
                  direccion: direccion,
                  telefono: telefono
                });
              });
            }
          });
          
          const checkbox = document.getElementById('chk-peee-2024');
          if (checkbox && checkbox.checked) {
            layers['peee_2024'].addTo(map);
          }
          console.log('✓ Capa PEEE 2024 cargada con', convertedFeatures.length, 'participantes');
        })
        .catch(err => console.error('Error al cargar PEEE 2024:', err));
    };
    cargarPEEE2024();

    // Cargar capa PEEE 2025
    const cargarPEEE2025 = () => {
      const peee2025Icon = L.divIcon({
        className: 'peee-2025-icon',
        html: `<div style="
          width: 10px;
          height: 10px;
          background-color: #10b981;
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [10, 10],
        iconAnchor: [5, 5],
        popupAnchor: [0, -7]
      });

      fetch('datos/peee2025.geojson')
        .then(response => response.json())
        .then(data => {
          // Este archivo ya está en WGS84 (CRS84), no necesita conversión
          layers['peee_2025'] = L.geoJSON(data, {
            pointToLayer: (feature, latlng) => {
              return L.marker(latlng, { icon: peee2025Icon });
            },
            onEachFeature: (feature, layer) => {
              const props = feature.properties || {};
              const nombre = `${props.NOMBRE || ''} ${props.APELLIDO || ''}`.trim() || 'Participante';
              const direccion = props.DIRECCIÓN || '-';
              const telefono = props.TELÉFONO || '-';
              
              layer.bindPopup(`
                <b>${nombre}</b><br>
                <strong>Dirección:</strong> ${direccion}<br>
                <strong>Teléfono:</strong> ${telefono}<br>
                <em>PEEE 2025</em>
              `);
              
              layer.on('click', () => {
                showInfo({
                  name: nombre,
                  tipo: 'PEEE 2025',
                  direccion: direccion,
                  telefono: telefono
                });
              });
            }
          });
          
          const checkbox = document.getElementById('chk-peee-2025');
          if (checkbox && checkbox.checked) {
            layers['peee_2025'].addTo(map);
          }
          console.log('✓ Capa PEEE 2025 cargada con', data.features.length, 'participantes');
        })
        .catch(err => console.error('Error al cargar PEEE 2025:', err));
    };
    cargarPEEE2025();

    // Cargar mapa de calor PEEE 2024-2025 combinado
    const cargarPEEE2024_2025_Heatmap = () => {
      Promise.all([
        fetch('datos/pee2024.geojson').then(r => r.json()),
        fetch('datos/peee2025.geojson').then(r => r.json())
      ])
      .then(([data2024, data2025]) => {
        // Convertir datos 2024 de UTM a WGS84
        const points2024 = data2024.features.map(feature => {
          const [easting, northing] = feature.geometry.coordinates;
          const [lon, lat] = convertUTM19SToWGS84(easting, northing);
          return [lat, lon, 1]; // [lat, lng, intensity]
        });

        // Datos 2025 ya están en WGS84
        const points2025 = data2025.features.map(feature => {
          const [lon, lat] = feature.geometry.coordinates;
          return [lat, lon, 1]; // [lat, lng, intensity]
        });

        // Combinar ambos conjuntos de datos
        const allPoints = [...points2024, ...points2025];

        // Crear capa de mapa de calor con colores fuertes y mucho más visible
        layers['peee_2024_2025'] = L.heatLayer(allPoints, {
          radius: 35,          // Aumentado de 25 a 35 para mayor alcance
          blur: 25,            // Aumentado de 20 a 25 para mejor difuminado
          maxZoom: 17,
          max: 0.6,            // Reducido de 1.0 a 0.6 para mayor intensidad de color
          minOpacity: 0.5,     // Opacidad mínima para que siempre sea visible
          gradient: {
            0.0: '#0000ff',    // Azul fuerte
            0.15: '#00ffff',   // Cyan brillante
            0.3: '#00ff00',    // Verde neón
            0.45: '#ffff00',   // Amarillo intenso
            0.6: '#ff9900',    // Naranja fuerte
            0.75: '#ff0000',   // Rojo brillante
            1.0: '#ff00ff'     // Magenta para máxima intensidad
          }
        });

        // Asegurar que el heatmap se vea sobre otras capas
        if (layers['peee_2024_2025']._container) {
          layers['peee_2024_2025']._container.style.zIndex = 500;
        }

        const checkbox = document.getElementById('chk-peee-2024-2025');
        if (checkbox && checkbox.checked) {
          layers['peee_2024_2025'].addTo(map);
          // Asegurar z-index después de agregar al mapa
          setTimeout(() => {
            if (layers['peee_2024_2025']._container) {
              layers['peee_2024_2025']._container.style.zIndex = 500;
            }
          }, 100);
        }
        console.log('✓ Mapa de calor PEEE 2024-2025 cargado con', allPoints.length, 'puntos');
      })
      .catch(err => console.error('Error al cargar mapa de calor PEEE:', err));
    };
    cargarPEEE2024_2025_Heatmap();

    // === GRÁFICO DEFINIDO EN index.html ===
    // La función window.crearGraficoPEEEPorSector está definida en index.html
    console.log('ℹ️ Función del gráfico cargada desde HTML');

    // Botón para cerrar el gráfico
    const closeChartBtn = document.getElementById('closeChart');
    if (closeChartBtn) {
      closeChartBtn.addEventListener('click', () => {
        document.getElementById('chartContainer').style.display = 'none';
        // Desmarcar el checkbox de 2024-2025
        const checkbox = document.getElementById('chk-peee-2024-2025');
        if (checkbox) {
          checkbox.checked = false;
          // Remover la capa del mapa
          if (layers['peee_2024_2025'] && map.hasLayer(layers['peee_2024_2025'])) {
            map.removeLayer(layers['peee_2024_2025']);
          }
        }
      });
    }

    // Cargar capas de Educación Ambiental clasificadas por tipología
    const eduTipologias = {
      'Centro de Extensión': { 
        id: 'centros_extension', 
        checkbox: 'chk-edu-centros-extension',
        color: '#8b5cf6',
        label: 'Centro de Extensión'
      },
      'Jardín': { 
        id: 'jardines', 
        checkbox: 'chk-edu-jardines',
        color: '#f472b6',
        label: 'Jardín'
      },
      'Colegio': { 
        id: 'colegios', 
        checkbox: 'chk-edu-colegios',
        color: '#3b82f6',
        label: 'Colegio'
      },
      'Centro': { 
        id: 'centros', 
        checkbox: 'chk-edu-centros',
        color: '#10b981',
        label: 'Centro'
      },
      'CVT': { 
        id: 'cvt', 
        checkbox: 'chk-edu-cvt',
        color: '#f59e0b',
        label: 'CVT'
      },
      'Grupo Adulto Mayor': { 
        id: 'adulto_mayor', 
        checkbox: 'chk-edu-adulto-mayor',
        color: '#06b6d4',
        label: 'Grupo Adulto Mayor'
      },
      'Programa Somos Huerto': { 
        id: 'somos_huerto', 
        checkbox: 'chk-edu-somos-huerto',
        color: '#84cc16',
        label: 'Programa Somos Huerto'
      }
    };

    const cargarEducacionAmbiental = () => {
      fetch('datos/eduambiental.geojson')
        .then(response => response.json())
        .then(data => {
          // Agrupar features por tipología
          Object.entries(eduTipologias).forEach(([tipologia, config]) => {
            const featuresFiltered = data.features.filter(f => 
              f.properties.Tipologia === tipologia
            );

            if (featuresFiltered.length === 0) return;

            const filteredData = {
              type: 'FeatureCollection',
              features: featuresFiltered
            };

            // Crear ícono personalizado
            const eduIcon = L.divIcon({
              className: `edu-${config.id}-icon`,
              html: `<div style="
                width: 12px;
                height: 12px;
                background-color: ${config.color};
                border: 2px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              "></div>`,
              iconSize: [12, 12],
              iconAnchor: [6, 6],
              popupAnchor: [0, -8]
            });

            layers[config.id] = L.geoJSON(filteredData, {
              pointToLayer: (feature, latlng) => {
                return L.marker(latlng, { icon: eduIcon });
              },
              onEachFeature: (feature, layer) => {
                const props = feature.properties || {};
                const nombre = props.Name || 'Sin nombre';
                const popupInfo = props.PopupInfo || '-';
                
                layer.bindPopup(`
                  <b>${nombre}</b><br>
                  <strong>Tipo:</strong> ${config.label}<br>
                  <strong>Info:</strong> ${popupInfo}
                `);
                
                layer.on('click', () => {
                  showInfo({
                    name: nombre,
                    tipo: config.label,
                    info: popupInfo,
                    ...props
                  });
                });
              }
            });

            // Agregar la capa al mapa solo si el checkbox está marcado
            const checkbox = document.getElementById(config.checkbox);
            if (checkbox && checkbox.checked) {
              layers[config.id].addTo(map);
            }
          });
          
          console.log('✓ Capas de Educación Ambiental cargadas');
        })
        .catch(err => console.error('Error al cargar Educación Ambiental:', err));
    };
    cargarEducacionAmbiental();

    // ======= RESIMPLE: Zonas de Recolección =======
    const cargarReSimple = () => {
      fetch('datos/resimples.geojson')
        .then(response => response.json())
        .then(data => {
          console.log('📊 ReSimple data loaded:', data.features.length, 'features');
          
          // Agrupar por zona licitada
          const zonas = {
            'zona1': {
              id: 'resimple_zona1',
              nombre: 'Zona Licitada 1',
              checkbox: 'chk-resimple-zona1',
              color: '#3b82f6', // Azul
              features: []
            },
            'zona2': {
              id: 'resimple_zona2',
              nombre: 'Zona Licitada 2',
              checkbox: 'chk-resimple-zona2',
              color: '#ef4444', // Rojo
              features: []
            },
            'zona3': {
              id: 'resimple_zona3',
              nombre: 'Zona Licitada 3',
              checkbox: 'chk-resimple-zona3',
              color: '#10b981', // Verde
              features: []
            }
          };

          // Clasificar features por zona
          data.features.forEach(feature => {
            const zonaStr = (feature.properties.zonas || '').toLowerCase().trim();
            
            if (zonaStr.includes('zona licitada 1')) {
              zonas.zona1.features.push(feature);
            } else if (zonaStr.includes('zona licitada 2')) {
              zonas.zona2.features.push(feature);
            } else if (zonaStr.includes('zona licitada 3')) {
              zonas.zona3.features.push(feature);
            }
          });

          // Crear capas para cada zona
          Object.values(zonas).forEach(zona => {
            if (zona.features.length === 0) return;

            const zonaData = {
              type: 'FeatureCollection',
              features: zona.features
            };

            // Crear capa con etiquetas de días
            layers[zona.id] = L.layerGroup();
            
            // Capa de polígonos
            const polygonLayer = L.geoJSON(zonaData, {
              style: {
                fillColor: zona.color,
                fillOpacity: 0.3,
                color: zona.color,
                weight: 2,
                opacity: 0.8
              },
              onEachFeature: (feature, layer) => {
                const props = feature.properties || {};
                const dia = (props.Name || '').trim();
                const zonaName = props.zonas || '-';
                
                // Popup
                layer.bindPopup(`
                  <b>ReSimple - ${zona.nombre}</b><br>
                  <strong>Día:</strong> ${dia}<br>
                  <strong>Zona:</strong> ${zonaName}
                `);
                
                // Click handler
                layer.on('click', () => {
                  showInfo({
                    name: zona.nombre,
                    dia: dia,
                    zona: zonaName,
                    ...props
                  });
                });
              }
            });
            
            layers[zona.id].addLayer(polygonLayer);

            // Agregar labels para cada feature
            zona.features.forEach(feature => {
              const props = feature.properties || {};
              const dia = (props.Name || '').trim().toUpperCase();
              
              // Calcular centroide del polígono
              if (feature.geometry && feature.geometry.coordinates) {
                try {
                  const coords = feature.geometry.coordinates[0][0]; // Primer anillo del multipolígono
                  if (coords && coords.length > 0) {
                    // Calcular centro promedio
                    let latSum = 0, lngSum = 0;
                    coords.forEach(coord => {
                      lngSum += coord[0];
                      latSum += coord[1];
                    });
                    const centerLng = lngSum / coords.length;
                    const centerLat = latSum / coords.length;
                    
                    // Crear marker invisible con divIcon para el label
                    const label = L.marker([centerLat, centerLng], {
                      icon: L.divIcon({
                        className: 'resimple-label',
                        html: `<div style="
                          background-color: ${zona.color};
                          color: white;
                          padding: 3px 8px;
                          border-radius: 4px;
                          font-size: 10px;
                          font-weight: bold;
                          text-align: center;
                          white-space: nowrap;
                          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                        ">${dia}</div>`,
                        iconSize: null,
                        iconAnchor: [0, 0]
                      }),
                      interactive: false
                    });
                    
                    layers[zona.id].addLayer(label);
                  }
                } catch (e) {
                  console.warn('Error creando label para feature:', e);
                }
              }
            });

            // Agregar al mapa si el checkbox está marcado
            const checkbox = document.getElementById(zona.checkbox);
            if (checkbox && checkbox.checked) {
              layers[zona.id].addTo(map);
            }
          });
          
          console.log('✓ Capas ReSimple cargadas:', Object.values(zonas).map(z => `${z.nombre}: ${z.features.length} features`).join(', '));
        })
        .catch(err => console.error('Error al cargar ReSimple:', err));
    };
    cargarReSimple();

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
      'chk-prc': 'prc',
      'chk-sectores': 'sectores',
      'chk-unidades': 'unidades_vecinales',
      'chk-villas': 'villas',
      'chk-sedes': 'sedes_sociales',
      'chk-peee-2024': 'peee_2024',
      'chk-peee-2025': 'peee_2025',
      'chk-peee-2024-2025': 'peee_2024_2025',
      'chk-puntos-limpios': 'puntos_limpios',
      'chk-puntos-verdes-comunidad': 'puntos_verdes_comunidad',
      'chk-puntos-verdes-internos': 'puntos_verdes_internos',
      'chk-intervenciones-comunales': 'intervenciones_comunales',
      'chk-edu-centros-extension': 'centros_extension',
      'chk-edu-jardines': 'jardines',
      'chk-edu-colegios': 'colegios',
      'chk-edu-centros': 'centros',
      'chk-edu-cvt': 'cvt',
      'chk-edu-adulto-mayor': 'adulto_mayor',
      'chk-edu-somos-huerto': 'somos_huerto',
      'chk-resimple-zona1': 'resimple_zona1',
      'chk-resimple-zona2': 'resimple_zona2',
      'chk-resimple-zona3': 'resimple_zona3'
    };

    // Initialize checkbox behavior
    Object.entries(layerCheckboxes).forEach(([checkboxId, layerName]) => {
      const checkbox = document.getElementById(checkboxId);
      if (!checkbox) return;

      // Special handling for PRC checkbox (independent layer)
      if (checkboxId === 'chk-prc') {
        checkbox.checked = false; // Default unchecked
        checkbox.addEventListener('change', (ev) => {
          if (layers['prc']) {
            if (ev.target.checked) {
              if (!map.hasLayer(layers['prc'])) {
                layers['prc'].addTo(map);
              }
            } else {
              if (map.hasLayer(layers['prc'])) {
                map.removeLayer(layers['prc']);
              }
            }
          }
        });
        return;
      }

      // Special handling for sectores checkbox (independent layer)
      if (checkboxId === 'chk-sectores') {
        checkbox.checked = false; // Default unchecked
        checkbox.addEventListener('change', (ev) => {
          if (layers['sectores']) {
            if (ev.target.checked) {
              if (!map.hasLayer(layers['sectores'])) {
                layers['sectores'].addTo(map);
              }
            } else {
              if (map.hasLayer(layers['sectores'])) {
                map.removeLayer(layers['sectores']);
              }
            }
          }
        });
        return;
      }

      // Special handling for villas checkbox (independent layer)
      if (checkboxId === 'chk-villas') {
        checkbox.checked = false; // Default unchecked
        checkbox.addEventListener('change', (ev) => {
          const villasPanel = document.getElementById('villasPanel');
          
          if (layers['villas']) {
            if (ev.target.checked) {
              // Mostrar capa y panel
              if (!map.hasLayer(layers['villas'])) {
                layers['villas'].addTo(map);
              }
              if (villasPanel) {
                villasPanel.style.display = 'block';
              }
            } else {
              // Ocultar capa y panel
              if (map.hasLayer(layers['villas'])) {
                map.removeLayer(layers['villas']);
              }
              if (villasPanel) {
                villasPanel.style.display = 'none';
              }
              // Limpiar resaltado si existe (CORREGIDO: siempre limpiar al desactivar)
              if (selectedVillaLayer) {
                if (map.hasLayer(selectedVillaLayer)) {
                  map.removeLayer(selectedVillaLayer);
                }
                selectedVillaLayer = null;
              }
              
              // Limpiar cualquier popup abierto de villas
              map.closePopup();
              
              // Remover cualquier clase de selección en la lista de villas
              const villaItems = document.querySelectorAll('.villa-item.selected');
              villaItems.forEach(item => item.classList.remove('selected'));
            }
          }
        });
        return;
      }

      // Special handling for unidades vecinales checkbox (independent layer)
      if (checkboxId === 'chk-unidades') {
        checkbox.checked = false; // Default unchecked
        checkbox.addEventListener('change', (ev) => {
          if (layers['unidades_vecinales']) {
            if (ev.target.checked) {
              if (!map.hasLayer(layers['unidades_vecinales'])) {
                layers['unidades_vecinales'].addTo(map);
              }
            } else {
              if (map.hasLayer(layers['unidades_vecinales'])) {
                map.removeLayer(layers['unidades_vecinales']);
              }
            }
          }
        });
        return;
      }

      // Special handling for sedes sociales checkbox (independent layer)
      if (checkboxId === 'chk-sedes') {
        checkbox.checked = false; // Default unchecked
        checkbox.addEventListener('change', (ev) => {
          if (layers['sedes_sociales']) {
            if (ev.target.checked) {
              if (!map.hasLayer(layers['sedes_sociales'])) {
                layers['sedes_sociales'].addTo(map);
              }
            } else {
              if (map.hasLayer(layers['sedes_sociales'])) {
                map.removeLayer(layers['sedes_sociales']);
              }
            }
          }
        });
        return;
      }

      // Special handling for puntos limpios checkbox (independent layer)
      if (checkboxId === 'chk-puntos-limpios') {
        checkbox.checked = false; // Default unchecked
        checkbox.addEventListener('change', (ev) => {
          if (layers['puntos_limpios']) {
            if (ev.target.checked) {
              if (!map.hasLayer(layers['puntos_limpios'])) {
                layers['puntos_limpios'].addTo(map);
              }
            } else {
              if (map.hasLayer(layers['puntos_limpios'])) {
                map.removeLayer(layers['puntos_limpios']);
              }
            }
          }
        });
        return;
      }

      // Special handling for puntos verdes comunidad checkbox (independent layer)
      if (checkboxId === 'chk-puntos-verdes-comunidad') {
        checkbox.checked = false; // Default unchecked
        checkbox.addEventListener('change', (ev) => {
          if (layers['puntos_verdes_comunidad']) {
            if (ev.target.checked) {
              if (!map.hasLayer(layers['puntos_verdes_comunidad'])) {
                layers['puntos_verdes_comunidad'].addTo(map);
              }
            } else {
              if (map.hasLayer(layers['puntos_verdes_comunidad'])) {
                map.removeLayer(layers['puntos_verdes_comunidad']);
              }
            }
          }
        });
        return;
      }

      // Special handling for puntos verdes internos checkbox (independent layer)
      if (checkboxId === 'chk-puntos-verdes-internos') {
        checkbox.checked = false; // Default unchecked
        checkbox.addEventListener('change', (ev) => {
          if (layers['puntos_verdes_internos']) {
            if (ev.target.checked) {
              if (!map.hasLayer(layers['puntos_verdes_internos'])) {
                layers['puntos_verdes_internos'].addTo(map);
              }
            } else {
              if (map.hasLayer(layers['puntos_verdes_internos'])) {
                map.removeLayer(layers['puntos_verdes_internos']);
              }
            }
          }
        });
        return;
      }

      // Special handling for PEEE 2024 checkbox (independent layer)
      if (checkboxId === 'chk-peee-2024') {
        checkbox.checked = false; // Default unchecked
        checkbox.addEventListener('change', (ev) => {
          if (layers['peee_2024']) {
            if (ev.target.checked) {
              if (!map.hasLayer(layers['peee_2024'])) {
                layers['peee_2024'].addTo(map);
              }
            } else {
              if (map.hasLayer(layers['peee_2024'])) {
                map.removeLayer(layers['peee_2024']);
              }
            }
          }
        });
        return;
      }

      // Special handling for PEEE 2025 checkbox (independent layer)
      if (checkboxId === 'chk-peee-2025') {
        checkbox.checked = false; // Default unchecked
        checkbox.addEventListener('change', (ev) => {
          if (layers['peee_2025']) {
            if (ev.target.checked) {
              if (!map.hasLayer(layers['peee_2025'])) {
                layers['peee_2025'].addTo(map);
              }
            } else {
              if (map.hasLayer(layers['peee_2025'])) {
                map.removeLayer(layers['peee_2025']);
              }
            }
          }
        });
        return;
      }

      // Special handling for PEEE 2024-2025 heatmap checkbox (independent layer)
      if (checkboxId === 'chk-peee-2024-2025') {
        checkbox.checked = false; // Default unchecked
        checkbox.addEventListener('change', (ev) => {
          console.log('🔘 Checkbox 2024-2025 cambiado:', ev.target.checked);
          if (layers['peee_2024_2025']) {
            if (ev.target.checked) {
              if (!map.hasLayer(layers['peee_2024_2025'])) {
                layers['peee_2024_2025'].addTo(map);
                // Asegurar que el heatmap se vea sobre otras capas
                setTimeout(() => {
                  if (layers['peee_2024_2025']._container) {
                    layers['peee_2024_2025']._container.style.zIndex = 500;
                  }
                }, 100);
              }
              // Mostrar el gráfico
              console.log('📊 Mostrando contenedor del gráfico...');
              const container = document.getElementById('chartContainer');
              console.log('Contenedor encontrado:', container);
              container.style.display = 'block';
              
              // Esperar a que el contenedor sea visible antes de crear el gráfico
              setTimeout(() => {
                console.log('🎨 Llamando a window.crearGraficoPEEEPorSector()...');
                if (typeof window.crearGraficoPEEEPorSector === 'function') {
                  window.crearGraficoPEEEPorSector();
                } else {
                  console.error('❌ La función window.crearGraficoPEEEPorSector no está disponible');
                }
              }, 300);
            } else {
              if (map.hasLayer(layers['peee_2024_2025'])) {
                map.removeLayer(layers['peee_2024_2025']);
              }
              // Ocultar el gráfico
              document.getElementById('chartContainer').style.display = 'none';
            }
          }
        });
        return;
      }

      // Special handling for education layers (independent layers)
      const eduCheckboxes = [
        'chk-edu-centros-extension',
        'chk-edu-jardines', 
        'chk-edu-colegios',
        'chk-edu-centros',
        'chk-edu-cvt',
        'chk-edu-adulto-mayor',
        'chk-edu-somos-huerto'
      ];
      
      if (eduCheckboxes.includes(checkboxId)) {
        checkbox.checked = false; // Default unchecked
        checkbox.addEventListener('change', (ev) => {
          if (layers[layerName]) {
            if (ev.target.checked) {
              if (!map.hasLayer(layers[layerName])) {
                layers[layerName].addTo(map);
              }
            } else {
              if (map.hasLayer(layers[layerName])) {
                map.removeLayer(layers[layerName]);
              }
            }
          }
        });
        return;
      }

      // Special handling for ReSimple layers (independent layers)
      const resimpleCheckboxes = [
        'chk-resimple-zona1',
        'chk-resimple-zona2',
        'chk-resimple-zona3'
      ];
      
      if (resimpleCheckboxes.includes(checkboxId)) {
        checkbox.checked = false; // Default unchecked
        checkbox.addEventListener('change', (ev) => {
          if (layers[layerName]) {
            if (ev.target.checked) {
              if (!map.hasLayer(layers[layerName])) {
                layers[layerName].addTo(map);
              }
            } else {
              if (map.hasLayer(layers[layerName])) {
                map.removeLayer(layers[layerName]);
              }
            }
          }
        });
        return;
      }

      // If this checkbox maps to the combined intervenciones layer but is a sub-item
      // we keep them as visual-only and sync them
      // to the master checkbox.
      const isSubItem = [].includes(checkboxId);

      // Master checkbox for the combined layer
      if (checkboxId === 'chk-intervenciones-comunales') {
        // default unchecked
        checkbox.checked = false;
        checkbox.addEventListener('change', (ev) => {
          if (ev.target.checked) {
            layers['intervenciones_comunales'].addTo(map);
          } else {
            map.removeLayer(layers['intervenciones_comunales']);
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

// ========================================
// === MOBILE MENU FUNCTIONALITY ===
// ========================================

document.addEventListener('DOMContentLoaded', function() {
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  
  if (!mobileMenuToggle || !sidebar || !sidebarOverlay) {
    console.warn('Elementos del menú móvil no encontrados');
    return;
  }
  
  // Función para abrir/cerrar sidebar
  function toggleSidebar() {
    const isActive = sidebar.classList.contains('active');
    
    if (isActive) {
      // Cerrar
      sidebar.classList.remove('active');
      sidebarOverlay.classList.remove('active');
      mobileMenuToggle.classList.remove('active');
      document.body.style.overflow = ''; // Restaurar scroll
    } else {
      // Abrir
      sidebar.classList.add('active');
      sidebarOverlay.classList.add('active');
      mobileMenuToggle.classList.add('active');
      document.body.style.overflow = 'hidden'; // Prevenir scroll del body
    }
  }
  
  // Click en botón hamburguesa
  mobileMenuToggle.addEventListener('click', toggleSidebar);
  
  // Click en overlay cierra el sidebar
  sidebarOverlay.addEventListener('click', toggleSidebar);
  
  // DESACTIVADO: No cerrar sidebar automáticamente al seleccionar una capa
  // El usuario debe cerrar manualmente el sidebar con el botón hamburguesa o el overlay
  /*
  const checkboxes = sidebar.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      if (window.innerWidth <= 768) {
        setTimeout(() => {
          if (sidebar.classList.contains('active')) {
            toggleSidebar();
          }
        }, 300);
      }
    });
  });
  */
  
  // Cerrar sidebar al redimensionar a desktop
  window.addEventListener('resize', function() {
    if (window.innerWidth > 768 && sidebar.classList.contains('active')) {
      sidebar.classList.remove('active');
      sidebarOverlay.classList.remove('active');
      mobileMenuToggle.classList.remove('active');
      document.body.style.overflow = '';
    }
  });
  
  console.log('✅ Mobile menu initialized');
  
  // ============================================
  // BUSCADOR DE CALLES Y UBICACIONES
  // ============================================
  
  let streetSearchMarker = null;
  
  function buscarCalle(query) {
    if (!query || query.trim().length < 2) {
      alert('⚠️ Por favor ingrese al menos 2 caracteres para buscar');
      return;
    }
    
    
    const searchInput = query.trim();
    const btnStreetSearch = document.getElementById('btnStreetSearch');
    const originalHTML = btnStreetSearch.innerHTML;
    
    // Indicador de carga
    btnStreetSearch.innerHTML = '⏳';
    btnStreetSearch.disabled = true;
    
    console.log('🔍 BÚSQUEDA INICIADA:', searchInput);
    
    // URL simple y directa
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchInput + ', Puente Alto, Chile')}&format=json&limit=3`;
    console.log('🌐 URL:', url);
    
    fetch(url)
      .then(response => {
        console.log('📡 Status:', response.status);
        return response.json();
      })
      .then(data => {
        console.log('📊 Resultados:', data.length);
        btnStreetSearch.innerHTML = originalHTML;
        btnStreetSearch.disabled = false;
        
        if (!data || data.length === 0) {
          alert(`❌ Sin resultados para "${searchInput}"`);
          return;
        }
        
        const lugar = data[0];
        const lat = parseFloat(lugar.lat);
        const lon = parseFloat(lugar.lon);
        
        console.log('✅ ENCONTRADO:', lugar.display_name);
        
        if (streetSearchMarker && map.hasLayer(streetSearchMarker)) {
          map.removeLayer(streetSearchMarker);
        }
        
        streetSearchMarker = L.marker([lat, lon], {
          icon: L.divIcon({
            className: 'marker-azul',
            html: `<div style="background: #3b82f6; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 3px 10px rgba(59,130,246,0.6); display: flex; align-items: center; justify-content: center;"><span style="transform: rotate(45deg); font-size: 16px; color: white;">📍</span></div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 30]
          })
        }).addTo(map);
        
        streetSearchMarker.bindPopup(`<div style="padding: 8px;"><b style="color: #3b82f6;">📍 ${searchInput}</b><br><div style="font-size: 11px; margin-top: 4px;">${lugar.display_name}</div></div>`).openPopup();
        
        map.setView([lat, lon], 17, { animate: true });
        
        console.log('✅ MARCADOR CREADO');
      })
      .catch(error => {
        console.error('ERROR:', error);
        btnStreetSearch.innerHTML = originalHTML;
        btnStreetSearch.disabled = false;
        alert('Error: ' + error.message);
      });
  }
  
  
  // Event listener para el botón de búsqueda de calles
  const btnStreetSearch = document.getElementById('btnStreetSearch');
  const streetSearchInput = document.getElementById('streetSearch');
  
  if (btnStreetSearch && streetSearchInput) {
    btnStreetSearch.addEventListener('click', () => {
      const query = streetSearchInput.value;
      buscarCalle(query);
    });
    
    // Permitir buscar con Enter
    streetSearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = streetSearchInput.value;
        buscarCalle(query);
      }
    });
    
    console.log('✅ Street search initialized');
  }
});

