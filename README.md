# CHN-4 | Sistema de Gestão de Auxílios à Navegação (AtoN)

![Marinha do Brasil](https://img.shields.io/badge/Marinha%20do%20Brasil-4%C2%BA%20Distrito%20Naval-001f3f)
![Status](https://img.shields.io/badge/Status-Operacional-059669)
![Licença](https://img.shields.io/badge/Uso-Exclusivo%20CHN--4-d97706)

Painel de controle operacional e visualizador geográfico (GIS) para monitoramento do estado dos sinais náuticos na jurisdição do **Centro de Hidrografia do Norte (CHN-4 / 4º Distrito Naval da Marinha do Brasil)**.

---

## 🎯 Funcionalidades Principais

- **📍 Visualização Geográfica GIS (Leaflet):** Exibição padronizada de faróis, faroletes, bóias e balizas com marcadores interativos em verde (operacional) e vermelho (avariado/desaparecido).
- **📊 Cálculo Automatizado do Índice de Eficácia (IE):** Telemetria em tempo real do percentual de eficácia do balizamento do CHN-4 e por categoria de auxílio.
- **🧮 Simulador de Manutenção:** Simulação de reparos e projeção do ganho de IE (+%) antes de iniciar a missão dos navios balizadores.
- **⚓ Traçado Interativo de Derrota Náutica (Canal Seguro):** Planejador de rotas com pontos arrastáveis (*Drag & Drop*) de **Partida**, **Guinadas** e **Destino** no mapa para desviar de terra/bancos de areia. Cálculo automático de rumo verdadeiro (°), distância por perna (NM), distância total e ETA (tempo estimado de navegação).
- **📋 Ficha Técnica & Registro Fotográfico:** Detalhamento completo dos sinais (código DH2, característica luminosa, alcance, altitude, posição decimal/GMS), edição de dados, exclusão/cancelamento e upload de fotos com data de inspeção.
- **📻 Emissão de Avisos Rádio Navegação (AVRADIO):** Gerador automático de minutas padronizadas de AVRADIO (NORMAM-601/DHN) para rápida transmissão ao Centro de Hidrografia da Marinha.
- **🗺️ Suporte a Cartas Náuticas e Imagens GeoTIFF:** Alternância entre camadas Esri Ocean, Satélite e suporte a cartas náuticas locais em GeoTIFF.
- **📱 Design Responsivo:** Interface adaptada para uso em computadores de bordo, tablets e celulares.

---

## 🛠️ Tecnologias Utilizadas

- **Front-end:** HTML5, CSS3 (Vanilla CSS com tema náutico/militar dark), JavaScript ES6+
- **Mapas & GIS:** Leaflet.js, OpenSeaMap, Esri World Ocean & GeoRaster / GeoRasterLayer para Leaflet
- **Iconografia:** Font Awesome 6
- **Tipografia:** Google Fonts (Rajdhani & Inter)

---

## 🚀 Como Executar Localmente

Como a aplicação foi construída em **JavaScript puro (SPA)**, não é necessária a instalação de dependências ou compilers backend.

1. Clone ou baixe este repositório.
2. Abra o arquivo `index.html` em qualquer navegador moderno (Chrome, Edge, Firefox ou Safari).

---

## 🌐 Como Publicar no GitHub Pages (Web Link Gratuito)

1. Faça o envio deste repositório para o seu perfil no **GitHub**.
2. Acesse as configurações do repositório (**Settings** > **Pages**).
3. Na seção **Source**, selecione a branch `main` e a pasta `/root`.
4. Clique em **Save**.
5. Em aproximadamente 1 minuto, o link público seguro estará disponível (ex: `https://seu-usuario.github.io/chn4-aton-gis/`).

---

*Desenvolvido para o Centro de Hidrografia do Norte (CHN-4 / 4º DN).*
