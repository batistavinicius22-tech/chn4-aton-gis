/* ==========================================================================
   CENTRO DE HIDROGRAFIA DO NORTE (CHN-4 / 4º DISTRITO NAVAL)
   SISTEMA DE GESTÃO DE AUXÍLIOS À NAVEGAÇÃO (AtoN)
   Código JavaScript ES6+ — Suporte a BD JSON, Responsável, Interoperabilidade & Realtime
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // =========================================================================
    // 1. DADOS INICIAIS BASE & BASES NAVAIS DO CHN-4
    // =========================================================================
    const initialSignals = [
        {
            code: "PA-05",
            name: "PEDRAS DA BARRA",
            type: "BZ (Bóia de Balizamento)",
            status: "OPERACIONAL",
            lat: -1.3713333,
            lng: -48.4905,
            characteristic: "Lp. V. 3s 4m 6NM",
            rangeNM: 6,
            altitudeM: 4,
            jurisdiction: "CHN-4 / Baía do Guajará",
            responsavel: "CHN-4",
            image: null,
            photoDate: null,
            history: [
                { date: "2026-08-10 10:00", status: "OPERACIONAL", note: "Importado da base do CHN-4. Operando normalmente." }
            ]
        },
        {
            code: "PA-10",
            name: "VAL-DE-CÃES",
            type: "BZ (Bóia de Balizamento)",
            status: "OPERACIONAL",
            lat: -1.3895,
            lng: -48.4931667,
            characteristic: "Lp. E. 4s 5m 6NM",
            rangeNM: 6,
            altitudeM: 5,
            jurisdiction: "CHN-4 / Baía do Guajará",
            responsavel: "CHN-4",
            image: null,
            photoDate: null,
            history: [
                { date: "2026-08-10 10:00", status: "OPERACIONAL", note: "Importado da base do CHN-4. Operando normalmente." }
            ]
        },
        {
            code: "PA-20",
            name: "PONTA DO MAGUARI",
            type: "BC (Bóia Cega)",
            status: "A DERIVA",
            lat: -2.7755,
            lng: -55.0371667,
            characteristic: "Cega (Sem iluminação)",
            rangeNM: 0,
            altitudeM: 3,
            jurisdiction: "Capitania Fluvial de Santarém",
            responsavel: "CHN-4",
            image: null,
            photoDate: "2026-06-25",
            history: [
                { date: "2026-06-25 13:43", status: "A DERIVA", note: "Notificação CFAREM: Sinal DESAPARECIDO / Garreado de sua posição original." }
            ]
        }
    ];

    const navalBases = {
        belem: { name: "Base Naval de Val-de-Cães (Belém / CHN-4)", lat: -1.41111, lng: -48.48722 },
        macapa: { name: "Capitania dos Portos do Amapá (Macapá)", lat: 0.04000, lng: -51.05000 },
        santarem: { name: "Capitania Fluvial de Santarém", lat: -2.42167, lng: -54.71000 },
        salinopolis: { name: "Ponto Focal Salinópolis (Atalaia)", lat: -0.60000, lng: -47.36000 },
        custom: { name: "Ponto de Partida Personalizado", lat: -1.41111, lng: -48.48722 }
    };

    // State Variables
    let signalsData = (typeof googleEarthSignals !== 'undefined' && Array.isArray(googleEarthSignals) && googleEarthSignals.length > 0)
        ? [...googleEarthSignals]
        : [...initialSignals];
    let selectedSignal = null;
    let currentFilter = 'all';
    let currentSearch = '';
    let currentTypeFilter = 'ALL'; // Category filter: ALL | FAROL | FAROLETE | BOIA | BALIZA
    let currentResponsavelFilter = 'ALL'; // Responsible filter: ALL | CHN-4 | CPAP | CPMA | CPPA | Extra-MB
    let isPickingPosition = false; // map-click-to-pick mode for new signal form
    let isPickingBasePosition = false; // map-click-to-pick mode for custom departure point
    
    // Waypoints for Navigation Route (Derrota Náutica)
    let routeWaypoints = []; 
    let waypointMarkers = [];
    let isDrawDerrotaMode = false;
    let isRouteVisible = false; // Control visibility of route markers and polyline on map

    // Map & Layers State
    let mapMarkers = {}; 
    let routePolyline = null;
    let measurePolyline = null;
    let isMeasureMode = false;
    let measurePoints = [];

    // GeoTIFF Overlays State
    let geotiffLayers = []; // Array of { id, name, layer, opacity }
    const dhnGeoTiffGroup = L.layerGroup(); // Dedicated Layer Group for DHN GeoTIFF charts

    // =========================================================================
    // 2. INICIALIZAÇÃO DO MAPA LEAFLET E CAMADAS
    // =========================================================================
    const map = L.map('map', {
        center: [-0.5, -49.0],
        zoom: 8,
        zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Layer 1: Esri World Imagery
    const satLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri World Imagery',
        maxZoom: 18
    });

    // Layer 2: Google Satellite PURE (no labels, default)
    const googleSatLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: 'Google Satellite',
        maxZoom: 20
    });

    // Layer 2b: Google Labels Overlay (city/road names - toggled separately)
    const googleLabelsLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=h&x={x}&y={y}&z={z}', {
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: 'Google Labels',
        maxZoom: 20,
        pane: 'overlayPane'
    });

    // Layer 3: Nautical Base Charts (OpenSeaMap & Esri Ocean)
    const esriOceanLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri Ocean Basemap',
        maxZoom: 13
    });

    const openSeaMapLayer = L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
        attribution: 'OpenSeaMap',
        maxZoom: 18
    });

    const nauticalGroup = L.layerGroup([esriOceanLayer, openSeaMapLayer]);
    // Por padrão: apenas o Satélite do Google sem rótulos e sem camadas IDEM ativadas
    googleSatLayer.addTo(map);

    // Servidor base WMS: usa o proxy local /api/wms-proxy quando rodando no servidor local, ou direto na web
    const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const geoserverWmsUrl = isLocalHost ? '/api/wms-proxy' : 'https://idem.marinha.mil.br/geoserver/wms';

    function attachWmsResilience(layer) {
        layer.on('tileerror', function(error) {
            const tile = error.tile;
            if (tile) {
                const retries = (tile._retryCount || 0) + 1;
                tile._retryCount = retries;
                if (retries <= 4) {
                    setTimeout(() => {
                        if (tile && tile.src) {
                            const cleanSrc = tile.src.split('&_retry=')[0];
                            tile.src = cleanSrc + '&_retry=' + Date.now() + '_' + retries;
                        }
                    }, retries * 1000);
                }
            }
        });
        return layer;
    }

    const defaultWmsOptions = {
        format: 'image/png',
        transparent: true,
        version: '1.1.1',
        uppercase: true,
        tileSize: 512,
        zoomOffset: -1,
        updateWhenIdle: true,
        updateWhenZooming: false,
        keepBuffer: 8
    };

    function createDHNChartWMS(layerName, title) {
        const layer = L.tileLayer.wms(geoserverWmsUrl, {
            ...defaultWmsOptions,
            layers: `carta_nautica:${layerName}`,
            attribution: `Marinha do Brasil / DHN (${title})`
        });
        return attachWmsResilience(layer);
    }

    // Mosaico com as principais Cartas Náuticas da jurisdição do CHN-4 (Belém, Macapá, Santarém, Maranhão)
    const mosaicoCartasChn4Wms = attachWmsResilience(L.tileLayer.wms(geoserverWmsUrl, {
        ...defaultWmsOptions,
        layers: 'carta_nautica:carta_320,carta_nautica:carta_321,carta_nautica:carta_303,carta_nautica:carta_304,carta_nautica:carta_4011,carta_nautica:carta_4020A,carta_nautica:carta_411,carta_nautica:carta_221,carta_nautica:carta_232',
        attribution: 'Marinha do Brasil / DHN (Mosaico de Cartas Náuticas CHN-4)'
    }));

    const carta320Wms = createDHNChartWMS('carta_320', 'Carta 320 - Porto de Belém');
    const carta321Wms = createDHNChartWMS('carta_321', 'Carta 321 - Porto de Vila do Conde');
    const carta303Wms = createDHNChartWMS('carta_303', 'Carta 303 - Baía do Guajará / Mosqueiro');
    const carta304Wms = createDHNChartWMS('carta_304', 'Carta 304 - Mosqueiro a Vila do Conde');
    const carta4011Wms = createDHNChartWMS('carta_4011', 'Carta 4011 - Macapá à Ilha Salvador');
    const carta4020AWms = createDHNChartWMS('carta_4020A', 'Carta 4020A - Porto de Santarém');
    const carta411Wms = createDHNChartWMS('carta_411', 'Carta 411 - Baía de São Marcos / Maranhão');
    const carta221Wms = createDHNChartWMS('carta_221', 'Carta 221 - Barra Norte do Rio Amazonas');
    const carta232Wms = createDHNChartWMS('carta_232', 'Carta 232 - Barra Sul do Rio Amazonas');

    const dhnEncLimitsWms = attachWmsResilience(L.tileLayer.wms(geoserverWmsUrl, {
        ...defaultWmsOptions,
        layers: 'carta_nautica:limites_enc',
        attribution: 'Marinha do Brasil / DHN / IDEM'
    }));

    const zeeWms = attachWmsResilience(L.tileLayer.wms(geoserverWmsUrl, {
        ...defaultWmsOptions,
        layers: 'leplac:ZONA_ECONOMICA_EXCLUSIVA',
        attribution: 'Marinha do Brasil / LEPLAC'
    }));

    const marTerritorialWms = attachWmsResilience(L.tileLayer.wms(geoserverWmsUrl, {
        ...defaultWmsOptions,
        layers: 'leplac:BR-12M-Line',
        attribution: 'Marinha do Brasil / DHN'
    }));

    const linhaBaseWms = attachWmsResilience(L.tileLayer.wms(geoserverWmsUrl, {
        ...defaultWmsOptions,
        layers: 'leplac:BaseLine_Complete_Line',
        attribution: 'Marinha do Brasil / DHN'
    }));

    const baseLayers = {
        "Satélite Google": googleSatLayer,
        "Satélite Esri Imagery": satLayer,
        "Carta Náutica Base (Ocean/OpenSeaMap)": nauticalGroup
    };

    const overlays = {
        "🗺️ Mosaico Cartas Náuticas CHN-4 (IDEM-DHN)": mosaicoCartasChn4Wms,
        "⚓ Carta 320 — Porto de Belém (DHN)": carta320Wms,
        "⚓ Carta 321 — Porto de Vila do Conde (DHN)": carta321Wms,
        "⚓ Carta 303 — Cabo Maguari a Mosqueiro (DHN)": carta303Wms,
        "⚓ Carta 304 — Mosqueiro a Vila do Conde (DHN)": carta304Wms,
        "⚓ Carta 4011 — Macapá à Ilha Salvador (DHN)": carta4011Wms,
        "⚓ Carta 4020A — Porto de Santarém (DHN)": carta4020AWms,
        "⚓ Carta 411 — Baía de São Marcos (DHN)": carta411Wms,
        "⚓ Carta 221 — Barra Norte do Rio Amazonas (DHN)": carta221Wms,
        "⚓ Carta 232 — Barra Sul do Rio Amazonas (DHN)": carta232Wms,
        "🏙️ Nomes de Cidades (Google)": googleLabelsLayer,
        "🗺️ Cartas Náuticas Locais (GeoTIFF .tif)": dhnGeoTiffGroup,
        "📐 Limites das Cartas Eletrônicas ENC (DHN)": dhnEncLimitsWms,
        "🌊 Limite da Zona Econômica Exclusiva ZEE (DHN)": zeeWms,
        "📏 Mar Territorial 12 Milhas (DHN)": marTerritorialWms,
        "📏 Linha de Base Marítima (DHN)": linhaBaseWms
    };

    L.control.layers(baseLayers, overlays, { position: 'topright' }).addTo(map);

    // Forçar redesenho WMS e recarregamento automático se a camada for ativada
    map.on('overlayadd', (e) => {
        if (e.layer && typeof e.layer.redraw === 'function') {
            e.layer.redraw();
        }
    });

    const activeNameSpan = document.getElementById('activeLayerName');
    if (activeNameSpan) activeNameSpan.textContent = "Satélite Google";

    map.on('baselayerchange', (e) => {
        const nameSpan = document.getElementById('activeLayerName');
        if (nameSpan) nameSpan.textContent = e.name;
    });

    // Auto-load local DHN GeoTIFF charts (e.g. 320geotiff.tif and 10geotiff.tif)
    async function autoLoadLocalDHNCharts() {
        const filesToTry = ['./cartas_geotiff/320geotiff.tif', './cartas_geotiff/10geotiff.tif'];
        for (const filePath of filesToTry) {
            try {
                const resp = await fetch(filePath);
                if (!resp.ok) continue;
                const arrayBuffer = await resp.arrayBuffer();

                if (typeof parseGeoRaster !== 'undefined') {
                    const georaster = await parseGeoRaster(arrayBuffer);
                    const layer = new GeoRasterLayer({
                        georaster: georaster,
                        opacity: 0.85,
                        resolution: 256
                    });

                    layer.addTo(dhnGeoTiffGroup);

                    const fname = filePath.split('/').pop();
                    const layerId = `dhn-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
                    geotiffLayers.push({
                        id: layerId,
                        name: `Carta DHN (${fname})`,
                        layer: layer,
                        opacity: 0.85
                    });
                    renderGeoTIFFLayersList();
                }
            } catch (err) {
                console.warn(`Tentativa de autocarregar ${filePath}:`, err);
            }
        }
    }

    autoLoadLocalDHNCharts();

    // =========================================================================
    // 3. FÓRMULAS NÁUTICAS & AUXILIARES
    // =========================================================================
    function isOperational(status) {
        if (!status) return false;
        const s = String(status).trim().toUpperCase();
        return s === 'OPERACIONAL' || s === 'OPERANDO NORMALMENTE' || s.includes('🟢');
    }

    function haversineNM(lat1, lon1, lat2, lon2) {
        const R_NM = 3440.065;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R_NM * c;
    }

    function calculateBearing(lat1, lon1, lat2, lon2) {
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;
        const y = Math.sin(Δλ) * Math.cos(φ2);
        const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
        const θ = Math.atan2(y, x);
        const bearing = (θ * 180 / Math.PI + 360) % 360;
        return Math.round(bearing);
    }

    function toDMS(deg, isLat) {
        const absolute = Math.abs(deg);
        const degrees = Math.floor(absolute);
        const minutesNotTruncated = (absolute - degrees) * 60;
        const minutes = Math.floor(minutesNotTruncated);
        const seconds = ((minutesNotTruncated - minutes) * 60).toFixed(1);
        const dir = isLat ? (deg >= 0 ? 'N' : 'S') : (deg >= 0 ? 'E' : 'W');
        return `${degrees}° ${minutes}' ${seconds}" ${dir}`;
    }

    function getFormattedTimestampZ() {
        const now = new Date();
        const dd = String(now.getUTCDate()).padStart(2, '0');
        const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
        const yyyy = now.getUTCFullYear();
        const hh = String(now.getUTCHours()).padStart(2, '0');
        const min = String(now.getUTCMinutes()).padStart(2, '0');
        return `${dd}/${mm}/${yyyy} ${hh}:${min}Z`;
    }

    function showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = '<i class="fa-solid fa-circle-info"></i>';
        if (type === 'success') icon = '<i class="fa-solid fa-circle-check"></i>';
        if (type === 'danger') icon = '<i class="fa-solid fa-triangle-exclamation"></i>';
        
        toast.innerHTML = `${icon} <span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3800);
    }

    // =========================================================================
    // 4. BANCO DE DADOS CENTRAL COMPARTILHADO (API REST / SIGNALS.JSON / FIRESTORE / LOCALSTORAGE)
    // =========================================================================
    function saveLocalCache() {
        try {
            const payload = {
                timestamp: Date.now(),
                signals: signalsData
            };
            localStorage.setItem('chn4_aton_signals_cache', JSON.stringify(payload));
        } catch (e) {
            console.warn('Erro ao salvar no localStorage:', e);
        }
    }

    function loadLocalCache() {
        try {
            const raw = localStorage.getItem('chn4_aton_signals_cache');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && Array.isArray(parsed.signals) && parsed.signals.length > 0) {
                    return parsed.signals;
                }
            }
        } catch (e) {
            console.warn('Erro ao ler localStorage:', e);
        }
        return null;
    }

    async function loadSignalsFromBackend() {
        // Se o Firebase estiver ativo, o listener em tempo real (onSnapshot) gerencia a sincronização
        if (typeof isFirebaseActive !== 'undefined' && isFirebaseActive && db) {
            return;
        }

        let loadedSignals = null;

        // Tentar API REST do servidor central (node server.js / python server.py / server.ps1)
        try {
            const resp = await fetch('/api/signals');
            if (resp.ok) {
                const data = await resp.json();
                if (Array.isArray(data) && data.length > 0) {
                    loadedSignals = Array.isArray(data[0]) ? data[0] : (data[0] && data[0].value ? data[0].value : data);
                }
            }
        } catch (e) {
            console.warn('API REST /api/signals indisponível.', e);
        }

        // Tentar ler o arquivo de banco de dados central signals.json
        if (!loadedSignals) {
            try {
                const resp = await fetch('./signals.json');
                if (resp.ok) {
                    const data = await resp.json();
                    if (Array.isArray(data) && data.length > 0) {
                        loadedSignals = Array.isArray(data[0]) ? data[0] : (data[0] && data[0].value ? data[0].value : data);
                    }
                }
            } catch (e) {
                console.warn('signals.json indisponível.', e);
            }
        }

        // Fallback para cache local no navegador
        if (!loadedSignals) {
            const cached = loadLocalCache();
            if (cached && cached.length > 0) {
                loadedSignals = cached;
                console.log(`✅ Carregados ${cached.length} sinais do cache local do navegador.`);
            }
        }

        if (loadedSignals && Array.isArray(loadedSignals) && loadedSignals.length > 0 && loadedSignals[0].code) {
            signalsData = loadedSignals;
            saveLocalCache();
            console.log(`✅ Carregados ${signalsData.length} sinais do banco de dados central.`);
        } else if (typeof googleEarthSignals !== 'undefined' && Array.isArray(googleEarthSignals) && googleEarthSignals.length > 0) {
            signalsData = googleEarthSignals.map(s => {
                if (!s.responsavel) {
                    const code = s.code || '';
                    const jur = s.jurisdiction || '';
                    const name = s.name || '';
                    if (jur.includes('Amapa') || name.includes('Amapa') || jur.includes('CPAP') || code.startsWith('AP-')) s.responsavel = 'CPAP';
                    else if (jur.includes('Maranhao') || name.includes('Maranhao') || jur.includes('CPMA') || code.startsWith('MA-')) s.responsavel = 'CPMA';
                    else if (jur.includes('Para') || name.includes('Para') || jur.includes('CPPA') || code.startsWith('PA-')) {
                        if (jur.includes('Guajara') || jur.includes('Belem') || jur.includes('CHN-4')) s.responsavel = 'CHN-4';
                        else s.responsavel = 'CPPA';
                    } else if (jur.includes('Extra-MB') || jur.includes('Privado')) s.responsavel = 'Extra-MB';
                    else s.responsavel = 'CHN-4';
                }
                return s;
            });
            console.log(`✅ Carregados ${signalsData.length} sinais do backup em memória.`);
        }

        updateTypeFilterDropdown();
        updateIE();
        renderMapMarkers();
        renderSignalList();
    }

    // =========================================================================
    // 5. PARSER E IMPORTADOR DE KML (GOOGLE EARTH)
    // =========================================================================
    async function loadKML(kmlSource) {
        let kmlText = kmlSource;

        if (typeof kmlSource === 'string' && (kmlSource.endsWith('.kml') || kmlSource.startsWith('http') || kmlSource.startsWith('./'))) {
            try {
                const resp = await fetch(kmlSource);
                if (!resp.ok) return;
                kmlText = await resp.text();
            } catch (err) {
                console.warn("KML fetch warning:", err);
                return;
            }
        }

        if (!kmlText) return;

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(kmlText, "text/xml");
        const placemarks = xmlDoc.getElementsByTagName("Placemark");
        
        const imported = [];

        for (let i = 0; i < placemarks.length; i++) {
            const pm = placemarks[i];
            const nameNode = pm.getElementsByTagName("name")[0];
            const name = nameNode ? nameNode.textContent.trim() : `Sinal KML ${i + 1}`;

            const descNode = pm.getElementsByTagName("description")[0];
            const desc = descNode ? descNode.textContent.trim() : "";

            const imgMatch = desc.match(/<img [^>]*src=["']([^"']+)["']/i);
            const imageUrl = imgMatch ? imgMatch[1] : null;

            let nrord = null;
            let tipo = "Bóia de Balizamento";
            let situacao = "OPERACIONAL";
            let mensagem = "";

            const extData = pm.getElementsByTagName("ExtendedData")[0];
            if (extData) {
                const dataNodes = extData.getElementsByTagName("Data");
                for (let j = 0; j < dataNodes.length; j++) {
                    const data = dataNodes[j];
                    const dataName = data.getAttribute("name");
                    const valNode = data.getElementsByTagName("value")[0];
                    const val = valNode ? valNode.textContent.trim() : "";

                    if (dataName === "NRORD" && val) nrord = val;
                    if (dataName === "TIPO" && val) tipo = val;
                    if ((dataName === "SITUAÇÃO ACD ÚLTIMA INSPEÇÃO" || dataName === "SITUACAO") && val) situacao = val;
                    if (dataName === "MENSAGEM DE ALTERAÇÃO" && val) mensagem = val;
                }
            }

            const pointNode = pm.getElementsByTagName("Point")[0];
            if (pointNode) {
                const coordsNode = pointNode.getElementsByTagName("coordinates")[0];
                if (coordsNode && coordsNode.textContent) {
                    const coords = coordsNode.textContent.trim().split(',');
                    if (coords.length >= 2) {
                        const lng = parseFloat(coords[0]);
                        const lat = parseFloat(coords[1]);
                        const code = nrord ? nrord : `CHN-${i + 1}`;

                        let status = "OPERACIONAL";
                        const sitUpper = situacao.toUpperCase();
                        if (sitUpper.includes("DESAPARECIDO")) status = "DESAPARECIDO";
                        else if (sitUpper.includes("APAGADO") || sitUpper.includes("AVARIADO")) status = "APAGADO";
                        else if (sitUpper.includes("A DERIVA")) status = "A DERIVA";

                        let responsavel = "CHN-4";
                        if (desc.toUpperCase().includes("AMAPÁ") || code.startsWith("AP-")) responsavel = "CPAP";
                        else if (desc.toUpperCase().includes("MARANHÃO") || code.startsWith("MA-")) responsavel = "CPMA";
                        else if (code.startsWith("PA-")) responsavel = "CHN-4";

                        imported.push({
                            code: code,
                            name: name,
                            type: tipo,
                            status: status,
                            lat: lat,
                            lng: lng,
                            characteristic: "Lp. V. 5s 4m 6NM",
                            rangeNM: 6,
                            altitudeM: 4,
                            jurisdiction: `Jurisdição ${responsavel}`,
                            responsavel: responsavel,
                            image: imageUrl,
                            photoDate: imageUrl ? "2026-08-01" : null,
                            history: [
                                {
                                    date: "2026-08-10 10:00",
                                    status: status,
                                    note: mensagem || `Importado do KML. Situação: ${situacao}`
                                }
                            ]
                        });
                    }
                }
            }
        }

        if (imported.length > 0) {
            signalsData = imported;
            updateIE();
            renderMapMarkers();
            renderSignalList();
            showToast(`${imported.length} sinais importados do KML com sucesso!`, 'success');
        }
    }

    // KML & JSON File Upload / Export Listeners
    const inputKmlFile = document.getElementById('inputKmlFile');
    document.getElementById('btnImportKmlHeader')?.addEventListener('click', () => inputKmlFile.click());
    inputKmlFile?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => loadKML(event.target.result);
        reader.readAsText(file);
    });

    // Export JSON DB for Google Drive
    document.getElementById('btnExportJsonDb')?.addEventListener('click', () => {
        const jsonStr = JSON.stringify(signalsData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'signals.json';
        link.click();
        showToast('Arquivo signals.json gerado! Salve-o na pasta do Google Drive.', 'success');
    });

    // =========================================================================
    // 6. CARREGADOR DE CARTAS GEOTIFF (.TIF)
    // =========================================================================
    const inputGeotiffFile = document.getElementById('inputGeotiffFile');
    document.getElementById('btnUploadTifTab')?.addEventListener('click', () => inputGeotiffFile.click());

    async function loadGeoTIFFFile(file) {
        try {
            showToast(`Processando carta GeoTIFF: ${file.name}...`, 'info');
            const arrayBuffer = await file.arrayBuffer();

            if (typeof parseGeoRaster !== 'undefined') {
                const georaster = await parseGeoRaster(arrayBuffer);
                const layer = new GeoRasterLayer({
                    georaster: georaster,
                    opacity: 0.85,
                    resolution: 256
                });

                layer.addTo(map);
                map.fitBounds(layer.getBounds());

                const layerId = `tif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
                geotiffLayers.push({
                    id: layerId,
                    name: file.name,
                    layer: layer,
                    opacity: 0.85
                });

                renderGeoTIFFLayersList();
                showToast(`Carta GeoTIFF ${file.name} sobreposta no mapa com sucesso!`, 'success');
            }
        } catch (err) {
            console.error("GeoTIFF parse error:", err);
            showToast(`Erro ao carregar arquivo GeoTIFF.`, 'warning');
        }
    }

    inputGeotiffFile?.addEventListener('change', async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        for (let i = 0; i < files.length; i++) {
            await loadGeoTIFFFile(files[i]);
        }
    });

    function renderGeoTIFFLayersList() {
        const container = document.getElementById('geotiffLayersList');
        if (!container) return;
        container.innerHTML = '';

        if (geotiffLayers.length === 0) {
            container.innerHTML = '<div class="text-muted text-center p-3">Nenhum GeoTIFF sob demanda carregado. Exibindo Carta Náutica Base.</div>';
            return;
        }

        geotiffLayers.forEach(gt => {
            const item = document.createElement('div');
            item.className = 'geotiff-layer-item';
            item.innerHTML = `
                <div class="geotiff-layer-head">
                    <span><i class="fa-solid fa-map-location-dot text-gold"></i> ${gt.name}</span>
                    <button class="btn-remove-wp" onclick="window.removeGeoTIFFLayer('${gt.id}')" title="Remover Carta">&times;</button>
                </div>
                <div class="geotiff-opacity-slider">
                    <span>Opacidade:</span>
                    <input type="range" min="0" max="1" step="0.05" value="${gt.opacity}" onchange="window.setGeoTIFFOpacity('${gt.id}', this.value)">
                    <span>${Math.round(gt.opacity * 100)}%</span>
                </div>
            `;
            container.appendChild(item);
        });
    }

    window.removeGeoTIFFLayer = (id) => {
        const index = geotiffLayers.findIndex(l => l.id === id);
        if (index !== -1) {
            map.removeLayer(geotiffLayers[index].layer);
            geotiffLayers.splice(index, 1);
            renderGeoTIFFLayersList();
            showToast('Camada GeoTIFF removida.', 'info');
        }
    };

    window.setGeoTIFFOpacity = (id, val) => {
        const item = geotiffLayers.find(l => l.id === id);
        if (item && item.layer) {
            item.opacity = parseFloat(val);
            item.layer.setOpacity(parseFloat(val));
            renderGeoTIFFLayersList();
        }
    };

    // =========================================================================
    // 7. ÍNDICE DE EFICÁCIA (IE) & SIMULADOR
    // =========================================================================
    function getTypeCategory(type) {
        const t = (type || '').toUpperCase();
        if (t.includes('FAROLETE')) return 'FAROLETE';
        if (t.includes('FAROL')) return 'FAROL';
        if (t.includes('BOIA') || t.includes('BÓIA') || t.includes('BZ') || t.includes('BC')) return 'BOIA';
        if (t.includes('BALIZA')) return 'BALIZA';
        return 'OTHER';
    }

    function updateIE() {
        const total = signalsData.length;
        const opCount = signalsData.filter(s => isOperational(s.status)).length;
        const avCount = total - opCount;
        const iePercent = total > 0 ? ((opCount / total) * 100).toFixed(1) : "0.0";

        const headerVal = document.getElementById('headerIeValue');
        if (headerVal) {
            headerVal.textContent = `${iePercent}%`;
            headerVal.style.color = parseFloat(iePercent) >= 95 ? 'var(--status-op)' : (parseFloat(iePercent) >= 80 ? 'var(--accent-gold)' : 'var(--status-av)');
        }

        const iePercentDisplay = document.getElementById('iePercentDisplay');
        const circleGauge = document.getElementById('ieCircleGauge');
        const formulaOpVal = document.getElementById('formulaOpVal');
        const formulaTotalVal = document.getElementById('formulaTotalVal');
        const statOpCount = document.getElementById('statOpCount');
        const statAvCount = document.getElementById('statAvCount');

        if (iePercentDisplay) iePercentDisplay.textContent = `${iePercent}%`;
        if (formulaOpVal) formulaOpVal.textContent = opCount;
        if (formulaTotalVal) formulaTotalVal.textContent = total;
        if (statOpCount) statOpCount.textContent = opCount;
        if (statAvCount) statAvCount.textContent = avCount;

        const boiaCount = signalsData.filter(s => getTypeCategory(s.type) === 'BOIA').length;
        const farolCount = signalsData.filter(s => getTypeCategory(s.type) === 'FAROL' || getTypeCategory(s.type) === 'FAROLETE').length;
        const statBoiaEl = document.getElementById('statBoiaCount');
        const statFarolEl = document.getElementById('statFarolCount');
        if (statBoiaEl) statBoiaEl.textContent = boiaCount;
        if (statFarolEl) statFarolEl.textContent = farolCount;

        if (circleGauge) {
            const deg = (parseFloat(iePercent) / 100) * 360;
            const color = parseFloat(iePercent) >= 95 ? 'var(--status-op)' : (parseFloat(iePercent) >= 80 ? 'var(--accent-gold)' : 'var(--status-av)');
            circleGauge.style.background = `conic-gradient(${color} 0deg ${deg}deg, var(--navy-700) ${deg}deg 360deg)`;
        }

        if (document.getElementById('countAll')) document.getElementById('countAll').textContent = total;
        if (document.getElementById('countOp')) document.getElementById('countOp').textContent = opCount;
        if (document.getElementById('countAv')) document.getElementById('countAv').textContent = avCount;
    }

    function openSimulator() {
        const modal = document.getElementById('modalSimulator');
        const checklist = document.getElementById('simChecklist');
        if (!modal || !checklist) return;

        const damagedSignals = signalsData.filter(s => !isOperational(s.status));
        checklist.innerHTML = '';

        if (damagedSignals.length === 0) {
            checklist.innerHTML = '<div class="text-muted p-2">Nenhum sinal avariado registrado no momento. Todos operacionais!</div>';
        } else {
            damagedSignals.forEach(s => {
                const item = document.createElement('label');
                item.className = 'sim-item';
                item.innerHTML = `
                    <input type="checkbox" value="${s.code}" class="sim-checkbox" checked>
                    <div>
                        <strong>${s.code} - ${s.name}</strong>
                        <div class="text-muted" style="font-size:0.75rem;">Status atual: <span class="text-danger">${s.status}</span> | ${s.characteristic}</div>
                    </div>
                `;
                checklist.appendChild(item);
            });
        }

        calculateSimulation();
        modal.classList.add('active');

        checklist.querySelectorAll('.sim-checkbox').forEach(cb => {
            cb.addEventListener('change', calculateSimulation);
        });
    }

    function calculateSimulation() {
        const total = signalsData.length;
        const currentOp = signalsData.filter(s => isOperational(s.status)).length;
        const currentIE = total > 0 ? (currentOp / total) * 100 : 0;

        const checkedBoxes = document.querySelectorAll('.sim-checkbox:checked');
        const countSimRepaired = checkedBoxes.length;
        const projectedOp = currentOp + countSimRepaired;
        const projectedIE = total > 0 ? (projectedOp / total) * 100 : 0;
        const deltaIE = projectedIE - currentIE;

        document.getElementById('simCurrentIe').textContent = `${currentIE.toFixed(1)}%`;
        document.getElementById('simCurrentRatio').textContent = `${currentOp} / ${total} operacionais`;
        document.getElementById('simProjectedIe').textContent = `${projectedIE.toFixed(1)}%`;
        document.getElementById('simProjectedRatio').textContent = `${projectedOp} / ${total} operacionais`;
        document.getElementById('simDeltaIe').textContent = `+${deltaIE.toFixed(1)}%`;
        document.getElementById('simCountRepaired').textContent = countSimRepaired;
    }

    // Type Filter Select Listener
    document.getElementById('typeFilterSelect')?.addEventListener('change', () => {
        renderMapMarkers();
        renderSignalList();
    });

    // Responsável Layer Checkbox Listeners
    ['chkRespCHN4', 'chkRespCPAP', 'chkRespCPMA', 'chkRespExtra'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', () => {
            renderMapMarkers();
            renderSignalList();
        });
    });

    document.getElementById('btnOnlyCHN4')?.addEventListener('click', () => {
        const c1 = document.getElementById('chkRespCHN4');
        const c2 = document.getElementById('chkRespCPAP');
        const c3 = document.getElementById('chkRespCPMA');
        const c5 = document.getElementById('chkRespExtra');
        if (c1) c1.checked = true;
        if (c2) c2.checked = false;
        if (c3) c3.checked = false;
        if (c5) c5.checked = false;
        renderMapMarkers();
        renderSignalList();
    });

    document.getElementById('btnSelectAllResp')?.addEventListener('click', () => {
        const c1 = document.getElementById('chkRespCHN4');
        const c2 = document.getElementById('chkRespCPAP');
        const c3 = document.getElementById('chkRespCPMA');
        const c5 = document.getElementById('chkRespExtra');
        if (c1) c1.checked = true;
        if (c2) c2.checked = true;
        if (c3) c3.checked = true;
        if (c5) c5.checked = true;
        renderMapMarkers();
        renderSignalList();
    });

    // =========================================================================
    // 8. RENDERIZAÇÃO E FILTRAGEM DE MARCADORES E LISTA (COM RESPONSÁVEL)
    // =========================================================================
    function createCustomIcon(signal) {
        const isOp = isOperational(signal.status);
        const statusClass = isOp ? 'status-op' : 'status-av';
        const iconType = signal.type.toLowerCase().includes('bóia') || signal.type.toLowerCase().includes('boia') || signal.type.toLowerCase().includes('bz') ? 'fa-anchor' : 'fa-tower-observation';

        return L.divIcon({
            className: 'custom-aton-marker-wrapper',
            html: `<div class="aton-marker ${statusClass}" title="${signal.code} - ${signal.name} (${signal.responsavel || 'CHN-4'})">
                     <i class="fa-solid ${iconType}"></i>
                   </div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });
    }

    // =========================================================================
    // NAVAL TYPE MAP & PARSER (FAR, FTE, BL, BC, BZ, BZA, BA, BF, RF, RACON, AIS, ERDGPS)
    // =========================================================================
    const NAVAL_TYPE_MAP = {
        'BL':     { name: 'BL — Bóia Luminosa', order: 1 },
        'BC':     { name: 'BC — Bóia Cega', order: 2 },
        'BZ':     { name: 'BZ — Baliza', order: 3 },
        'FAR':    { name: 'FAR — Farol', order: 4 },
        'FTE':    { name: 'FTE — Farolete', order: 5 },
        'BZA':    { name: 'BZA — Baliza Articulada', order: 6 },
        'BA':     { name: 'BA — Bóia Articulada', order: 7 },
        'BF':     { name: 'BF — Barca-Farol', order: 8 },
        'RF':     { name: 'RF — Radiofarol', order: 9 },
        'RACON':  { name: 'RACON — Radar Beacon', order: 10 },
        'AIS':    { name: 'AIS — Transponder AIS', order: 11 },
        'ERDGPS': { name: 'ERDGPS — Estação DGPS', order: 12 }
    };

    function getSignalTypeKey(signal) {
        if (!signal) return 'OUTROS';
        const type = String(signal.type || '').trim().toUpperCase();
        const code = String(signal.code || '').trim().toUpperCase();
        const name = String(signal.name || '').trim().toUpperCase();

        if (type === 'BC' || type.includes('CEGA') || type.includes('SEM LUZ')) {
            return 'BC';
        }
        if (type === 'BZA' || type.includes('BALIZA ARTICULADA')) {
            return 'BZA';
        }
        if (type === 'BA' || type.includes('BOIA ARTICULADA') || type.includes('BÓIA ARTICULADA')) {
            return 'BA';
        }
        if (type === 'BZ' || type === 'BALIZA' || name.startsWith('BALIZA')) {
            return 'BZ';
        }
        if (type === 'BL' || type.includes('BALIZAMENTO') || type.includes('LUMINOSA') || type.includes('BOIA') || type.includes('BÓIA')) {
            return 'BL';
        }
        if (type === 'FAROL' || type === 'FAR' || name.startsWith('FAROL')) {
            return 'FAR';
        }
        if (type === 'FAROLETE' || type === 'FTE' || name.startsWith('FAROLETE')) {
            return 'FTE';
        }
        if (type === 'BF' || type.includes('BARCA')) {
            return 'BF';
        }
        if (type === 'RF' || type.includes('RADIO')) {
            return 'RF';
        }
        if (type.includes('RACON') || code.includes('RACON') || name.includes('RACON')) {
            return 'RACON';
        }
        if (type.includes('AIS') || code.includes('AIS') || name.includes('AIS')) {
            return 'AIS';
        }
        if (type.includes('DGPS') || code.includes('DGPS')) {
            return 'ERDGPS';
        }

        if (/^FAR[\s\-_0-9]/i.test(code) || /^FAR$/i.test(code)) return 'FAR';
        if (/^FTE[\s\-_0-9]/i.test(code) || /^FTE$/i.test(code)) return 'FTE';
        if (/^BZA[\s\-_0-9]/i.test(code) || /^BZA$/i.test(code)) return 'BZA';
        if (/^BA[\s\-_0-9]/i.test(code) || /^BA$/i.test(code)) return 'BA';
        if (/^BL[\s\-_0-9]/i.test(code) || /^BL$/i.test(code)) return 'BL';
        if (/^BC[\s\-_0-9]/i.test(code) || /^BC$/i.test(code)) return 'BC';
        if (/^BZ[\s\-_0-9]/i.test(code) || /^BZ$/i.test(code)) return 'BZ';
        if (/^BF[\s\-_0-9]/i.test(code) || /^BF$/i.test(code)) return 'BF';
        if (/^RF[\s\-_0-9]/i.test(code) || /^RF$/i.test(code)) return 'RF';

        return 'OUTROS';
    }

    function updateTypeFilterDropdown() {
        const select = document.getElementById('typeFilterSelect');
        if (!select) return;

        const currentSelection = select.value || 'ALL';
        const counts = {};

        signalsData.forEach(s => {
            const key = getSignalTypeKey(s);
            counts[key] = (counts[key] || 0) + 1;
        });

        let html = `<option value="ALL">Todos os Tipos (${signalsData.length})</option>`;

        const keysPresent = Object.keys(counts).sort((a, b) => {
            const orderA = NAVAL_TYPE_MAP[a] ? NAVAL_TYPE_MAP[a].order : 99;
            const orderB = NAVAL_TYPE_MAP[b] ? NAVAL_TYPE_MAP[b].order : 99;
            return orderA - orderB;
        });

        keysPresent.forEach(key => {
            const labelInfo = NAVAL_TYPE_MAP[key];
            const label = labelInfo ? labelInfo.name : `${key} — Outros Auxílios`;
            html += `<option value="${key}">${label} (${counts[key]})</option>`;
        });

        select.innerHTML = html;
        if (keysPresent.includes(currentSelection) || currentSelection === 'ALL') {
            select.value = currentSelection;
        } else {
            select.value = 'ALL';
        }
    }

    function matchesTypeFilter(signal) {
        const select = document.getElementById('typeFilterSelect');
        const filterVal = select ? select.value : 'ALL';
        if (!filterVal || filterVal === 'ALL') return true;

        return getSignalTypeKey(signal) === filterVal;
    }

    function getSelectedResponsaveis() {
        const selected = [];
        if (document.getElementById('chkRespCHN4')?.checked) selected.push('CHN-4');
        if (document.getElementById('chkRespCPAP')?.checked) selected.push('CPAP');
        if (document.getElementById('chkRespCPMA')?.checked) selected.push('CPMA');
        if (document.getElementById('chkRespExtra')?.checked) selected.push('EXTRA-MB', 'ÓRGÃOS EXTRA-MB', 'PRIVADO');
        return selected;
    }

    function matchesResponsavelFilter(signal) {
        const selected = getSelectedResponsaveis();
        if (selected.length === 0) return false;

        const resp = (signal.responsavel || 'CHN-4').toUpperCase();

        return selected.some(s => {
            if (s === 'EXTRA-MB') {
                return resp.includes('EXTRA') || resp.includes('PRIVADO') || resp.includes('ÓRGÃOS');
            }
            return resp === s;
        });
    }

    function getFilteredSignals() {
        return signalsData.filter(s => {
            const matchesFilter = currentFilter === 'all' ||
                (currentFilter === 'op' && isOperational(s.status)) ||
                (currentFilter === 'av' && !isOperational(s.status));
            
            const searchLower = (currentSearch || '').toLowerCase();
            const matchesSearch = !searchLower ||
                s.code.toLowerCase().includes(searchLower) ||
                s.name.toLowerCase().includes(searchLower) ||
                (s.jurisdiction && s.jurisdiction.toLowerCase().includes(searchLower)) ||
                (s.responsavel && s.responsavel.toLowerCase().includes(searchLower));

            return matchesFilter && matchesSearch && matchesTypeFilter(s) && matchesResponsavelFilter(s);
        });
    }

    function renderMapMarkers() {
        Object.values(mapMarkers).forEach(m => map.removeLayer(m));
        mapMarkers = {};

        const visibleSignals = getFilteredSignals();
        visibleSignals.forEach(signal => {
            const marker = L.marker([signal.lat, signal.lng], {
                icon: createCustomIcon(signal)
            }).addTo(map);

            const isOp = isOperational(signal.status);
            const respClass = (signal.responsavel === 'CPAP') ? 'resp-cpap' : (signal.responsavel === 'CPMA') ? 'resp-cpma' : (signal.responsavel === 'Extra-MB') ? 'resp-extra' : 'resp-chn4';

            const fullType = getFullTypeName(signal.type);
            const popupHtml = `
                <div style="font-family: var(--font-sans); padding: 4px 6px; min-width: 210px;">
                    <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 4px;">
                        <span class="badge ${isOp ? 'badge-op' : 'badge-av'}">${signal.status}</span>
                        <span class="responsavel-badge ${respClass}"><i class="fa-solid fa-building-user"></i> ${signal.responsavel || 'CHN-4'}</span>
                    </div>
                    <h3 style="font-family: var(--font-tech); margin: 4px 0 2px 0; font-size: 1.05rem; color: #0f172a;">${signal.code} - ${signal.name}</h3>
                    <p style="margin: 3px 0; font-size: 0.82rem; color: #334155;"><strong>Tipo:</strong> ${fullType}</p>
                    <p style="margin: 3px 0; font-size: 0.82rem; color: #334155;"><strong>Carac:</strong> ${signal.characteristic}</p>
                    <p style="margin: 3px 0 8px 0; font-size: 0.82rem; color: #334155;"><strong>Pos:</strong> ${toDMS(signal.lat, true)} ${toDMS(signal.lng, false)}</p>
                    <div style="display: flex; gap: 6px;">
                        <button type="button" onclick="window.openSignalDetail('${signal.code}')" style="background: #1e3a66; color: #fff; border: none; padding: 6px 12px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                            <i class="fa-solid fa-file-lines"></i> Ficha DH2
                        </button>
                    </div>
                </div>
            `;
            marker.bindPopup(popupHtml);

            marker.on('click', () => {
                highlightSignalCard(signal.code);
            });

            mapMarkers[signal.code] = marker;
        });
    }

    function getFullTypeName(type) {
        const t = (type || '').toUpperCase().trim();
        if (t.includes('FAROLETE') || t === 'FTE') return 'Farolete';
        if (t.includes('FAROL') || t === 'FAR') return 'Farol';
        if (t.includes('BC') || t.includes('BOIA CEGA') || t.includes('BÓIA CEGA')) return 'Bóia Cega';
        if (t.includes('BZ') || t.includes('BL') || t.includes('BOIA LUMINOSA') || t.includes('BÓIA LUMINOSA')) return 'Bóia Luminosa';
        if (t.includes('BOIA') || t.includes('BÓIA')) return 'Bóia';
        if (t.includes('BALIZA') || t === 'BAL') return 'Baliza';
        if (t.includes('RACON') || t.includes('RADAR')) return 'Respondedor Radar (Racon)';
        if (t.includes('CARDINAL')) return 'Sinal Cardinal';
        if (t.includes('LUZ') || t.includes('PORTO')) return 'Luz / Lanterna';
        return type || 'Sinal Náutico';
    }

    function renderSignalList() {
        const container = document.getElementById('signalList');
        if (!container) return;

        container.innerHTML = '';

        const filtered = getFilteredSignals();

        if (filtered.length === 0) {
            container.innerHTML = '<div class="text-muted p-3 text-center">Nenhum auxílio à navegação encontrado para os filtros selecionados.</div>';
            return;
        }

        filtered.forEach(s => {
            const isOp = isOperational(s.status);
            const card = document.createElement('div');
            card.className = `signal-card ${isOp ? 'status-op' : 'status-av'}`;
            card.id = `card-${s.code}`;

            const respClass = (s.responsavel === 'CPAP') ? 'resp-cpap' : (s.responsavel === 'CPMA') ? 'resp-cpma' : (s.responsavel === 'Extra-MB') ? 'resp-extra' : 'resp-chn4';
            const fullType = getFullTypeName(s.type);

            card.innerHTML = `
                <div class="signal-card-head">
                    <div class="signal-code-title">
                        <i class="fa-solid ${s.type.toLowerCase().includes('boia') || s.type.toLowerCase().includes('bz') || s.type.toLowerCase().includes('bc') ? 'fa-anchor' : 'fa-tower-observation'}" style="color:${isOp ? 'var(--status-op)' : 'var(--status-av)'}"></i>
                        <h4>${s.code}</h4>
                    </div>
                    <div style="display: flex; gap: 4px; align-items: center;">
                        <span class="responsavel-badge ${respClass}">${s.responsavel || 'CHN-4'}</span>
                        <span class="badge ${isOp ? 'badge-op' : 'badge-av'}">${s.status}</span>
                        <button type="button" class="btn-card-delete" onclick="event.stopPropagation(); window.deleteSignalFromCard('${s.code}', '${s.name.replace(/'/g, "\\'")}')" title="Excluir Sinal Náutico">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>
                <div class="signal-card-body">
                    <strong>${s.name}</strong>
                    <div class="signal-char"><i class="fa-solid fa-lightbulb"></i> ${fullType} — ${s.characteristic}</div>
                </div>
                <div class="signal-meta">
                    <span>${toDMS(s.lat, true)} | ${toDMS(s.lng, false)}</span>
                    <span>Alcance: ${s.rangeNM} NM</span>
                </div>
            `;

            card.addEventListener('click', () => {
                map.flyTo([s.lat, s.lng], 11, { duration: 1.2 });
                if (mapMarkers[s.code]) {
                    mapMarkers[s.code].openPopup();
                }
                openSignalDetail(s.code);
            });

            container.appendChild(card);
        });
    }

    function highlightSignalCard(code) {
        document.querySelectorAll('.signal-card').forEach(c => c.classList.remove('selected'));
        const card = document.getElementById(`card-${code}`);
        if (card) {
            card.classList.add('selected');
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    // =========================================================================
    // 9. DETALHES DO SINAL: EDICAO E GERENCIAMENTO
    // =========================================================================
    function sanitizeForDatabase(signal) {
        if (!signal) return null;
        return {
            code: String(signal.code || '').trim(),
            name: String(signal.name || '').trim(),
            type: String(signal.type || '').trim(),
            status: String(signal.status || '').trim(),
            lat: typeof signal.lat === 'number' ? signal.lat : parseFloat(signal.lat) || 0,
            lng: typeof signal.lng === 'number' ? signal.lng : parseFloat(signal.lng) || 0,
            characteristic: String(signal.characteristic || '').trim(),
            rangeNM: typeof signal.rangeNM === 'number' ? signal.rangeNM : parseFloat(signal.rangeNM) || 0,
            altitudeM: typeof signal.altitudeM === 'number' ? signal.altitudeM : parseFloat(signal.altitudeM) || 0,
            jurisdiction: String(signal.jurisdiction || 'CHN-4').trim(),
            responsavel: String(signal.responsavel || 'CHN-4').trim(),
            image: signal.image || null,
            photoDate: signal.photoDate || null,
            history: Array.isArray(signal.history) ? signal.history.map(h => ({
                date: String(h.date || ''),
                status: String(h.status || ''),
                note: String(h.note || '')
            })) : []
        };
    }

    function saveSignalToBackend(signal) {
        const clean = sanitizeForDatabase(signal);
        if (!clean || !clean.code) return;

        const idx = signalsData.findIndex(s => s.code === clean.code);
        if (idx !== -1) {
            signalsData[idx] = clean;
        } else {
            signalsData.push(clean);
        }

        if (typeof isFirebaseActive !== 'undefined' && isFirebaseActive && db) {
            db.collection("signals").doc(clean.code).set(clean, { merge: true })
                .then(() => console.log(`🔥 Firestore: Sinal ${clean.code} salvo na nuvem com sucesso!`))
                .catch(err => console.error("Erro ao salvar no Firestore:", err));
        }

        fetch(`/api/signals/${encodeURIComponent(clean.code)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(clean)
        }).then(r => console.log(`💾 REST API: Sinal ${clean.code} salvo localmente!`))
          .catch(err => console.warn('API REST fallback:', err));
    }

    function openSignalDetail(code) {
        const signal = signalsData.find(s => s.code === code);
        if (!signal) return;

        selectedSignal = signal;
        const modal = document.getElementById('modalSignalDetail');
        if (!modal) return;

        document.getElementById('modalSignalBadge').textContent = `DH2: ${signal.code}`;
        document.getElementById('modalSignalName').textContent = signal.name;

        // View Mode Specifications
        document.getElementById('modalSpecCode').textContent = signal.code;
        document.getElementById('modalSpecType').textContent = getFullTypeName(signal.type);
        document.getElementById('modalSpecPosDec').textContent = `${signal.lat.toFixed(5)}, ${signal.lng.toFixed(5)}`;
        document.getElementById('modalSpecPosGms').textContent = `${toDMS(signal.lat, true)} | ${toDMS(signal.lng, false)}`;
        document.getElementById('modalSpecChar').textContent = signal.characteristic;
        document.getElementById('modalSpecRange').textContent = `${signal.rangeNM} NM`;
        document.getElementById('modalSpecAltitude').textContent = `${signal.altitudeM} m`;
        document.getElementById('modalSpecJurisdiction').textContent = signal.jurisdiction || 'CHN-4';
        
        const specRespEl = document.getElementById('modalSpecResponsavel');
        if (specRespEl) specRespEl.textContent = signal.responsavel || 'CHN-4';

        const isOp = isOperational(signal.status);
        document.getElementById('modalSpecStatus').innerHTML = `<span class="badge ${isOp ? 'badge-op' : 'badge-av'}">${signal.status}</span>`;

        toggleEditSpecMode(false);
        renderSignalPhoto(signal);

        document.getElementById('selectNewStatus').value = isOp ? 'OPERACIONAL' : signal.status;
        document.getElementById('textOccurrenceReason').value = '';

        const btnAvradio = document.getElementById('btnGenerateAvradioModal');
        if (btnAvradio) btnAvradio.style.display = isOp ? 'none' : 'inline-flex';

        renderHistoryTimeline(signal.history);
        modal.classList.add('active');
    }
    window.openSignalDetail = openSignalDetail;

    function renderSignalPhoto(signal) {
        const placeholder = document.getElementById('photoPlaceholder');
        const imgDisplay = document.getElementById('signalImgDisplay');
        const infoBox = document.getElementById('photoInfoBox');
        const dateDisplay = document.getElementById('photoDateDisplay');

        if (signal.image) {
            placeholder.style.display = 'none';
            imgDisplay.style.display = 'block';
            imgDisplay.src = signal.image;
            infoBox.style.display = 'flex';
            dateDisplay.innerHTML = `<i class="fa-solid fa-calendar-day"></i> Foto tirada em: ${signal.photoDate || 'Sem data'}`;
        } else {
            placeholder.style.display = 'flex';
            imgDisplay.style.display = 'none';
            infoBox.style.display = 'none';
        }
    }

    function toggleEditSpecMode(enable) {
        const viewMode = document.getElementById('viewSpecMode');
        const editForm = document.getElementById('formEditSpec');
        const textBtn = document.getElementById('textBtnEdit');

        if (enable && selectedSignal) {
            viewMode.style.display = 'none';
            editForm.style.display = 'block';
            textBtn.textContent = 'Cancelar Edição';

            document.getElementById('editCode').value = selectedSignal.code;
            document.getElementById('editName').value = selectedSignal.name;
            document.getElementById('editType').value = selectedSignal.type;
            document.getElementById('editCharacteristic').value = selectedSignal.characteristic;
            document.getElementById('editRange').value = selectedSignal.rangeNM;
            document.getElementById('editAltitude').value = selectedSignal.altitudeM;
            document.getElementById('editLat').value = selectedSignal.lat;
            document.getElementById('editLng').value = selectedSignal.lng;
            document.getElementById('editJurisdiction').value = selectedSignal.jurisdiction || 'CHN-4';
            
            const editRespEl = document.getElementById('editResponsavel');
            if (editRespEl) editRespEl.value = selectedSignal.responsavel || 'CHN-4';
        } else {
            viewMode.style.display = 'block';
            editForm.style.display = 'none';
            textBtn.textContent = 'Editar Ficha Técnica';
        }
    }

    document.getElementById('btnToggleEditMode').addEventListener('click', () => {
        const editForm = document.getElementById('formEditSpec');
        const isEditing = editForm.style.display === 'block';
        toggleEditSpecMode(!isEditing);
    });

    // Save Technical Specification Edit
    document.getElementById('formEditSpec').addEventListener('submit', (e) => {
        e.preventDefault();
        if (!selectedSignal) return;

        const oldCode = selectedSignal.code;
        const newCode = document.getElementById('editCode').value.trim();
        const newName = document.getElementById('editName').value.trim();
        const newType = document.getElementById('editType').value.trim();
        const newChar = document.getElementById('editCharacteristic').value.trim();
        const newRange = parseFloat(document.getElementById('editRange').value) || 0;
        const newAlt = parseFloat(document.getElementById('editAltitude').value) || 0;
        const newLat = parseFloat(document.getElementById('editLat').value) || selectedSignal.lat;
        const newLng = parseFloat(document.getElementById('editLng').value) || selectedSignal.lng;
        const newJur = document.getElementById('editJurisdiction').value.trim();
        const newResp = document.getElementById('editResponsavel')?.value || selectedSignal.responsavel || 'CHN-4';

        // 1. If code changed, delete old document from Firestore/Backend first
        if (oldCode && oldCode !== newCode) {
            if (mapMarkers[oldCode]) {
                map.removeLayer(mapMarkers[oldCode]);
                delete mapMarkers[oldCode];
            }
            if (typeof isFirebaseActive !== 'undefined' && isFirebaseActive && db) {
                db.collection("signals").doc(oldCode).delete().catch(console.warn);
            }
            fetch(`/api/signals/${encodeURIComponent(oldCode)}`, { method: 'DELETE' }).catch(console.warn);
            signalsData = signalsData.filter(s => s.code !== oldCode);
        }

        // 2. Update object fields
        selectedSignal.code = newCode;
        selectedSignal.name = newName;
        selectedSignal.type = newType;
        selectedSignal.characteristic = newChar;
        selectedSignal.rangeNM = newRange;
        selectedSignal.altitudeM = newAlt;
        selectedSignal.lat = newLat;
        selectedSignal.lng = newLng;
        selectedSignal.jurisdiction = newJur;
        selectedSignal.responsavel = newResp;

        // 3. Save to backend (Cloud Firestore + REST API / signals.json)
        saveSignalToBackend(selectedSignal);

        // 4. Update UI in real-time "in hot"
        toggleEditSpecMode(false);
        openSignalDetail(selectedSignal.code);
        saveLocalCache();
        updateTypeFilterDropdown();
        updateIE();
        renderMapMarkers();
        renderSignalList();

        showToast(`Ficha Técnica do sinal ${newCode} salva com sucesso no banco de dados!`, 'success');
    });

    // Delete Signal Function
    async function deleteSignalPermanently(code, name) {
        if (!confirm(`ATENÇÃO: Deseja realmente EXCLUIR PERMANENTEMENTE o auxílio à navegação [${code} - ${name}]?`)) {
            return;
        }

        // Delete from Firebase Firestore or REST API
        if (typeof isFirebaseActive !== 'undefined' && isFirebaseActive && db) {
            try {
                await db.collection("signals").doc(code).delete();
                console.log(`🔥 Firestore: Sinal ${code} excluído da nuvem!`);
            } catch (err) {
                console.error("Erro ao excluir do Firestore:", err);
            }
        } else {
            try {
                await fetch(`/api/signals/${encodeURIComponent(code)}`, {
                    method: 'DELETE'
                });
            } catch (err) {
                console.warn('Exclusão via API REST em modo fallback:', err);
            }
        }

        // Update local array and cache
        signalsData = signalsData.filter(s => s.code !== code);
        saveLocalCache();

        if (mapMarkers[code]) {
            map.removeLayer(mapMarkers[code]);
            delete mapMarkers[code];
        }

        routeWaypoints = routeWaypoints.filter(wp => wp.code !== code);
        updateRoute();

        document.getElementById('modalSignalDetail').classList.remove('active');
        document.getElementById('modalAddSignal').classList.remove('active');
        selectedSignal = null;

        updateTypeFilterDropdown();
        updateIE();
        renderMapMarkers();
        renderSignalList();

        showToast(`Sinal ${code} excluído permanentemente do banco de dados!`, 'warning');
    }

    window.deleteSignalFromCard = (code, name) => {
        deleteSignalPermanently(code, name);
    };

    // Delete Button in Signal Detail Modal
    document.getElementById('btnDeleteSignal')?.addEventListener('click', () => {
        if (!selectedSignal) return;
        deleteSignalPermanently(selectedSignal.code, selectedSignal.name);
    });

    // Attach/Upload Signal Photo Listener
    const inputPhotoFile = document.getElementById('inputPhotoFile');
    document.getElementById('btnTriggerPhotoUpload').addEventListener('click', () => inputPhotoFile.click());

    inputPhotoFile.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedSignal) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            selectedSignal.image = event.target.result;
            const now = new Date();
            selectedSignal.photoDate = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;

            // Persist to REST API
            try {
                await fetch(`/api/signals/${encodeURIComponent(selectedSignal.code)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(selectedSignal)
                });
            } catch (err) {
                console.warn('API REST upload photo fallback:', err);
            }

            renderSignalPhoto(selectedSignal);
            showToast('Foto do sinal salva no banco de dados!', 'success');
        };
        reader.readAsDataURL(file);
    });

    function renderHistoryTimeline(history) {
        const container = document.getElementById('modalHistoryTimeline');
        if (!container) return;
        container.innerHTML = '';

        if (!history || history.length === 0) {
            container.innerHTML = '<div class="text-muted">Nenhum registro anterior.</div>';
            return;
        }

        history.slice().reverse().forEach(h => {
            const isOp = isOperational(h.status);
            const item = document.createElement('div');
            item.className = `timeline-item ${isOp ? 'status-op' : 'status-av'}`;
            item.innerHTML = `
                <div class="timeline-date">${h.date} — <strong>${h.status}</strong></div>
                <div class="timeline-reason">${h.note}</div>
            `;
            container.appendChild(item);
        });
    }

    document.getElementById('formUpdateStatus').addEventListener('submit', (e) => {
        e.preventDefault();
        if (!selectedSignal) return;

        const newStatus = document.getElementById('selectNewStatus').value;
        const reason = document.getElementById('textOccurrenceReason').value.trim();

        if (!reason) {
            showToast('O campo de formalização da ocorrência é obrigatório!', 'danger');
            return;
        }

        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

        selectedSignal.status = newStatus;
        if (!selectedSignal.history) selectedSignal.history = [];
        selectedSignal.history.push({
            date: dateStr,
            status: newStatus,
            note: reason
        });

        // Immediate Ficha DH2 close & real-time "in hot" UI update
        const modalDetail = document.getElementById('modalSignalDetail');
        if (modalDetail) modalDetail.classList.remove('active');

        saveSignalToBackend(selectedSignal);

        saveLocalCache();
        updateTypeFilterDropdown();
        updateIE();
        renderMapMarkers();
        renderSignalList();

        showToast(`Status do sinal ${selectedSignal.code} atualizado com sucesso!`, 'success');

        // Automatically open AVRADIO modal if status is damaged/inoperable
        if (!isOperational(newStatus)) {
            setTimeout(() => {
                generateAVRADIO(selectedSignal, reason);
            }, 120);
        }
    });

    // =========================================================================
    // 10. EMISSÃO DE AVRADIO (NORMAM-601/DHN)
    // =========================================================================
    function generateAVRADIO(signal, occurrenceReason = '') {
        const modal = document.getElementById('modalAvradio');
        const textarea = document.getElementById('avradioTextarea');
        if (!modal || !textarea) return;

        const statusReason = occurrenceReason || (signal.history.length > 0 ? signal.history[signal.history.length - 1].note : signal.status);
        const timestampZ = getFormattedTimestampZ();
        const posGMS = `${toDMS(signal.lat, true)} / ${toDMS(signal.lng, false)}`;

        const avradioText = 
`ASSUNTO: AVRADIO - ${signal.name.toUpperCase()} - ${signal.status.toUpperCase()}
UNO - ${signal.code} - ${signal.name.toUpperCase()}
DOIS - IDENTIFICAÇÃO DO SINAL NÁUTICO: ${signal.characteristic.toUpperCase()} E COORDENADA DA POSIÇÃO: ${posGMS}
TRÊS - SITUAÇÃO: ${signal.status.toUpperCase()} (${statusReason.toUpperCase()}) EM ${timestampZ}
QUATRO - NAVEGANTES DEVEM NAVEGAR COM CAUTELA NA ÁREA.`;

        textarea.value = avradioText;
        modal.classList.add('active');
    }

    document.getElementById('btnCopyAvradio')?.addEventListener('click', () => {
        const textarea = document.getElementById('avradioTextarea');
        if (!textarea) return;
        textarea.select();
        navigator.clipboard.writeText(textarea.value).then(() => {
            showToast('Texto da Minuta AVRADIO copiado com sucesso!', 'success');
        });
    });

    document.getElementById('btnDownloadAvradio')?.addEventListener('click', () => {
        const text = document.getElementById('avradioTextarea').value;
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `AVRADIO_${selectedSignal ? selectedSignal.code : 'DHN'}.txt`;
        link.click();
    });

    // =========================================================================
    // 11. TRAÇADO DE DERROTA NÁUTICA (CANAL SEGURO)
    // =========================================================================
    function updateRoute() {
        const baseKey = document.getElementById('routeBaseSelect').value;
        const base = navalBases[baseKey] || navalBases.belem;

        const fullSequence = [
            { id: 'base', name: base.name, lat: base.lat, lng: base.lng, isBase: true },
            ...routeWaypoints
        ];

        if (routePolyline) map.removeLayer(routePolyline);
        waypointMarkers.forEach(m => map.removeLayer(m));
        waypointMarkers = [];

        if (isRouteVisible) {
            const latLngs = fullSequence.map(wp => [wp.lat, wp.lng]);
            routePolyline = L.polyline(latLngs, {
                color: '#f59e0b',
                weight: 4,
                dashArray: '8, 8',
                lineJoin: 'round'
            }).addTo(map);

            fullSequence.forEach((wp, index) => {
                const isFirst = index === 0;
                const isLast = index === fullSequence.length - 1 && fullSequence.length > 1;
                let colorClass = 'wp-waypoint';
                if (isFirst) colorClass = 'wp-base';
                if (isLast) colorClass = 'wp-destination';

                const icon = L.divIcon({
                    className: 'custom-wp-icon-wrapper',
                    html: `<div class="wp-marker ${colorClass}"><span>${index === 0 ? 'P' : index}</span></div>`,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14]
                });

                const marker = L.marker([wp.lat, wp.lng], {
                    icon: icon,
                    draggable: true
                }).addTo(map);

                marker.on('dragend', (e) => {
                    const newPos = e.target.getLatLng();
                    if (index === 0) {
                        base.lat = newPos.lat;
                        base.lng = newPos.lat;
                    } else {
                        routeWaypoints[index - 1].lat = newPos.lat;
                        routeWaypoints[index - 1].lng = newPos.lng;
                    }
                    updateRoute();
                });

                waypointMarkers.push(marker);
            });
        }

        renderWaypointsList(fullSequence);
        calculateRouteTelemetry(fullSequence);
    }

    function calculateRouteTelemetry(sequence) {
        let totalDistance = 0;
        for (let i = 0; i < sequence.length - 1; i++) {
            totalDistance += haversineNM(
                sequence[i].lat, sequence[i].lng,
                sequence[i+1].lat, sequence[i+1].lng
            );
        }

        const speedInput = document.getElementById('shipSpeedInput');
        const speed = speedInput ? parseFloat(speedInput.value) || 10 : 10;
        const totalHours = speed > 0 ? totalDistance / speed : 0;
        const hours = Math.floor(totalHours);
        const minutes = Math.round((totalHours - hours) * 60);

        document.getElementById('routeDistanceVal').innerHTML = `${totalDistance.toFixed(1)} <small>NM</small>`;
        document.getElementById('routeWaypointsCount').innerHTML = `${Math.max(0, sequence.length - 1)} <small>pts</small>`;
        document.getElementById('routeEtaVal').textContent = `${hours}h ${String(minutes).padStart(2, '0')}m`;
    }

    function renderWaypointsList(sequence) {
        const container = document.getElementById('waypointsList');
        if (!container) return;
        container.innerHTML = '';

        if (sequence.length <= 1) {
            container.innerHTML = '<li class="waypoint-item empty">Nenhum ponto de guinada adicionado à derrota.</li>';
            return;
        }

        for (let i = 0; i < sequence.length; i++) {
            const wp = sequence[i];
            const li = document.createElement('li');
            li.className = 'waypoint-item';

            let legInfo = 'Origem / Ponto de Partida';
            if (i > 0) {
                const prev = sequence[i - 1];
                const dist = haversineNM(prev.lat, prev.lng, wp.lat, wp.lng);
                const bearing = calculateBearing(prev.lat, prev.lng, wp.lat, wp.lng);
                legInfo = `Perna ${i}: Dist ${dist.toFixed(1)} NM | Rumo ${bearing}°`;
            }

            li.innerHTML = `
                <div class="wp-item-head">
                    <span class="wp-num">${i === 0 ? 'PARTIDA' : `WPT ${i}`}</span>
                    <strong>${wp.name}</strong>
                    ${i > 0 ? `<button class="btn-remove-wp" onclick="window.removeWaypoint(${i - 1})">&times;</button>` : ''}
                </div>
                <div class="wp-item-meta">${legInfo}</div>
                <div class="wp-coords">${toDMS(wp.lat, true)} | ${toDMS(wp.lng, false)}</div>
            `;
            container.appendChild(li);
        }
    }

    window.removeWaypoint = (index) => {
        routeWaypoints.splice(index, 1);
        updateRoute();
    };

    window.addSignalToRoute = (code) => {
        const signal = signalsData.find(s => s.code === code);
        if (!signal) return;

        routeWaypoints.push({
            code: signal.code,
            name: `${signal.code} - ${signal.name}`,
            lat: signal.lat,
            lng: signal.lng
        });

        isRouteVisible = true;
        updateRoute();
        showToast(`Sinal ${signal.code} adicionado à derrota náutica!`, 'success');
    };

    // =========================================================================
    // 12. CONTROLES DE INTERFACE & FILTROS
    // =========================================================================
    // Alternância de Abas da Barra Lateral (Sinais, Derrota, IE & Stats)
    document.querySelectorAll('.sidebar-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = btn.getAttribute('data-tab');
            if (!tabId) return;

            document.querySelectorAll('.sidebar-tabs .tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.app-sidebar .tab-content').forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const targetContent = document.getElementById(tabId);
            if (targetContent) {
                targetContent.classList.add('active');
            }

            if (tabId === 'tab-ie') {
                updateIE();
            } else if (tabId === 'tab-route') {
                updateRoute();
            }
        });
    });

    const searchInput = document.getElementById('searchInput');
    searchInput?.addEventListener('input', (e) => {
        currentSearch = e.target.value;
        renderSignalList();
    });

    document.getElementById('btnClearSearch')?.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        currentSearch = '';
        renderSignalList();
    });

    document.querySelectorAll('.pill-btn').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.pill-btn').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentFilter = pill.getAttribute('data-filter');
            renderSignalList();
            renderMapMarkers();
        });
    });

    const typeFilterSelect = document.getElementById('typeFilterSelect');
    typeFilterSelect?.addEventListener('change', (e) => {
        currentTypeFilter = e.target.value;
        renderSignalList();
        renderMapMarkers();
    });

    const responsavelFilterSelect = document.getElementById('responsavelFilterSelect');
    responsavelFilterSelect?.addEventListener('change', (e) => {
        currentResponsavelFilter = e.target.value;
        renderSignalList();
        renderMapMarkers();
    });

    document.getElementById('btnCenterAll')?.addEventListener('click', () => {
        if (signalsData.length === 0) return;
        const bounds = L.latLngBounds(signalsData.map(s => [s.lat, s.lng]));
        map.fitBounds(bounds, { padding: [40, 40] });
    });

    document.getElementById('btnMapReset')?.addEventListener('click', () => {
        map.flyTo([-0.5, -49.0], 8, { duration: 1.2 });
    });

    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.getAttribute('data-close');
            document.getElementById(modalId)?.classList.remove('active');
        });
    });

    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) backdrop.classList.remove('active');
        });
    });

    document.getElementById('btnOpenSimulator')?.addEventListener('click', openSimulator);
    document.getElementById('btnOpenSimulator2')?.addEventListener('click', openSimulator);

    // =========================================================================
    // 13. CRIAR E EXCLUIR SINAIS (COM SUPORTE A RESPONSÁVEL E PERSISTÊNCIA)
    // =========================================================================
    const modalAddSignal = document.getElementById('modalAddSignal');
    const btnTabCreateMode = document.getElementById('btnTabCreateMode');
    const btnTabDeleteMode = document.getElementById('btnTabDeleteMode');
    const panelCreateSignal = document.getElementById('panelCreateSignal');
    const panelDeleteSignal = document.getElementById('panelDeleteSignal');

    function switchManageMode(mode) {
        if (mode === 'create') {
            if (panelCreateSignal) panelCreateSignal.style.display = 'block';
            if (panelDeleteSignal) panelDeleteSignal.style.display = 'none';
        } else {
            if (panelDeleteSignal) panelDeleteSignal.style.display = 'block';
            if (panelCreateSignal) panelCreateSignal.style.display = 'none';
            populateDeleteSignalSelectModal();
        }
    }

    if (btnTabCreateMode && btnTabDeleteMode) {
        btnTabCreateMode.addEventListener('click', () => switchManageMode('create'));
        btnTabDeleteMode.addEventListener('click', () => switchManageMode('delete'));
    }

    document.getElementById('btnOpenAddSignalHeader')?.addEventListener('click', () => {
        document.getElementById('formAddSignal')?.reset();
        switchManageMode('create');
        modalAddSignal?.classList.add('active');
    });

    function populateDeleteSignalSelectModal() {
        const select = document.getElementById('selectSignalToDeleteModal');
        if (!select) return;

        if (signalsData.length === 0) {
            select.innerHTML = '<option value="">Nenhum sinal cadastrado</option>';
            return;
        }

        select.innerHTML = signalsData.map(s => `
            <option value="${s.code}">${s.code} - ${s.name} (${s.type}) [${s.responsavel || 'CHN-4'}]</option>
        `).join('');

        select.value = signalsData[0].code;
        updateDeletePreviewCardModal(signalsData[0].code);
    }

    function updateDeletePreviewCardModal(code) {
        const signal = signalsData.find(s => s.code === code);
        if (!signal) return;

        const isOp = isOperational(signal.status);
        document.getElementById('delPreviewCode').textContent = signal.code;
        document.getElementById('delPreviewStatus').textContent = signal.status;
        document.getElementById('delPreviewStatus').className = `badge ${isOp ? 'badge-op' : 'badge-av'}`;
        document.getElementById('delPreviewName').textContent = signal.name;
        document.getElementById('delPreviewType').textContent = signal.type;
        document.getElementById('delPreviewPos').textContent = `Lat: ${toDMS(signal.lat, true)}, Lng: ${toDMS(signal.lng, false)}`;
        document.getElementById('delPreviewJurisdiction').textContent = `Jurisdição: ${signal.jurisdiction || 'CHN-4'}`;
        document.getElementById('delPreviewResponsavel').textContent = `Responsável: ${signal.responsavel || 'CHN-4'}`;
    }

    document.getElementById('selectSignalToDeleteModal')?.addEventListener('change', (e) => {
        updateDeletePreviewCardModal(e.target.value);
    });

    document.getElementById('btnConfirmDeleteSignalModal')?.addEventListener('click', () => {
        const select = document.getElementById('selectSignalToDeleteModal');
        if (!select || !select.value) return;

        deleteSignalPermanently(select.value, select.options[select.selectedIndex].text);
    });

    // Form Submit: Save New Signal
    document.getElementById('formAddSignal')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const lat = parseFloat(document.getElementById('addLat').value);
        const lng = parseFloat(document.getElementById('addLng').value);

        if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
            showToast('Informe as coordenadas válidas.', 'danger');
            return;
        }

        const code = document.getElementById('addCode').value.trim();
        if (signalsData.some(s => s.code === code)) {
            showToast(`Já existe um sinal com o código ${code}.`, 'danger');
            return;
        }

        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        const statusVal = document.getElementById('addStatus').value;
        const responsavelVal = document.getElementById('addResponsavel').value;

        const newSignal = {
            code: code,
            name: document.getElementById('addName').value.trim(),
            type: document.getElementById('addType').value,
            status: statusVal,
            lat: lat,
            lng: lng,
            characteristic: document.getElementById('addCharacteristic').value.trim() || 'Lp. W. 5s 6m 8NM',
            rangeNM: parseFloat(document.getElementById('addRange').value) || 6,
            altitudeM: parseFloat(document.getElementById('addAltitude').value) || 5,
            jurisdiction: document.getElementById('addJurisdiction').value.trim() || `Jurisdição ${responsavelVal}`,
            responsavel: responsavelVal,
            image: null,
            photoDate: null,
            history: [
                { date: dateStr, status: statusVal, note: `Sinal cadastrado no sistema. Responsável: ${responsavelVal}` }
            ]
        };

        // Persist to Firebase Firestore or REST API
        if (typeof isFirebaseActive !== 'undefined' && isFirebaseActive && db) {
            try {
                await db.collection("signals").doc(code).set(newSignal);
                console.log(`🔥 Firestore: Sinal ${code} criado na nuvem!`);
            } catch (err) {
                console.error("Erro ao criar no Firestore:", err);
            }
        } else {
            try {
                await fetch('/api/signals', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newSignal)
                });
            } catch (err) {
                console.warn('API REST POST fallback:', err);
            }
        }

        signalsData.push(newSignal);
        saveLocalCache();
        updateIE();
        renderMapMarkers();
        renderSignalList();

        modalAddSignal?.classList.remove('active');
        showToast(`Sinal ${code} registrado e salvo no banco de dados!`, 'success');

        map.flyTo([lat, lng], 12, { duration: 1.2 });
        if (mapMarkers[code]) mapMarkers[code].openPopup();
    });

    // =========================================================================
    // 14. INTEROPERABILIDADE E SINCRONIZAÇÃO EM TEMPO REAL (FIREBASE FIRESTORE / SSE)
    // =========================================================================
    function setupRealtimeSync() {
        const syncText = document.getElementById('syncStatusText');
        const syncDot = document.querySelector('#syncStatusBadge .sync-dot');

        // Priority 1: Firebase Cloud Firestore Real-time listener (Nuvem / GitHub Pages)
        if (typeof isFirebaseActive !== 'undefined' && isFirebaseActive && db) {
            if (syncText) syncText.textContent = 'ONLINE (FIREBASE CLOUD)';
            if (syncDot) syncDot.className = 'sync-dot sync-online';

            db.collection("signals").onSnapshot((snapshot) => {
                if (!snapshot.empty) {
                    const remoteSignals = [];
                    snapshot.forEach(doc => {
                        remoteSignals.push(doc.data());
                    });
                    signalsData = remoteSignals;
                    saveLocalCache();
                    updateTypeFilterDropdown();
                    updateIE();
                    renderMapMarkers();
                    renderSignalList();

                    if (selectedSignal) {
                        const updated = signalsData.find(s => s.code === selectedSignal.code);
                        if (updated) selectedSignal = updated;
                    }
                    console.log(`🔥 Cloud Firestore: ${signalsData.length} sinais sincronizados em tempo real.`);
                } else {
                    console.log("🔥 Firestore está vazio. Iniciando carga automática (auto-seed)...");
                    showToast("Populando o banco de dados Firebase Firestore com a base de dados...", "info");
                    
                    const batch = db.batch();
                    signalsData.forEach(s => {
                        if (s.code) {
                            const ref = db.collection("signals").doc(s.code);
                            batch.set(ref, s);
                        }
                    });
                    batch.commit().then(() => {
                        console.log("🔥 Firestore populado com sucesso!");
                        showToast("🔥 Base de dados enviada para o Firebase Firestore na nuvem!", "success");
                    }).catch(err => {
                        console.error("Erro no auto-seed do Firestore:", err);
                    });
                }
            }, (err) => {
                console.warn("Erro no listener Firestore:", err);
            });
            return;
        }

        // Priority 2: Local Server-Sent Events (SSE) fallback
        if (typeof EventSource === 'undefined') return;

        try {
            const evtSource = new EventSource('/api/events');

            evtSource.onopen = () => {
                if (syncText) syncText.textContent = 'ONLINE (MULTI-USUÁRIO LOCAL)';
                if (syncDot) syncDot.className = 'sync-dot sync-online';
            };

            evtSource.addEventListener('signal-change', async (event) => {
                try {
                    console.log('Realtime SSE Event received:', event.data);
                    const resp = await fetch('/api/signals');
                    if (resp.ok) {
                        signalsData = await resp.json();
                        saveLocalCache();
                        updateTypeFilterDropdown();
                        updateIE();
                        renderMapMarkers();
                        renderSignalList();
                        
                        if (selectedSignal) {
                            const updated = signalsData.find(s => s.code === selectedSignal.code);
                            if (updated) selectedSignal = updated;
                        }

                        showToast('📢 Atualização remota recebida! Base sincronizada.', 'info');
                    }
                } catch (err) {
                    console.warn('SSE event parsing error:', err);
                }
            });

            evtSource.onerror = () => {
                if (syncText) syncText.textContent = 'MODO LOCAL';
                if (syncDot) syncDot.className = 'sync-dot sync-offline';
            };
        } catch (err) {
            console.warn('Realtime sync setup skipped.', err);
        }
    }

    // =========================================================================
    // GMS (GG° MM' SS") <-> DECIMAL (DD) COORDINATE CONVERTERS
    // =========================================================================
    function gmsToDecimal(deg, min, sec, hem) {
        const d = Math.abs(parseFloat(deg) || 0);
        const m = Math.abs(parseFloat(min) || 0);
        const s = Math.abs(parseFloat(sec) || 0);
        let dec = d + (m / 60) + (s / 3600);
        if (hem === 'S' || hem === 'W') dec = -dec;
        return dec;
    }

    function decimalToGMS(dec, isLat) {
        const num = parseFloat(dec);
        if (isNaN(num)) return { deg: '', min: '', sec: '', hem: isLat ? 'S' : 'W' };
        const hem = num < 0 ? (isLat ? 'S' : 'W') : (isLat ? 'N' : 'E');
        const abs = Math.abs(num);
        const deg = Math.floor(abs);
        const remMin = (abs - deg) * 60;
        const min = Math.floor(remMin);
        const sec = (remMin - min) * 60;
        return {
            deg: deg,
            min: min,
            sec: parseFloat(sec.toFixed(6)),
            hem: hem
        };
    }

    document.getElementById('btnCoordModeDecimal')?.addEventListener('click', () => {
        document.getElementById('btnCoordModeDecimal')?.classList.add('active');
        document.getElementById('btnCoordModeGMS')?.classList.remove('active');
        document.getElementById('panelCoordDecimal').style.display = 'block';
        document.getElementById('panelCoordGMS').style.display = 'none';
        const addLat = document.getElementById('addLat');
        const addLng = document.getElementById('addLng');
        if (addLat) addLat.required = true;
        if (addLng) addLng.required = true;
    });

    document.getElementById('btnCoordModeGMS')?.addEventListener('click', () => {
        document.getElementById('btnCoordModeGMS')?.classList.add('active');
        document.getElementById('btnCoordModeDecimal')?.classList.remove('active');
        document.getElementById('panelCoordGMS').style.display = 'block';
        document.getElementById('panelCoordDecimal').style.display = 'none';
        const addLat = document.getElementById('addLat');
        const addLng = document.getElementById('addLng');
        if (addLat) addLat.required = false;
        if (addLng) addLng.required = false;
    });

    function syncGmsToDecimal() {
        const latDeg = document.getElementById('addLatDeg')?.value;
        const latMin = document.getElementById('addLatMin')?.value;
        const latSec = document.getElementById('addLatSec')?.value;
        const latHem = document.getElementById('addLatHem')?.value;

        if (latDeg !== '' || latMin !== '' || latSec !== '') {
            const latDec = gmsToDecimal(latDeg, latMin, latSec, latHem);
            const addLatEl = document.getElementById('addLat');
            if (addLatEl) addLatEl.value = latDec.toFixed(7);
        }

        const lngDeg = document.getElementById('addLngDeg')?.value;
        const lngMin = document.getElementById('addLngMin')?.value;
        const lngSec = document.getElementById('addLngSec')?.value;
        const lngHem = document.getElementById('addLngHem')?.value;

        if (lngDeg !== '' || lngMin !== '' || lngSec !== '') {
            const lngDec = gmsToDecimal(lngDeg, lngMin, lngSec, lngHem);
            const addLngEl = document.getElementById('addLng');
            if (addLngEl) addLngEl.value = lngDec.toFixed(7);
        }
    }

    function syncDecimalToGms() {
        const latVal = document.getElementById('addLat')?.value;
        if (latVal !== '') {
            const gms = decimalToGMS(latVal, true);
            if (document.getElementById('addLatDeg')) document.getElementById('addLatDeg').value = gms.deg;
            if (document.getElementById('addLatMin')) document.getElementById('addLatMin').value = gms.min;
            if (document.getElementById('addLatSec')) document.getElementById('addLatSec').value = gms.sec;
            if (document.getElementById('addLatHem')) document.getElementById('addLatHem').value = gms.hem;
        }

        const lngVal = document.getElementById('addLng')?.value;
        if (lngVal !== '') {
            const gms = decimalToGMS(lngVal, false);
            if (document.getElementById('addLngDeg')) document.getElementById('addLngDeg').value = gms.deg;
            if (document.getElementById('addLngMin')) document.getElementById('addLngMin').value = gms.min;
            if (document.getElementById('addLngSec')) document.getElementById('addLngSec').value = gms.sec;
            if (document.getElementById('addLngHem')) document.getElementById('addLngHem').value = gms.hem;
        }
    }

    ['addLatDeg', 'addLatMin', 'addLatSec', 'addLatHem', 'addLngDeg', 'addLngMin', 'addLngSec', 'addLngHem'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', syncGmsToDecimal);
        document.getElementById(id)?.addEventListener('change', syncGmsToDecimal);
    });

    ['addLat', 'addLng'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', syncDecimalToGms);
        document.getElementById(id)?.addEventListener('change', syncDecimalToGms);
    });

    // =========================================================================
    // 16. GESTÃO DE PONTOS DE PARADA & BACKUPS
    // =========================================================================
    const modalBackups = document.getElementById('modalBackups');
    const btnOpenBackupsModal = document.getElementById('btnOpenBackupsModal');
    const btnCreateManualBackup = document.getElementById('btnCreateManualBackup');
    const btnImportBackupFileTrigger = document.getElementById('btnImportBackupFileTrigger');
    const inputBackupFile = document.getElementById('inputBackupFile');

    btnOpenBackupsModal?.addEventListener('click', () => {
        loadBackupsList();
        modalBackups?.classList.add('active');
    });

    async function loadBackupsList() {
        const tableBody = document.getElementById('backupsListTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = '<tr><td colspan="4" class="text-center p-3 text-muted">Buscando pontos de parada...</td></tr>';

        let backups = [];
        try {
            const resp = await fetch('/api/backups');
            if (resp.ok) {
                backups = await resp.json();
            }
        } catch (e) {
            console.warn('API REST /api/backups indisponível, usando backups locais.', e);
        }

        if (!Array.isArray(backups) || backups.length === 0) {
            try {
                const localRaw = localStorage.getItem('chn4_aton_backups_history');
                if (localRaw) backups = JSON.parse(localRaw);
            } catch (e) {}
        }

        if (!Array.isArray(backups) || backups.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center p-3 text-muted">Nenhum ponto de parada ou backup encontrado. Clique em "Criar Ponto de Parada Agora".</td></tr>';
            return;
        }

        tableBody.innerHTML = '';
        backups.forEach(b => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border-color)';

            tr.innerHTML = `
                <td style="padding: 10px 8px; font-weight: 500;">
                    <i class="fa-solid fa-calendar-check text-gold"></i> ${b.formattedDate || b.createdAt}
                </td>
                <td style="padding: 10px 8px;">
                    <span class="backup-badge-count">${b.count} sinais</span>
                </td>
                <td style="padding: 10px 8px; color: var(--text-secondary);">
                    ${b.note || 'Ponto de Parada'}
                </td>
                <td style="padding: 10px 8px; text-align: right;">
                    <div style="display: flex; gap: 6px; justify-content: flex-end;">
                        <button class="btn btn-primary btn-sm" onclick="window.restoreBackupPoint('${b.filename}')" title="Restaurar base de dados para este ponto">
                            <i class="fa-solid fa-rotate-left"></i> Restaurar
                        </button>
                        ${b.filename ? `<button class="btn btn-outline btn-sm" onclick="window.downloadBackupFile('${b.filename}')" title="Baixar arquivo JSON de backup"><i class="fa-solid fa-download"></i></button>` : ''}
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    btnCreateManualBackup?.addEventListener('click', async () => {
        const notePrompt = prompt("Digite uma descrição / nota para este Ponto de Parada (opcional):", "Backup manual do operador");
        if (notePrompt === null) return;

        const note = notePrompt.trim() || 'Ponto de parada manual';

        try {
            const resp = await fetch('/api/backups/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ note: note })
            });
            if (resp.ok) {
                showToast('Ponto de parada criado com sucesso!', 'success');
                loadBackupsList();
                return;
            }
        } catch (e) {
            console.warn('API REST criar backup fallback local.', e);
        }

        try {
            let localBackups = [];
            const raw = localStorage.getItem('chn4_aton_backups_history');
            if (raw) localBackups = JSON.parse(raw);

            const now = new Date();
            localBackups.unshift({
                filename: null,
                createdAt: now.toISOString(),
                formattedDate: now.toLocaleString('pt-BR'),
                count: signalsData.length,
                note: note,
                signals: [...signalsData]
            });
            localStorage.setItem('chn4_aton_backups_history', JSON.stringify(localBackups.slice(0, 30)));
            showToast('Ponto de parada salvo localmente no navegador!', 'success');
            loadBackupsList();
        } catch (e) {
            showToast('Erro ao criar ponto de parada.', 'danger');
        }
    });

    window.restoreBackupPoint = async (filename) => {
        if (!confirm(`ATENÇÃO: Deseja restaurar o banco de dados para o Ponto de Parada escolhido?\n\nEsta ação irá atualizar o mapa e a lista de sinais em todos os dispositivos conectados.`)) {
            return;
        }

        if (filename) {
            try {
                const resp = await fetch('/api/backups/restore', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename: filename })
                });

                if (resp.ok) {
                    const resData = await resp.json();
                    if (resData.signals && Array.isArray(resData.signals)) {
                        signalsData = resData.signals;
                    } else {
                        await loadSignalsFromBackend();
                    }

                    saveLocalCache();
                    updateTypeFilterDropdown();
                    updateIE();
                    renderMapMarkers();
                    renderSignalList();

                    modalBackups?.classList.remove('active');
                    showToast(`Base restaurada com sucesso para o backup ${filename}!`, 'success');
                    return;
                }
            } catch (e) {
                console.warn('Erro ao restaurar via REST API:', e);
            }
        }

        try {
            const raw = localStorage.getItem('chn4_aton_backups_history');
            if (raw) {
                const localBackups = JSON.parse(raw);
                const target = localBackups.find(b => b.filename === filename || (!filename && b.signals));
                if (target && Array.isArray(target.signals)) {
                    signalsData = [...target.signals];
                    saveLocalCache();
                    updateTypeFilterDropdown();
                    updateIE();
                    renderMapMarkers();
                    renderSignalList();
                    modalBackups?.classList.remove('active');
                    showToast('Base restaurada do cache local!', 'success');
                }
            }
        } catch (e) {
            showToast('Erro ao restaurar backup.', 'danger');
        }
    };

    window.downloadBackupFile = (filename) => {
        window.open(`/api/backups/download?file=${encodeURIComponent(filename)}`, '_blank');
    };

    btnImportBackupFileTrigger?.addEventListener('click', () => inputBackupFile?.click());

    inputBackupFile?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const parsed = JSON.parse(evt.target.result);
                const restored = Array.isArray(parsed.signals) ? parsed.signals : (Array.isArray(parsed) ? parsed : null);
                if (!restored || restored.length === 0 || !restored[0].code) {
                    showToast('Arquivo de backup inválido ou sem sinais válidos.', 'danger');
                    return;
                }

                if (!confirm(`Confirmar restauração de ${restored.length} sinais a partir do arquivo [${file.name}]?`)) {
                    return;
                }

                signalsData = restored;
                saveLocalCache();
                updateTypeFilterDropdown();
                updateIE();
                renderMapMarkers();
                renderSignalList();

                try {
                    for (const sig of restored) {
                        saveSignalToBackend(sig);
                    }
                } catch (e) {}

                modalBackups?.classList.remove('active');
                showToast(`Base restaurada a partir do arquivo ${file.name}!`, 'success');
            } catch (err) {
                showToast('Erro ao ler o arquivo de backup.', 'danger');
            }
        };
        reader.readAsText(file);
    });

    // =========================================================================
    // 15. INITIAL BOOTSTRAP
    // =========================================================================
    async function init() {
        await loadSignalsFromBackend();
        setupRealtimeSync();
        updateRoute();
    }

    init();
});
