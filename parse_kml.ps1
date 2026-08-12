[xml]$kml = Get-Content -Path 'C:\Users\batis\.gemini\antigravity-ide\scratch\chn4-aton-gis\google_earth_signals.kml' -Encoding UTF8

$ns = New-Object System.Xml.XmlNamespaceManager($kml.NameTable)
$ns.AddNamespace('kml', 'http://www.opengis.net/kml/2.2')

$placemarks = $kml.SelectNodes('//kml:Placemark', $ns)
$signals = @()
$idx = 1

foreach ($pm in $placemarks) {
    $name = if ($pm.name) { ([string]$pm.name).Trim() } else { "Sinal $idx" }
    $desc = if ($pm.description) { ([string]$pm.description).Trim() } else { "" }
    
    # Image URL
    $imgUrl = $null
    if ($desc -match 'src=["'']([^"'']+)["'']') {
        $imgUrl = $matches[1]
    }
    
    $nrord = $null
    $tipo = "Sinal Nautico"
    $situacao = "OPERACIONAL"
    $mensagem = ""
    
    if ($pm.ExtendedData) {
        foreach ($data in $pm.ExtendedData.Data) {
            $valStr = if ($data.value) { ([string]$data.value).Trim() } else { $null }
            if ($data.name -eq 'NRORD' -and $valStr) { $nrord = $valStr }
            if ($data.name -eq 'TIPO' -and $valStr) { $tipo = $valStr }
            if (($data.name -match 'SITUA' -or $data.name -eq 'SITUACAO') -and $valStr) { $situacao = $valStr }
            if (($data.name -match 'MENSAGEM' -or $data.name -match 'ALTERA') -and $valStr) { $mensagem = $valStr }
            if ($data.name -eq 'gx_media_links' -and $valStr -and -not $imgUrl) { $imgUrl = $valStr }
        }
    }
    
    $coordsNode = $pm.SelectSingleNode('.//kml:Point/kml:coordinates', $ns)
    if ($coordsNode -and $coordsNode.InnerText) {
        $parts = $coordsNode.InnerText.Trim().Split(',')
        if ($parts.Count -ge 2) {
            $lng = [double]::Parse($parts[0], [System.Globalization.CultureInfo]::InvariantCulture)
            $lat = [double]::Parse($parts[1], [System.Globalization.CultureInfo]::InvariantCulture)
            
            $code = if ($nrord) { $nrord } else { "CHN-{0:D3}" -f $idx }
            
            $status = "OPERACIONAL"
            $sitUpper = $situacao.ToUpper()
            if ($sitUpper -like '*DESAPARECIDO*' -or $sitUpper -like '*APAGADO*' -or $sitUpper -like '*FORA*' -or $sitUpper -like '*DERIVA*' -or $sitUpper -like '*AVARIADO*') {
                if ($sitUpper -like '*DERIVA*' -or $sitUpper -like '*DESAPARECIDO*') {
                    $status = "A DERIVA"
                } else {
                    $status = "APAGADO"
                }
            }
            
            $sig = [PSCustomObject]@{
                code = $code
                name = $name
                type = $tipo
                status = $status
                lat = $lat
                lng = $lng
                characteristic = if ($tipo -like '*BZ*') { "Lp. W. 5s 4m 6NM" } else { "Lp. W. 10s 15m 12NM" }
                rangeNM = 10
                altitudeM = 12
                jurisdiction = "CHN-4 / 4DN"
                image = $imgUrl
                photoDate = if ($imgUrl) { "2026-08-01" } else { $null }
                history = @(
                    [PSCustomObject]@{
                        date = "2026-08-10 10:00"
                        status = $status
                        note = if ($mensagem) { $mensagem } else { "Importado do Google Earth. Situacao: $situacao" }
                    }
                )
            }
            $signals += $sig
            $idx++
        }
    }
}

Write-Host "Extracted $($signals.Count) signals!"
$json = $signals | ConvertTo-Json -Depth 5
"const googleEarthSignals = $json;" | Out-File -FilePath "$PSScriptRoot\kml_signals.js" -Encoding UTF8
