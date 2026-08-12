/* ==========================================================================
   CENTRO DE HIDROGRAFIA DO NORTE (CHN-4 / 4º DISTRITO NAVAL)
   SISTEMA DE GESTÃO DE AUXÍLIOS À NAVEGAÇÃO (AtoN)
   Código JavaScript ES6+ — Atualizado com Suporte a GeoTIFF, KML, Derrota Náutica e Fotos
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
            image: "https://mymaps.usercontent.google.com/hostedimage/m/*/3AAjQbR5Q1itYVd0D8mXLEsiEb1PsiOPWPGQ0Wx9bota-J-yc-oJP98LJlArTcBJuGOibU7THbeFZ0xQJbY-re1uIi-lUA9fwUz_e9GW1zwhWw0XAzt6FDdurshE03dUj6L9voy6cexWtFR4n1_iR0hEQhilXkkR2R1Mi2XbGFtcLE2vF7FjmSYZIpC8XSsb9UdSrc35Ci0fz8zHgGynX4jrsCLelJ01bwpk3y70gXs8iXjWyslkNbpE-ZAGyQpI?fife=s16383",
            photoDate: "2026-06-25",
            history: [
                { date: "2026-06-25 13:43", status: "A DERIVA", note: "Notificação CFAREM: Sinal DESAPARECIDO / Garreado de sua posição original." }
            ]
        },
        {
            code: "CHN-001",
            name: "Farol de Salinópolis (Pontal da Atalaia)",
            type: "Farol",
            status: "OPERACIONAL",
            lat: -0.59833,
            lng: -47.35528,
            characteristic: "Lp. W. 6s 59m 23NM",
            rangeNM: 23,
            altitudeM: 59,
            jurisdiction: "Capitania dos Portos do Pará",
            image: null,
            photoDate: null,
            history: [
                { date: "2026-07-15 10:30", status: "OPERACIONAL", note: "Inspeção semestral realizada. Lâmpada e baterias ok." }
            ]
        },
        {
            code: "CHN-002",
            name: "Farol de Ponta de Pedras (Ilha de Marajó)",
            type: "Farol",
            status: "APAGADO",
            lat: -1.38556,
            lng: -48.86528,
            characteristic: "Lp(2) W 10s 25m 14NM",
            rangeNM: 14,
            altitudeM: 25,
            jurisdiction: "CHN-4 / Baía do Guajará",
            image: null,
            photoDate: null,
            history: [
                { date: "2026-08-01 14:20", status: "APAGADO", note: "Notificação de praticagem: relampejador inoperante devido à descarga atmosférica." }
            ]
        },
        {
            code: "CHN-004",
            name: "Farol Cabeço do Norte (Foz do Amazonas)",
            type: "Farol",
            status: "A DERIVA",
            lat: 1.28889,
            lng: -49.92333,
            characteristic: "Lp. B. 10s 18m 15NM",
            rangeNM: 15,
            altitudeM: 18,
            jurisdiction: "Capitania dos Portos do Amapá",
            image: null,
            photoDate: null,
            history: [
                { date: "2026-08-05 18:45", status: "A DERIVA", note: "Garreamento da estrutura flutuante de sinalização após forte corrente de maré." }
            ]
        }
    ];

    const navalBases = {
        belem: { name: "Base Naval de Val-de-Cães (Belém / CHN-4)", lat: -1.41111, lng: -48.48722 },
        macapa: { name: "Capitania dos Portos do Amapá (Macapá)", lat: 0.04000, lng: -51.05000 },
        santarem: { name: "Capitania Fluvial de Santarém", lat: -2.42167, lng: -54.71000 },
        salinopolis: { name: "Ponto Focal Salinópolis (Atalaia)", lat: -0.60000, lng: -47.36000 }
    };

    // State Variables
    let signalsData = (typeof googleEarthSignals !== 'undefined' && Array.isArray(googleEarthSignals) && googleEarthSignals.length > 0)
        ? [...googleEarthSignals]
        : [...initialSignals];
    let selectedSignal = null;
    let currentFilter = 'all';
    let currentSearch = '';
    let currentTypeFilter = 'ALL'; // Category filter: ALL | FAROL | FAROLETE | BOIA | BALIZA
    let isPickingPosition = false; // map-click-to-pick mode for new signal form
    
    // Waypoints for Navigation Route (Derrota Náutica)
    let routeWaypoints = []; 
    let waypointMarkers = [];
    let isDrawDerrotaMode = false;

    // Map & Layers State
    let mapMarkers = {}; 
    let routePolyline = null;
    let measurePolyline = null;
    let isMeasureMode = false;
    let measurePoints = [];

    // GeoTIFF Overlays State
    let geotiffLayers = []; // Array of { id, name, layer, opacity }

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

    // Layer 3: Nautical Base Charts (Local GeoTIFF tiles fallback to OpenSeaMap & Esri Ocean)
    const localNauticalChartLayer = L.tileLayer('./cartas_geotiff/{z}/{x}/{y}.png', {
        maxZoom: 18,
        errorTileUrl: 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png'
    });

    const esriOceanLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri Ocean Basemap',
        maxZoom: 13
    });

    const openSeaMapLayer = L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
        attribution: 'OpenSeaMap',
        maxZoom: 18
    });

    const nauticalGroup = L.layerGroup([esriOceanLayer, openSeaMapLayer, localNauticalChartLayer]);

    nauticalGroup.addTo(map);

    const baseLayers = {
        "Carta Náutica (GeoTIFF/Ocean)": nauticalGroup,
        "Satélite Esri Imagery": satLayer,
        "Satélite Google": googleSatLayer
    };

    L.control.layers(baseLayers, null, { position: 'topright' }).addTo(map);

    map.on('baselayerchange', (e) => {
        const nameSpan = document.getElementById('activeLayerName');
        if (nameSpan) nameSpan.textContent = e.name;
    });

    // =========================================================================
    // 3. FÓRMULAS NÁUTICAS (HAVERSINE NM, BEARING/RUMO VERDADEIRO, ETA)
    // =========================================================================
    function isOperational(status) {
        return status === 'OPERACIONAL';
    }

    function haversineNM(lat1, lon1, lat2, lon2) {
        const R_NM = 3440.065; // Radius Earth in Nautical Miles
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
    // 4. PARSER E IMPORTADOR DE GOOGLE EARTH (KML)
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
            const desc = descNode ? descNode.textContent : "";

            let imageUrl = null;
            const imgMatch = desc.match(/<img [^>]*src=["']([^"']+)["']/i);
            if (imgMatch) imageUrl = imgMatch[1];

            let nrord = null;
            let tipo = "Sinal Náutico";
            let situacao = "OPERACIONAL";
            let mensagem = "";

            const dataNodes = pm.getElementsByTagName("Data");
            for (let j = 0; j < dataNodes.length; j++) {
                const dName = dataNodes[j].getAttribute("name");
                const valNode = dataNodes[j].getElementsByTagName("value")[0];
                const val = valNode ? valNode.textContent.trim() : "";

                if (dName === "NRORD" && val) nrord = val;
                if (dName === "TIPO" && val) tipo = val;
                if ((dName === "SITUAÇÃO ACD ÚLTIMA INSPEÇÃO" || dName === "SITUACAO") && val) situacao = val;
                if (dName === "MENSAGEM DE ALTERAÇÃO" && val) mensagem = val;
                if (dName === "gx_media_links" && val && !imageUrl) imageUrl = val;
            }

            const coordNode = pm.getElementsByTagName("coordinates")[0];
            if (coordNode && coordNode.textContent) {
                const coordsStr = coordNode.textContent.trim().split(",");
                if (coordsStr.length >= 2) {
                    const lng = parseFloat(coordsStr[0]);
                    const lat = parseFloat(coordsStr[1]);

                    if (!isNaN(lat) && !isNaN(lng)) {
                        let status = "OPERACIONAL";
                        const sitUpper = situacao.toUpperCase();
                        if (sitUpper.includes("DESAPARECIDO") || sitUpper.includes("APAGADO") || sitUpper.includes("A DERIVA") || sitUpper.includes("AVARIADO") || sitUpper.includes("FORA")) {
                            status = (sitUpper.includes("DERIVA") || sitUpper.includes("DESAPARECIDO")) ? "A DERIVA" : "APAGADO";
                        }

                        imported.push({
                            code: nrord || `PA-${String(i + 1).padStart(2, '0')}`,
                            name: name,
                            type: tipo || "Bóia/Farol",
                            status: status,
                            lat: lat,
                            lng: lng,
                            characteristic: tipo.includes("BZ") || tipo.includes("BC") ? "Lp. V. 3s 4m 6NM" : "Lp. W. 6s 15m 12NM",
                            rangeNM: 6,
                            altitudeM: 4,
                            jurisdiction: "CHN-4 / 4º DN",
                            image: imageUrl,
                            photoDate: imageUrl ? "2026-08-01" : null,
                            history: [
                                {
                                    date: "2026-08-10 10:00",
                                    status: status,
                                    note: mensagem || `Importado do Google Earth. Situação: ${situacao}`
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
            showToast(`${imported.length} sinais do Google Earth importados com sucesso!`, 'success');
        }
    }

    // Attempt auto-load of google_earth_signals.kml if pre-parsed signals are not present
    if (typeof googleEarthSignals === 'undefined' || !googleEarthSignals.length) {
        loadKML('./google_earth_signals.kml');
    }

    // KML File Upload Listeners
    const inputKmlFile = document.getElementById('inputKmlFile');
    document.getElementById('btnImportKmlHeader').addEventListener('click', () => inputKmlFile.click());

    inputKmlFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            loadKML(event.target.result);
        };
        reader.readAsText(file);
    });

    // =========================================================================
    // 5. CARREGADOR E GERENCIADOR DE CARTAS GEOTIFF (.TIF)
    // =========================================================================
    const inputGeotiffFile = document.getElementById('inputGeotiffFile');
    document.getElementById('btnLoadGeotiffHeader').addEventListener('click', () => inputGeotiffFile.click());
    document.getElementById('btnUploadTifTab').addEventListener('click', () => inputGeotiffFile.click());

    inputGeotiffFile.addEventListener('change', async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                showToast(`Processando carta GeoTIFF: ${file.name}...`, 'info');
                const arrayBuffer = await file.arrayBuffer();

                if (typeof parseGeoRaster !== 'undefined') {
                    const georaster = await parseGeoRaster(arrayBuffer);
                    
                    const layer = new GeoRasterLayer({
                        georaster: georaster,
                        opacity: 0.8,
                        resolution: 256
                    });

                    layer.addTo(map);
                    map.fitBounds(layer.getBounds());

                    const layerId = `tif-${Date.now()}-${i}`;
                    geotiffLayers.push({
                        id: layerId,
                        name: file.name,
                        layer: layer,
                        opacity: 0.8
                    });

                    renderGeoTIFFLayersList();
                    showToast(`Carta GeoTIFF ${file.name} carregada com sucesso!`, 'success');
                } else {
                    showToast(`Biblioteca GeoRaster indisponível no momento.`, 'danger');
                }
            } catch (err) {
                console.error("GeoTIFF parse error:", err);
                showToast(`Erro ao carregar arquivo GeoTIFF ${file.name}.`, 'danger');
            }
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
    // 6. ÍNDICE DE EFICÁCIA (IE) & SIMULADOR
    // =========================================================================
    // Classify a signal type into a broad category for the filter
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

        // Type breakdown counts
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

        document.getElementById('countAll').textContent = total;
        document.getElementById('countOp').textContent = opCount;
        document.getElementById('countAv').textContent = avCount;
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
    // 7. RENDERIZAÇÃO PADRONIZADA DE MARCADORES (INTUITIVO VERDE/VERMELHO)
    // =========================================================================
    function createCustomIcon(signal) {
        const isOp = isOperational(signal.status);
        const statusClass = isOp ? 'status-op' : 'status-av';
        const iconType = signal.type.toLowerCase().includes('bóia') || signal.type.toLowerCase().includes('boia') || signal.type.toLowerCase().includes('bz') ? 'fa-anchor' : 'fa-tower-observation';

        return L.divIcon({
            className: 'custom-aton-marker-wrapper',
            html: `<div class="aton-marker ${statusClass}" title="${signal.code} - ${signal.name}">
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

    function renderMapMarkers() {
        Object.values(mapMarkers).forEach(m => map.removeLayer(m));
        mapMarkers = {};

        signalsData.filter(s => matchesTypeFilter(s)).forEach(signal => {
            const marker = L.marker([signal.lat, signal.lng], {
                icon: createCustomIcon(signal)
            }).addTo(map);

            const isOp = isOperational(signal.status);
            const popupHtml = `
                <div style="font-family: var(--font-sans); padding: 4px;">
                    <span class="badge ${isOp ? 'badge-op' : 'badge-av'}">${signal.status}</span>
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
                s.jurisdiction.toLowerCase().includes(searchLower);

            return matchesFilter && matchesSearch && matchesTypeFilter(s);
        });

        if (filtered.length === 0) {
            container.innerHTML = '<div class="text-muted p-3 text-center">Nenhum auxílio à navegação encontrado.</div>';
            return;
        }

        filtered.forEach(s => {
            const isOp = isOperational(s.status);
            const card = document.createElement('div');
            card.className = `signal-card ${isOp ? 'status-op' : 'status-av'}`;
            card.id = `card-${s.code}`;
            
            card.innerHTML = `
                <div class="signal-card-head">
                    <div class="signal-code-title">
                        <i class="fa-solid ${s.type.toLowerCase().includes('boia') || s.type.toLowerCase().includes('bz') ? 'fa-anchor' : 'fa-tower-observation'}" style="color:${isOp ? 'var(--status-op)' : 'var(--status-av)'}"></i>
                        <h4>${s.code}</h4>
                    </div>
                    <span class="badge ${isOp ? 'badge-op' : 'badge-av'}">${s.status}</span>
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
    // 8. DETALHES DO SINAL: EDICÃO DE FICHA TÉCNICA E GERENCIAMENTO DE FOTO
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
        document.getElementById('modalSpecJurisdiction').textContent = signal.jurisdiction;

        const isOp = isOperational(signal.status);
        document.getElementById('modalSpecStatus').innerHTML = `<span class="badge ${isOp ? 'badge-op' : 'badge-av'}">${signal.status}</span>`;

        // Reset Modes
        toggleEditSpecMode(false);

        // Photo Display
        renderSignalPhoto(signal);

        // Form Inputs Reset
        document.getElementById('selectNewStatus').value = isOp ? 'OPERACIONAL' : signal.status;
        document.getElementById('textOccurrenceReason').value = '';

        const btnAvradio = document.getElementById('btnGenerateAvradioModal');
        btnAvradio.style.display = isOp ? 'none' : 'inline-flex';

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

    // Toggle Technical Specification Edit Mode
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
            document.getElementById('editJurisdiction').value = selectedSignal.jurisdiction;
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

        selectedSignal.code = document.getElementById('editCode').value.trim();
        selectedSignal.name = document.getElementById('editName').value.trim();
        selectedSignal.type = document.getElementById('editType').value.trim();
        selectedSignal.characteristic = document.getElementById('editCharacteristic').value.trim();
        selectedSignal.rangeNM = parseFloat(document.getElementById('editRange').value) || 0;
        selectedSignal.altitudeM = parseFloat(document.getElementById('editAltitude').value) || 0;
        selectedSignal.lat = parseFloat(document.getElementById('editLat').value) || selectedSignal.lat;
        selectedSignal.lng = parseFloat(document.getElementById('editLng').value) || selectedSignal.lng;
        selectedSignal.jurisdiction = document.getElementById('editJurisdiction').value.trim();

        renderMapMarkers();
        renderSignalList();
        openSignalDetail(selectedSignal.code);

        showToast('Ficha Técnica atualizada com sucesso!', 'success');
    });

    // Delete/Cancel Signal Permanently
    document.getElementById('btnDeleteSignal')?.addEventListener('click', () => {
        if (!selectedSignal) return;
        const code = selectedSignal.code;
        const name = selectedSignal.name;
        
        if (confirm(`ATENÇÃO: Deseja realmente EXCLUIR PERMANENTEMENTE o auxílio à navegação ${code} - ${name}?`)) {
            // Remove from array
            signalsData = signalsData.filter(s => s.code !== code);
            
            // Remove marker from map
            if (mapMarkers[code]) {
                map.removeLayer(mapMarkers[code]);
                delete mapMarkers[code];
            }
            
            // Close modal
            document.getElementById('modalSignalDetail').classList.remove('active');
            selectedSignal = null;

            // Recalculate IE & re-render
            updateIE();
            renderMapMarkers();
            renderSignalList();

            showToast(`Sinal ${code} excluído com sucesso!`, 'warning');
        }
    });

    // Attach/Upload Signal Photo Listener
    const inputPhotoFile = document.getElementById('inputPhotoFile');
    document.getElementById('btnTriggerPhotoUpload').addEventListener('click', () => inputPhotoFile.click());

    inputPhotoFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file || !selectedSignal) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            selectedSignal.image = event.target.result;
            const now = new Date();
            selectedSignal.photoDate = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;

            renderSignalPhoto(selectedSignal);
            showToast('Foto do sinal atualizada!', 'success');
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
        selectedSignal.history.push({
            date: dateStr,
            status: newStatus,
            note: reason
        });

        updateIE();
        renderMapMarkers();
        renderSignalList();
        openSignalDetail(selectedSignal.code);

        showToast(`Status do sinal ${selectedSignal.code} atualizado com sucesso!`, 'success');

        if (!isOperational(newStatus)) {
            generateAVRADIO(selectedSignal, reason);
        }
    });

    // =========================================================================
    // 9. EMISSÃO DE AVRADIO (NORMAM-601/DHN)
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

    document.getElementById('btnCopyAvradio').addEventListener('click', () => {
        const textarea = document.getElementById('avradioTextarea');
        if (!textarea) return;
        textarea.select();
        navigator.clipboard.writeText(textarea.value).then(() => {
            showToast('Texto da Minuta AVRADIO copiado com sucesso!', 'success');
        }).catch(() => {
            showToast('Erro ao copiar texto.', 'danger');
        });
    });

    document.getElementById('btnDownloadAvradio').addEventListener('click', () => {
        const text = document.getElementById('avradioTextarea').value;
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `AVRADIO_${selectedSignal ? selectedSignal.code : 'DHN'}.txt`;
        link.click();
    });

    // =========================================================================
    // 10. MÓDULO DE TRAÇADO INTERATIVO DA DERROTA NÁUTICA (CANAL SEGURO)
    // =========================================================================
    function updateRoute() {
        const baseKey = document.getElementById('routeBaseSelect').value;
        const base = navalBases[baseKey] || navalBases.belem;

        const fullSequence = [
            { id: 'base', name: base.name, lat: base.lat, lng: base.lng, isBase: true },
            ...routeWaypoints
        ];

        // Clear existing markers and lines
        if (routePolyline) map.removeLayer(routePolyline);
        waypointMarkers.forEach(m => map.removeLayer(m));
        waypointMarkers = [];

        const latLngs = fullSequence.map(wp => [wp.lat, wp.lng]);
        routePolyline = L.polyline(latLngs, {
            color: '#f59e0b',
            weight: 4,
            dashArray: '8, 8',
            lineJoin: 'round'
        }).addTo(map);

        // Render draggable Waypoint Markers (Partida, Guinadas, Destino)
        fullSequence.forEach((wp, index) => {
            const isFirst = index === 0;
            const isLast = index === fullSequence.length - 1 && fullSequence.length > 1;
            
            let iconHtml = '';
            let iconAnchor = [13, 13];
            let iconSize = [26, 26];

            if (isFirst) {
                iconHtml = `<div class="waypoint-marker-partida"><i class="fa-solid fa-anchor"></i> PARTIDA: ${wp.name.split('(')[0].trim()}</div>`;
                iconAnchor = [40, 14];
                iconSize = [160, 28];
            } else if (isLast) {
                iconHtml = `<div class="waypoint-marker-destino"><i class="fa-solid fa-flag-checkered"></i> DESTINO: ${wp.name.split('-')[0].trim()}</div>`;
                iconAnchor = [40, 14];
                iconSize = [160, 28];
            } else {
                iconHtml = `<div class="waypoint-marker">${index}</div>`;
                iconAnchor = [13, 13];
                iconSize = [26, 26];
            }

            const wpIcon = L.divIcon({
                className: 'custom-wp-wrapper',
                html: iconHtml,
                iconSize: iconSize,
                iconAnchor: iconAnchor
            });

            const marker = L.marker([wp.lat, wp.lng], {
                icon: wpIcon,
                draggable: true
            }).addTo(map);

            // Dragging feedback
            marker.on('drag', () => {
                const currentPos = marker.getLatLng();
                latLngs[index] = [currentPos.lat, currentPos.lng];
                routePolyline.setLatLngs(latLngs);
            });

            marker.on('dragend', (e) => {
                const newPos = e.target.getLatLng();
                if (index === 0) {
                    base.lat = newPos.lat;
                    base.lng = newPos.lng;
                } else {
                    routeWaypoints[index - 1].lat = newPos.lat;
                    routeWaypoints[index - 1].lng = newPos.lng;
                }
                updateRoute();
            });

            waypointMarkers.push(marker);
        });

        // Compute Distances & Bearings
        let totalNM = 0;
        const waypointsInfo = [];

        for (let i = 0; i < fullSequence.length - 1; i++) {
            const segDist = haversineNM(
                fullSequence[i].lat, fullSequence[i].lng,
                fullSequence[i+1].lat, fullSequence[i+1].lng
            );
            totalNM += segDist;

            const bearing = calculateBearing(
                fullSequence[i].lat, fullSequence[i].lng,
                fullSequence[i+1].lat, fullSequence[i+1].lng
            );

            waypointsInfo.push({
                from: fullSequence[i].name,
                to: fullSequence[i+1].name,
                distNM: segDist,
                bearingDeg: bearing
            });
        }

        const speedKts = parseFloat(document.getElementById('shipSpeedInput').value) || 10;
        const totalHours = speedKts > 0 ? totalNM / speedKts : 0;
        const days = Math.floor(totalHours / 24);
        const hours = Math.floor(totalHours % 24);
        const mins = Math.round((totalHours - Math.floor(totalHours)) * 60);

        let etaFormatted = '';
        if (days > 0) etaFormatted += `${days}d `;
        etaFormatted += `${hours}h ${mins < 10 ? '0' : ''}${mins}m`;

        document.getElementById('routeDistanceVal').innerHTML = `${totalNM.toFixed(1)} <small>NM</small>`;
        document.getElementById('routeWaypointsCount').innerHTML = `${fullSequence.length} <small>pts</small>`;
        document.getElementById('routeEtaVal').textContent = etaFormatted;

        // Waypoints UI List
        const listContainer = document.getElementById('waypointsList');
        if (listContainer) {
            listContainer.innerHTML = '';
            fullSequence.forEach((wp, index) => {
                const li = document.createElement('li');
                li.className = 'waypoint-item';

                const isFirst = index === 0;
                const isLast = index === fullSequence.length - 1 && fullSequence.length > 1;

                let badgeHtml = `<span class="waypoint-num">${index}</span>`;
                if (isFirst) {
                    badgeHtml = `<span class="badge badge-primary" style="font-size:0.7rem;"><i class="fa-solid fa-anchor"></i> PARTIDA</span>`;
                } else if (isLast) {
                    badgeHtml = `<span class="badge badge-op" style="font-size:0.7rem;"><i class="fa-solid fa-flag-checkered"></i> DESTINO</span>`;
                }

                let bearingInfoStr = '';
                if (index > 0 && waypointsInfo[index - 1]) {
                    bearingInfoStr = `<span class="waypoint-bearing"><i class="fa-solid fa-compass"></i> Rumo: ${waypointsInfo[index - 1].bearingDeg}° | Perna: ${waypointsInfo[index - 1].distNM.toFixed(1)} NM</span>`;
                }

                li.innerHTML = `
                    <div class="waypoint-info">
                        ${badgeHtml}
                        <div style="margin-left: 4px;">
                            <strong>${wp.name}</strong>
                            <div><small class="text-muted">${toDMS(wp.lat, true)} | ${toDMS(wp.lng, false)}</small></div>
                            ${bearingInfoStr}
                        </div>
                    </div>
                    ${index > 0 ? `<button class="btn-remove-wp" onclick="window.removeWaypointFromRoute(${index - 1})" title="Remover ponto"><i class="fa-solid fa-xmark"></i></button>` : ''}
                `;
                listContainer.appendChild(li);
            });
        }
    }

    // Toggle Interactive Derrota Drawing Mode
    const btnToggleDrawDerrota = document.getElementById('btnToggleDrawDerrota');
    btnToggleDrawDerrota.addEventListener('click', () => {
        isDrawDerrotaMode = !isDrawDerrotaMode;
        const textSpan = document.getElementById('btnDrawDerrotaText');

        if (isDrawDerrotaMode) {
            btnToggleDrawDerrota.className = 'btn btn-warning';
            textSpan.textContent = 'Clique no Mapa p/ Add Ponto';
            showToast('Modo de Traçado de Derrota ativado. Clique no canal navegável para adicionar pontos de guinada.', 'info');
        } else {
            btnToggleDrawDerrota.className = 'btn btn-primary';
            textSpan.textContent = 'Desenhar no Mapa';
            showToast('Modo de Traçado desativado.', 'info');
        }
    });

    // Map Click Listener for Derrota Drawing Mode
    map.on('click', (e) => {
        if (!isDrawDerrotaMode) return;

        routeWaypoints.push({
            name: `Guinada Wpt ${routeWaypoints.length + 1}`,
            lat: e.latlng.lat,
            lng: e.latlng.lng
        });

        updateRoute();
    });

    function addSignalToRoute(code) {
        const signal = signalsData.find(s => s.code === code);
        if (!signal) return;

        if (routeWaypoints.some(wp => wp.code === code)) {
            showToast(`O sinal ${code} já está na derrota da missão.`, 'warning');
            return;
        }

        routeWaypoints.push({
            code: signal.code,
            name: `${signal.code} - ${signal.name}`,
            lat: signal.lat,
            lng: signal.lng
        });

        updateRoute();
        showToast(`${signal.code} adicionado à derrota!`, 'success');
        document.querySelector('[data-tab="tab-route"]').click();
    }

    window.addSignalToRoute = addSignalToRoute;
    window.openSignalDetail = openSignalDetail;
    window.removeWaypointFromRoute = (index) => {
        routeWaypoints.splice(index, 1);
        updateRoute();
    };

    document.getElementById('btnAddDamagedToRoute')?.addEventListener('click', () => {
        const damaged = signalsData.filter(s => !isOperational(s.status));
        if (damaged.length === 0) {
            showToast('Nenhum sinal avariado no momento!', 'info');
            return;
        }

        damaged.forEach(s => {
            if (!routeWaypoints.some(wp => wp.code === s.code)) {
                routeWaypoints.push({
                    code: s.code,
                    name: `${s.code} - ${s.name}`,
                    lat: s.lat,
                    lng: s.lng
                });
            }
        });

        updateRoute();
        showToast(`${damaged.length} sinais adicionados à derrota!`, 'success');
    });

    document.getElementById('btnClearRoute').addEventListener('click', () => {
        routeWaypoints = [];
        updateRoute();
        showToast('Derrota limpa.', 'info');
    });

    document.getElementById('shipSpeedInput').addEventListener('input', updateRoute);
    document.getElementById('routeBaseSelect').addEventListener('change', updateRoute);

    document.getElementById('btnApplySimulationToRoute').addEventListener('click', () => {
        const checked = document.querySelectorAll('.sim-checkbox:checked');
        routeWaypoints = [];

        checked.forEach(cb => {
            const signal = signalsData.find(s => s.code === cb.value);
            if (signal) {
                routeWaypoints.push({
                    code: signal.code,
                    name: `${signal.code} - ${signal.name}`,
                    lat: signal.lat,
                    lng: signal.lng
                });
            }
        });

        updateRoute();
        document.getElementById('modalSimulator').classList.remove('active');
        document.querySelector('[data-tab="tab-route"]').click();
        showToast('Derrota criada com base na simulação!', 'success');
    });

    // =========================================================================
    // 11. CONTROLES DE INTERFACE & EVENT LISTENERS
    // =========================================================================
    // Mobile View Toggle Switcher (Painel vs Mapa)
    const btnMobileShowSidebar = document.getElementById('btnMobileShowSidebar');
    const btnMobileShowMap = document.getElementById('btnMobileShowMap');
    const appSidebar = document.getElementById('appSidebar');
    const appMapWrapper = document.querySelector('.app-map-wrapper');

    if (btnMobileShowSidebar && btnMobileShowMap && appSidebar && appMapWrapper) {
        btnMobileShowSidebar.addEventListener('click', () => {
            btnMobileShowSidebar.classList.add('active');
            btnMobileShowMap.classList.remove('active');
            appSidebar.classList.remove('mobile-hidden');
            appMapWrapper.classList.add('mobile-hidden');
        });

        btnMobileShowMap.addEventListener('click', () => {
            btnMobileShowMap.classList.add('active');
            btnMobileShowSidebar.classList.remove('active');
            appMapWrapper.classList.remove('mobile-hidden');
            appSidebar.classList.add('mobile-hidden');
            setTimeout(() => map.invalidateSize(), 200);
        });
    }

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });

    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value;
        renderSignalList();
    });

    document.getElementById('btnClearSearch').addEventListener('click', () => {
        searchInput.value = '';
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

    // Type-category filter select
    const typeFilterSelect = document.getElementById('typeFilterSelect');
    if (typeFilterSelect) {
        typeFilterSelect.addEventListener('change', (e) => {
            currentTypeFilter = e.target.value;
            renderSignalList();
            renderMapMarkers();
        });
    }

    document.getElementById('btnCenterAll').addEventListener('click', () => {
        if (signalsData.length === 0) return;
        const bounds = L.latLngBounds(signalsData.map(s => [s.lat, s.lng]));
        map.fitBounds(bounds, { padding: [40, 40] });
    });

    document.getElementById('btnMapReset').addEventListener('click', () => {
        map.flyTo([-0.5, -49.0], 8, { duration: 1.2 });
    });

    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.getAttribute('data-close');
            document.getElementById(modalId).classList.remove('active');
        });
    });

    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) backdrop.classList.remove('active');
        });
    });

    document.getElementById('btnOpenSimulator').addEventListener('click', openSimulator);
    document.getElementById('btnOpenSimulator2').addEventListener('click', openSimulator);

    document.getElementById('btnSimSelectAll').addEventListener('click', () => {
        document.querySelectorAll('.sim-checkbox').forEach(cb => cb.checked = true);
        calculateSimulation();
    });

    document.getElementById('btnSimClearAll').addEventListener('click', () => {
        document.querySelectorAll('.sim-checkbox').forEach(cb => cb.checked = false);
        calculateSimulation();
    });

    document.getElementById('btnModalAddToRoute').addEventListener('click', () => {
        if (selectedSignal) {
            addSignalToRoute(selectedSignal.code);
            document.getElementById('modalSignalDetail').classList.remove('active');
        }
    });

    document.getElementById('btnGenerateAvradioModal').addEventListener('click', () => {
        if (selectedSignal) {
            generateAVRADIO(selectedSignal);
        }
    });

    document.getElementById('btnToggleTheme').addEventListener('click', () => {
        document.body.classList.toggle('theme-light');
        const icon = document.querySelector('#btnToggleTheme i');
        if (document.body.classList.contains('theme-light')) {
            icon.className = 'fa-solid fa-sun';
        } else {
            icon.className = 'fa-solid fa-moon';
        }
    });

    // Distance Measurement Tool
    document.getElementById('btnToggleMeasure').addEventListener('click', () => {
        isMeasureMode = !isMeasureMode;
        const btn = document.getElementById('btnToggleMeasure');
        
        if (isMeasureMode) {
            btn.style.color = 'var(--accent-gold)';
            showToast('Modo de Medição ativado. Clique no mapa para medir distâncias.', 'info');
            measurePoints = [];
        } else {
            btn.style.color = '';
            if (measurePolyline) map.removeLayer(measurePolyline);
            showToast('Modo de Medição desativado.', 'info');
        }
    });


    // =========================================================================
    // 12. CADASTRO MANUAL DE NOVO SINAL NÁUTICO
    // =========================================================================
    const modalAddSignal = document.getElementById('modalAddSignal');
    let pickingMarker = null;

    document.getElementById('btnOpenAddSignalHeader').addEventListener('click', () => {
        document.getElementById('formAddSignal').reset();
        modalAddSignal.classList.add('active');
    });

    // Button: click on map to capture lat/lng for new signal
    document.getElementById('btnPickPointOnMap').addEventListener('click', () => {
        if (!modalAddSignal) return;
        modalAddSignal.classList.remove('active'); // temporarily hide modal
        isPickingPosition = true;
        showToast('Clique no mapa para definir a posição do novo sinal.', 'info');
        document.getElementById('btnPickPointOnMap').textContent = '⏳ Aguardando clique no mapa...';
        map.getContainer().style.cursor = 'crosshair';
    });

    // Form submit: save new signal
    document.getElementById('formAddSignal').addEventListener('submit', (e) => {
        e.preventDefault();

        const lat = parseFloat(document.getElementById('addLat').value);
        const lng = parseFloat(document.getElementById('addLng').value);

        if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
            showToast('Informe as coordenadas ou clique no mapa para posicionar o sinal.', 'danger');
            return;
        }

        const code = document.getElementById('addCode').value.trim();
        if (signalsData.some(s => s.code === code)) {
            showToast(`Já existe um sinal com o código ${code}. Use um código único.`, 'danger');
            return;
        }

        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        const statusVal = document.getElementById('addStatus').value;

        const newSignal = {
            code: code,
            name: document.getElementById('addName').value.trim(),
            type: document.getElementById('addType').value,
            status: statusVal,
            lat: lat,
            lng: lng,
            characteristic: document.getElementById('addCharacteristic').value.trim(),
            rangeNM: parseFloat(document.getElementById('addRange').value) || 0,
            altitudeM: parseFloat(document.getElementById('addAltitude').value) || 0,
            jurisdiction: document.getElementById('addJurisdiction').value.trim(),
            image: null,
            photoDate: null,
            history: [
                { date: dateStr, status: statusVal, note: 'Sinal cadastrado manualmente pelo operador.' }
            ]
        };

        signalsData.push(newSignal);
        updateIE();
        renderMapMarkers();
        renderSignalList();

        modalAddSignal.classList.remove('active');
        showToast(`Sinal ${code} cadastrado com sucesso!`, 'success');

        // Fly to new signal
        map.flyTo([lat, lng], 12, { duration: 1.2 });
        if (mapMarkers[code]) mapMarkers[code].openPopup();
    });

    // =========================================================================
    // 13. UNIFIED MAP CLICK HANDLER
    //     Handles: derrota drawing, position pick for new signal, measurement
    // =========================================================================
    map.on('click', (e) => {
        // Priority 1: picking position for new signal form
        if (isPickingPosition) {
            isPickingPosition = false;
            map.getContainer().style.cursor = '';

            document.getElementById('addLat').value = e.latlng.lat.toFixed(6);
            document.getElementById('addLng').value = e.latlng.lng.toFixed(6);

            // Show temporary marker on map
            if (pickingMarker) map.removeLayer(pickingMarker);
            pickingMarker = L.circleMarker(e.latlng, {
                radius: 10, color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.7
            }).addTo(map).bindPopup('📍 Posição capturada para novo sinal').openPopup();

            // Re-open form modal
            modalAddSignal.classList.add('active');
            const btnPick = document.getElementById('btnPickPointOnMap');
            if (btnPick) btnPick.innerHTML = '<i class="fa-solid fa-crosshairs"></i> Ou Clique no Mapa p/ Capturar Posição';
            showToast(`Posição capturada: ${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`, 'success');
            return;
        }

        // Priority 2: derrota drawing mode
        if (isDrawDerrotaMode) {
            routeWaypoints.push({
                name: `Guinada Wpt ${routeWaypoints.length + 1}`,
                lat: e.latlng.lat,
                lng: e.latlng.lng
            });
            updateRoute();
            return;
        }

        // Priority 3: distance measurement mode
        if (isMeasureMode) {
            measurePoints.push(e.latlng);
            if (measurePolyline) map.removeLayer(measurePolyline);
            measurePolyline = L.polyline(measurePoints, { color: '#06b6d4', weight: 3 }).addTo(map);
            if (measurePoints.length > 1) {
                let dist = 0;
                for (let i = 0; i < measurePoints.length - 1; i++) {
                    dist += haversineNM(
                        measurePoints[i].lat, measurePoints[i].lng,
                        measurePoints[i+1].lat, measurePoints[i+1].lng
                    );
                }
                showToast(`Distância Medida: ${dist.toFixed(2)} NM (${(dist * 1.852).toFixed(2)} km)`, 'info');
            }
        }
    });

    // =========================================================================
    // 14. INITIAL BOOTSTRAP
    // =========================================================================
    updateIE();
    renderMapMarkers();
    renderSignalList();
    updateRoute();
});
