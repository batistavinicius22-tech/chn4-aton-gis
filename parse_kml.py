import xml.etree.ElementTree as ET
import json
import re

kml_file = r'C:\Users\batis\.gemini\antigravity-ide\scratch\chn4-aton-gis\google_earth_signals.kml'
tree = ET.parse(kml_file)
root = tree.getroot()

ns = {'kml': 'http://www.opengis.net/kml/2.2'}

signals = []

for idx, placemark in enumerate(root.findall('.//kml:Placemark', ns)):
    name_elem = placemark.find('kml:name', ns)
    name = name_elem.text.strip() if name_elem is not None and name_elem.text else f"Sinal {idx+1}"
    
    desc_elem = placemark.find('kml:description', ns)
    desc = desc_elem.text.strip() if desc_elem is not None and desc_elem.text else ""
    
    # Extract img src from description if present
    img_match = re.search(r'<img [^>]*src=["\']([^"\']+)["\']', desc)
    image_url = img_match.group(1) if img_match else None
    
    # Extended data
    nrord = None
    tipo = "Sinal Náutico"
    situacao = "OPERACIONAL"
    mensagem = ""
    
    ext_data = placemark.find('kml:ExtendedData', ns)
    if ext_data is not None:
        for data in ext_data.findall('kml:Data', ns):
            data_name = data.get('name')
            val_elem = data.find('kml:value', ns)
            val = val_elem.text.strip() if val_elem is not None and val_elem.text else ""
            
            if data_name == "NRORD" and val:
                nrord = val
            elif data_name == "TIPO" and val:
                tipo = val
            elif data_name in ["SITUAÇÃO ACD ÚLTIMA INSPEÇÃO", "SITUACAO"] and val:
                situacao = val
            elif data_name == "MENSAGEM DE ALTERAÇÃO" and val:
                mensagem = val
            elif data_name == "gx_media_links" and val and not image_url:
                image_url = val
    
    # Point coordinates
    point = placemark.find('.//kml:Point/kml:coordinates', ns)
    if point is not None and point.text:
        coords_str = point.text.strip().split(',')
        if len(coords_str) >= 2:
            lng = float(coords_str[0])
            lat = float(coords_str[1])
            
            code = nrord if nrord else f"CHN-{idx+1:03d}"
            
            # Map status
            status = "OPERACIONAL"
            sit_upper = situacao.upper()
            if "DESAPARECIDO" in sit_upper or "APAGADO" in sit_upper or "FORA" in sit_upper or "A DERIVA" in sit_upper or "AVARIADO" in sit_upper:
                if "DESAPARECIDO" in sit_upper:
                    status = "A DERIVA"
                elif "APAGADO" in sit_upper:
                    status = "APAGADO"
                else:
                    status = "APAGADO"
            
            signal_obj = {
                "code": code,
                "name": name,
                "type": tipo,
                "status": status,
                "lat": lat,
                "lng": lng,
                "characteristic": "Lp. W. 5s" if "BZ" in tipo else "Lp. W. 10s",
                "rangeNM": 10,
                "altitudeM": 12,
                "jurisdiction": "CHN-4 / 4º DN",
                "image": image_url,
                "photoDate": "2026-08-01" if image_url else None,
                "history": [
                    {
                        "date": "2026-08-10 10:00",
                        "status": status,
                        "note": mensagem if mensagem else f"Importado do Google Earth. Situação: {situacao}"
                    }
                ]
            }
            signals.append(signal_obj)

print(f"Extracted {len(signals)} signals!")

with open(r'C:\Users\batis\.gemini\antigravity-ide\scratch\chn4-aton-gis\parsed_signals.json', 'w', encoding='utf-8') as f:
    json.dump(signals, f, ensure_ascii=False, indent=2)
