# repair_names.ps1 - Repair UTF-8 double-encoding corruption in signals.json, kml_signals.js and re-seed Firestore

$kmlFile = "c:\Users\batis\.gemini\antigravity-ide\scratch\chn4-aton-gis\google_earth_signals.kml"
$jsonFile = "c:\Users\batis\.gemini\antigravity-ide\scratch\chn4-aton-gis\signals.json"
$jsFile = "c:\Users\batis\.gemini\antigravity-ide\scratch\chn4-aton-gis\kml_signals.js"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

# 1. Parse KML for exact clean names
Write-Host "Reading original KML file..."
[xml]$kmlXml = [System.IO.File]::ReadAllText($kmlFile, [System.Text.Encoding]::UTF8)
$kmlMap = @{}

$placemarks = $kmlXml.getElementsByTagName("Placemark")
foreach ($pm in $placemarks) {
    $name = $pm.name
    $code = ""
    $extData = $pm.ExtendedData
    if ($extData) {
        foreach ($d in $extData.Data) {
            if ($d.name -eq "NRORD") {
                $code = $d.value
            }
        }
    }
    if ([string]::IsNullOrWhiteSpace($code)) {
        $desc = $pm.description
        if ($desc -match 'NRORD:\s*([^<]+)') {
            $code = $Matches[1].Trim()
        }
    }
    if ($code -and $name) {
        $kmlMap[$code] = $name.Trim()
    }
}
Write-Host "Found $($kmlMap.Count) clean names in KML."

# 2. Read signals.json and repair corrupted characters
$jsonText = [System.IO.File]::ReadAllText($jsonFile, [System.Text.Encoding]::UTF8)
$signals = $jsonText | ConvertFrom-Json

function Repair-Text ($txt) {
    if ([string]::IsNullOrEmpty($txt)) { return $txt }
    $t = $txt
    # Common double UTF-8 corruption patterns
    $t = $t -replace "ÃƒÂ", "Á"
    $t = $t -replace "ÃƒÃ‚", "Ã"
    $t = $t -replace "ÃƒÂ§", "ç"
    $t = $t -replace "ÃƒÂ£", "ã"
    $t = $t -replace "ÃƒÂ©", "é"
    $t = $t -replace "ÃƒÂ³", "ó"
    $t = $t -replace "ÃƒÂº", "ú"
    $t = $t -replace "ÃƒÂ­", "í"
    $t = $t -replace "Ãƒ", "Ã"
    $t = $t -replace "CÃES", "CÃES" # fix Val-de-Cães
    return $t
}

$repairedCount = 0
foreach ($s in $signals) {
    if ($kmlMap.ContainsKey($s.code)) {
        $s.name = $kmlMap[$s.code]
        $repairedCount++
    } else {
        $s.name = Repair-Text $s.name
    }
    $s.jurisdiction = Repair-Text $s.jurisdiction
    $s.type = Repair-Text $s.type
    $s.characteristic = Repair-Text $s.characteristic
    
    if ($s.history) {
        foreach ($h in $s.history) {
            $h.note = Repair-Text $h.note
        }
    }
}

Write-Host "Repaired names for $repairedCount signals."

# 3. Save repaired signals.json
$cleanJson = $signals | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($jsonFile, $cleanJson, $utf8NoBom)
Write-Host "Saved repaired signals.json."

# 4. Save kml_signals.js
$jsContent = "const googleEarthSignals = " + $cleanJson + ";"
[System.IO.File]::WriteAllText($jsFile, $jsContent, $utf8NoBom)
Write-Host "Saved repaired kml_signals.js."
