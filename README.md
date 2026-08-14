# CHN-4 | Sistema de Gestão de Auxílios à Navegação (AtoN)

![Marinha do Brasil](https://img.shields.io/badge/Marinha%20do%20Brasil-4%C2%BA%20Distrito%20Naval-001f3f)
![Status](https://img.shields.io/badge/Status-Operacional-059669)
![Banco de Dados](https://img.shields.io/badge/Banco%20de%20Dados-JSON%20Independente-d97706)
![Interoperabilidade](https://img.shields.io/badge/Interoperabilidade-Tempo%20Real%20(SSE)-0284c7)

Painel de controle operacional e visualizador geográfico (GIS) para monitoramento do estado dos sinais náuticos na jurisdição do **Centro de Hidrografia do Norte (CHN-4 / 4º Distrito Naval da Marinha do Brasil)**.

---

## 🎯 Novidades & Funcionalidades Principais

- **🗄️ Banco de Dados JSON Independente (`signals.json`):** Migração do antigo KML fixo para uma estrutura de banco de dados independente e persistente. Permite **exclusão definitiva**, **edição de ficha técnica** e **cadastro de novos sinais** que são salvos diretamente no banco de dados.
- **🏛️ Atributo "Responsável" & Filtro por Camada:** Cada sinal possui o atributo `Responsável` (ex: `CHN-4`, `CPAP`, `CPMA`, `CPPA`, `Órgãos Extra-MB`). Inclui filtro por camada na interface para selecionar rapidamente qual órgão visualizar.
- **🔄 Interoperabilidade Multi-Usuário em Tempo Real:** Servidor backend com API REST e Server-Sent Events (SSE). Quando um operador adiciona, altera ou exclui um sinal, a modificação é refletida **instantaneamente** na tela de todos os outros usuários conectados.
- **📍 Visualização Geográfica GIS (Leaflet):** Exibição padronizada de faróis, faroletes, bóias e balizas com marcadores interativos em verde (operacional) e vermelho (avariado/desaparecido).
- **📊 Cálculo Automatizado do Índice de Eficácia (IE):** Telemetria em tempo real do percentual de eficácia do balizamento do CHN-4 e por categoria de auxílio.
- **🧮 Simulador de Manutenção:** Simulação de reparos e projeção do ganho de IE (+%) antes de iniciar a missão dos navios balizadores.
- **⚓ Traçado Interativo de Derrota Náutica (Canal Seguro):** Planejador de rotas com pontos arrastáveis (*Drag & Drop*) de **Partida**, **Guinadas** e **Destino** no mapa para desviar de terra/bancos de areia.
- **📋 Ficha Técnica & Registro Fotográfico:** Detalhamento completo dos sinais, edição de dados, exclusão/cancelamento definitivo e upload de fotos.
- **📻 Emissão de Avisos Rádio Navegação (AVRADIO):** Gerador automático de minutas padronizadas de AVRADIO (NORMAM-601/DHN).
- **🗺️ Suporte a Cartas Náuticas e Imagens GeoTIFF:** Alternância entre camadas Esri Ocean, Satélite e suporte a cartas náuticas locais em GeoTIFF.

---

## 🛠️ Tecnologias Utilizadas

- **Front-end:** HTML5, CSS3 (Vanilla CSS náutico/militar dark), JavaScript ES6+
- **Backend / Interoperabilidade:** Node.js (`server.js`) ou Python (`server.py`) com API REST e Server-Sent Events (SSE)
- **Banco de Dados:** JSON Independente (`signals.json`)
- **Mapas & GIS:** Leaflet.js, OpenSeaMap, Esri World Ocean & GeoRaster / GeoRasterLayer para Leaflet
- **Iconografia:** Font Awesome 6

---

## 🚀 Como Executar Localmente

### Opção 1: Servidor Node.js (Recomendado para Multi-Usuário)
```bash
node server.js
```
Acesse `http://localhost:3000` no navegador.

### Opção 2: Servidor Python
```bash
python server.py
```
Acesse `http://localhost:3000` no navegador.

### Opção 3: Modo Estático (Navegador)
Basta abrir o arquivo `index.html` em qualquer navegador.

---

## 🔄 Como Recriar / Atualizar o Banco de Dados JSON a partir do KML
Caso queira reconstruir o banco `signals.json` a partir do KML original:
```bash
powershell -ExecutionPolicy Bypass -File build_db.ps1
```

---

*Desenvolvido para o Centro de Hidrografia do Norte (CHN-4 / 4º DN).*
