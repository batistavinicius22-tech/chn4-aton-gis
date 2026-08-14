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

    // Layer 2: Google Satellite
    const googleSatLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        attribution: 'Google Maps Satellite',
        maxZoom: 19
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
    nauticalGroup.addTo(map);
    dhnGeoTiffGroup.addTo(map);

    const baseLayers = {
        "Carta Náutica Base (Ocean/OpenSeaMap)": nauticalGroup,
        "Satélite Esri Imagery": satLayer,
        "Satélite Google": googleSatLayer
    };

    const overlays = {
        "🗺️ Cartas Náuticas DHN (GeoTIFF .tif)": dhnGeoTiffGroup
    };

    L.control.layers(baseLayers, overlays, { position: 'topright' }).addTo(map);

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
        return status === 'OPERACIONAL';
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
    // 4. BANCO DE DADOS CENTRAL COMPARTILHADO (API REST / SIGNALS.JSON / FIRESTORE)
    // =========================================================================
    async function loadSignalsFromBackend() {
        // Se o Firebase estiver ativo, o listener em tempo real (onSnapshot) gerencia a sincronização
        if (typeof isFirebaseActive !== 'undefined' && isFirebaseActive && db) {
            return;
        }

        // Tentar API REST do servidor central (node server.js / python server.py / server.ps1)
        try {
            const resp = await fetch('/api/signals');
            if (resp.ok) {
                const data = await resp.json();
                if (Array.isArray(data) && data.length > 0) {
                    signalsData = data;
                    updateIE();
                    renderMapMarkers();
                    renderSignalList();
                    console.log(`✅ Carregados ${signalsData.length} sinais do banco de dados central via API REST.`);
                    return;
                }
            }
        } catch (e) {
            console.warn('API REST /api/signals indisponível. Tentando arquivo de banco de dados signals.json...', e);
        }

        // Tentar ler o arquivo de banco de dados central signals.json
        try {
            const resp = await fetch('./signals.json');
            if (resp.ok) {
                const data = await resp.json();
                if (Array.isArray(data) && data.length > 0) {
                    signalsData = data;
                    updateIE();
                    renderMapMarkers();
                    renderSignalList();
                    console.log(`✅ Carregados ${signalsData.length} sinais do arquivo de banco de dados central signals.json.`);
                    return;
                }
            }
        } catch (e) {
            console.warn('signals.json indisponível. Utilizando backup em memória.', e);
        }

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

    function matchesTypeFilter(signal) {
        if (currentTypeFilter === 'ALL') return true;
        return getTypeCategory(signal.type) === currentTypeFilter;
    }

    function matchesResponsavelFilter(signal) {
        if (currentResponsavelFilter === 'ALL') return true;
        const resp = (signal.responsavel || '').toUpperCase();
        const filter = currentResponsavelFilter.toUpperCase();
        if (filter === 'EXTRA-MB') {
            return resp.includes('EXTRA') || resp.includes('PRIVADO') || resp.includes('ÓRGÃOS');
        }
        return resp === filter;
    }

    function renderMapMarkers() {
        Object.values(mapMarkers).forEach(m => map.removeLayer(m));
        mapMarkers = {};

        signalsData.filter(s => matchesTypeFilter(s) && matchesResponsavelFilter(s)).forEach(signal => {
            const marker = L.marker([signal.lat, signal.lng], {
                icon: createCustomIcon(signal)
            }).addTo(map);

            const isOp = isOperational(signal.status);
            const respClass = (signal.responsavel === 'CPAP') ? 'resp-cpap' : (signal.responsavel === 'CPMA') ? 'resp-cpma' : (signal.responsavel === 'Extra-MB') ? 'resp-extra' : 'resp-chn4';

            const popupHtml = `
                <div style="font-family: var(--font-sans); padding: 4px;">
                    <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 4px;">
                        <span class="badge ${isOp ? 'badge-op' : 'badge-av'}">${signal.status}</span>
                        <span class="responsavel-badge ${respClass}"><i class="fa-solid fa-building-user"></i> ${signal.responsavel || 'CHN-4'}</span>
                    </div>
                    <h3 style="font-family: var(--font-tech); margin: 6px 0 2px 0; font-size: 1.05rem;">${signal.code} - ${signal.name}</h3>
                    <p style="margin: 0; font-size: 0.8rem; color: #475569;"><strong>Carac:</strong> ${signal.characteristic}</p>
                    <p style="margin: 2px 0 8px 0; font-size: 0.8rem; color: #475569;"><strong>Pos:</strong> ${toDMS(signal.lat, true)} ${toDMS(signal.lng, false)}</p>
                    <div style="display: flex; gap: 6px;">
                        <button onclick="window.openSignalDetail('${signal.code}')" style="background: #1e3a66; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">Ficha DH2</button>
                        <button onclick="window.addSignalToRoute('${signal.code}')" style="background: #d97706; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">+ Add Derrota</button>
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

    function renderSignalList() {
        const container = document.getElementById('signalList');
        if (!container) return;

        container.innerHTML = '';

        const filtered = signalsData.filter(s => {
            const matchesFilter = currentFilter === 'all' ||
                (currentFilter === 'op' && isOperational(s.status)) ||
                (currentFilter === 'av' && !isOperational(s.status));
            
            const searchLower = currentSearch.toLowerCase();
            const matchesSearch = s.code.toLowerCase().includes(searchLower) ||
                s.name.toLowerCase().includes(searchLower) ||
                (s.jurisdiction && s.jurisdiction.toLowerCase().includes(searchLower)) ||
                (s.responsavel && s.responsavel.toLowerCase().includes(searchLower));

            return matchesFilter && matchesSearch && matchesTypeFilter(s) && matchesResponsavelFilter(s);
        });

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

            card.innerHTML = `
                <div class="signal-card-head">
                    <div class="signal-code-title">
                        <i class="fa-solid ${s.type.toLowerCase().includes('boia') || s.type.toLowerCase().includes('bz') ? 'fa-anchor' : 'fa-tower-observation'}" style="color:${isOp ? 'var(--status-op)' : 'var(--status-av)'}"></i>
                        <h4>${s.code}</h4>
                    </div>
                    <div style="display: flex; gap: 4px; align-items: center;">
                        <span class="responsavel-badge ${respClass}">${s.responsavel || 'CHN-4'}</span>
                        <span class="badge ${isOp ? 'badge-op' : 'badge-av'}">${s.status}</span>
                    </div>
                </div>
                <div class="signal-card-body">
                    <strong>${s.name}</strong>
                    <div class="signal-char"><i class="fa-solid fa-lightbulb"></i> ${s.characteristic}</div>
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
    function openSignalDetail(code) {
        const signal = signalsData.find(s => s.code === code);
        if (!signal) return;

        selectedSignal = signal;
        const modal = document.getElementById('modalSignalDetail');

        document.getElementById('modalSignalBadge').textContent = `DH2: ${signal.code}`;
        document.getElementById('modalSignalName').textContent = signal.name;

        // View Mode Specifications
        document.getElementById('modalSpecCode').textContent = signal.code;
        document.getElementById('modalSpecType').textContent = signal.type;
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
    document.getElementById('formEditSpec').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!selectedSignal) return;

        selectedSignal.code = document.getElementById('editCode').value.trim();
        selectedSignal.name = document.getElementById('editName').value.trim();
        selectedSignal.type = document.getElementById('editType').value.trim();
        selectedSignal.characteristic = document.getElementById('editCharacteristic').value.trim();
        selectedSignal.rangeNM = parseFloat(document.getElementById('editRange').value) || 0;
        selectedSignal.altitudeM = parseFloat(document.getElementById('editAltitude').value) || 0;
        selectedSignal.lat = parseFloat(document.getElementById('editLat').value) || selectedSignal.lat;
        selectedSignal.lng = parseFloat(document.getElementById('editLng').value) || selectedSignal.lng;
        selectedSignal.jurisdiction = document.getElementById('editJurisdiction').value.trim();
        
        const editRespEl = document.getElementById('editResponsavel');
        if (editRespEl) selectedSignal.responsavel = editRespEl.value;

        // Persist to Firebase Firestore or REST API
        if (typeof isFirebaseActive !== 'undefined' && isFirebaseActive && db) {
            try {
                await db.collection("signals").doc(selectedSignal.code).set(selectedSignal, { merge: true });
                console.log(`🔥 Firestore: Sinal ${selectedSignal.code} atualizado na nuvem!`);
            } catch (err) {
                console.error("Erro ao salvar no Firestore:", err);
            }
        } else {
            try {
                await fetch(`/api/signals/${encodeURIComponent(selectedSignal.code)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(selectedSignal)
                });
            } catch (err) {
                console.warn('Persistência API REST em modo fallback offline:', err);
            }
        }

        saveLocalCache();
        renderMapMarkers();
        renderSignalList();
        openSignalDetail(selectedSignal.code);

        showToast('Ficha Técnica atualizada e salva no banco de dados!', 'success');
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

        updateIE();
        renderMapMarkers();
        renderSignalList();

        showToast(`Sinal ${code} excluído permanentemente do banco de dados!`, 'warning');
    }

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

    document.getElementById('formUpdateStatus').addEventListener('submit', async (e) => {
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

        // Persist to REST API
        try {
            await fetch(`/api/signals/${encodeURIComponent(selectedSignal.code)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(selectedSignal)
            });
        } catch (err) {
            console.warn('API REST status update fallback:', err);
        }

        saveLocalCache();
        updateIE();
        renderMapMarkers();
        renderSignalList();
        openSignalDetail(selectedSignal.code);

        showToast(`Status do sinal ${selectedSignal.code} atualizado!`, 'success');

        if (!isOperational(newStatus)) {
            generateAVRADIO(selectedSignal, reason);
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
                    updateIE();
                    renderMapMarkers();
                    renderSignalList();

                    if (selectedSignal) {
                        const updated = signalsData.find(s => s.code === selectedSignal.code);
                        if (updated) selectedSignal = updated;
                    }
                    console.log(`🔥 Cloud Firestore: ${signalsData.length} sinais sincronizados em tempo real.`);
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
    // 15. INITIAL BOOTSTRAP
    // =========================================================================
    async function init() {
        await loadSignalsFromBackend();
        setupRealtimeSync();
        updateRoute();
    }

    init();
});
