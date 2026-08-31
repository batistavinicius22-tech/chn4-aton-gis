$port = 3000
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

$rootDir = $PSScriptRoot
if (-not $rootDir) { $rootDir = (Get-Location).Path }
$dbFile = Join-Path $rootDir "signals.json"
$backupsDir = Join-Path $rootDir "backups"

if (-not (Test-Path $backupsDir)) {
    New-Item -ItemType Directory -Path $backupsDir -Force | Out-Null
}

$utf8NoBom = New-Object System.Text.UTF8Encoding $false

function Create-BackupSnapshot($note, $signalsData) {
    try {
        $now = Get-Date
        $ts = $now.ToString("yyyy-MM-ddTHH-mm-ss-fff")
        $filename = "backup_${ts}.json"
        $filePath = Join-Path $backupsDir $filename
        
        $meta = @{
            filename = $filename
            createdAt = $now.ToString("o")
            formattedDate = $now.ToString("dd/MM/yyyy HH:mm:ss")
            count = $signalsData.Count
            note = $note
            signals = $signalsData
        }
        $json = $meta | ConvertTo-Json -Depth 12
        [System.IO.File]::WriteAllText($filePath, $json, $utf8NoBom)
        return $meta
    } catch {
        Write-Host "Erro ao criar backup:" $_
        return $null
    }
}

function List-Backups() {
    $list = @()
    if (Test-Path $backupsDir) {
        $files = Get-ChildItem -Path $backupsDir -Filter "backup_*.json" | Sort-Object LastWriteTime -Descending
        foreach ($f in $files) {
            try {
                $raw = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
                $content = $raw | ConvertFrom-Json
                $cnt = 0
                if ($content.signals) { $cnt = $content.signals.Count }
                elseif ($content.count) { $cnt = $content.count }
                
                $list += @{
                    filename = $f.Name
                    createdAt = if ($content.createdAt) { $content.createdAt } else { $f.LastWriteTime.ToString("o") }
                    formattedDate = if ($content.formattedDate) { $content.formattedDate } else { $f.LastWriteTime.ToString("dd/MM/yyyy HH:mm:ss") }
                    count = $cnt
                    note = if ($content.note) { $content.note } else { "Arquivo de backup" }
                    sizeBytes = $f.Length
                }
            } catch {
                $list += @{
                    filename = $f.Name
                    createdAt = $f.LastWriteTime.ToString("o")
                    formattedDate = $f.LastWriteTime.ToString("dd/MM/yyyy HH:mm:ss")
                    count = 0
                    note = "Arquivo de backup"
                    sizeBytes = $f.Length
                }
            }
        }
    }
    return $list
}

Write-Host "======================================================="
Write-Host "  Servidor CHN-4 PowerShell rodando em http://localhost:$port"
Write-Host "  Diretório Raiz: $rootDir"
Write-Host "  Banco de Dados: $dbFile"
Write-Host "  Pasta de Backups: $backupsDir"
Write-Host "======================================================="

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $req = $context.Request
        $res = $context.Response

        $res.Headers.Add("Access-Control-Allow-Origin", "*")
        $res.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        $res.Headers.Add("Access-Control-Allow-Headers", "Content-Type")

        if ($req.HttpMethod -eq "OPTIONS") {
            $res.StatusCode = 204
            $res.Close()
            continue
        }

        $path = $req.Url.AbsolutePath

        # GET /api/signals
        if ($path -eq "/api/signals" -and $req.HttpMethod -eq "GET") {
            $json = if (Test-Path $dbFile) { [System.IO.File]::ReadAllText($dbFile, [System.Text.Encoding]::UTF8) } else { "[]" }
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $res.ContentType = "application/json; charset=utf-8"
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.Close()
            continue
        }

        # GET /api/backups
        if ($path -eq "/api/backups" -and $req.HttpMethod -eq "GET") {
            $backups = List-Backups
            $json = $backups | ConvertTo-Json -Depth 5
            if (-not $json) { $json = "[]" }
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $res.ContentType = "application/json; charset=utf-8"
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.Close()
            continue
        }

        # GET /api/backups/download
        if ($path -eq "/api/backups/download" -and $req.HttpMethod -eq "GET") {
            $fileParam = $req.QueryString["file"]
            if ($fileParam) {
                $targetPath = Join-Path $backupsDir ([System.IO.Path]::GetFileName($fileParam))
                if (Test-Path $targetPath) {
                    $bytes = [System.IO.File]::ReadAllBytes($targetPath)
                    $res.ContentType = "application/json; charset=utf-8"
                    $res.AddHeader("Content-Disposition", "attachment; filename=`"$([System.IO.Path]::GetFileName($fileParam))`"")
                    $res.ContentLength64 = $bytes.Length
                    $res.OutputStream.Write($bytes, 0, $bytes.Length)
                    $res.Close()
                    continue
                }
            }
            $res.StatusCode = 404
            $res.Close()
            continue
        }

        # POST /api/backups/create
        if ($path -eq "/api/backups/create" -and $req.HttpMethod -eq "POST") {
            $reader = New-Object System.IO.StreamReader($req.InputStream, [System.Text.Encoding]::UTF8)
            $body = $reader.ReadToEnd()
            $parsed = if ($body) { $body | ConvertFrom-Json } else { @{} }
            $note = if ($parsed.note) { $parsed.note } else { "Ponto de parada manual" }
            
            $signals = if (Test-Path $dbFile) { @(([System.IO.File]::ReadAllText($dbFile, [System.Text.Encoding]::UTF8)) | ConvertFrom-Json) } else { @() }
            $meta = Create-BackupSnapshot $note $signals

            $ret = @{ success = $true; backup = $meta } | ConvertTo-Json -Depth 5
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($ret)
            $res.StatusCode = 201
            $res.ContentType = "application/json; charset=utf-8"
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.Close()
            continue
        }

        # POST /api/backups/restore
        if ($path -eq "/api/backups/restore" -and $req.HttpMethod -eq "POST") {
            $reader = New-Object System.IO.StreamReader($req.InputStream, [System.Text.Encoding]::UTF8)
            $body = $reader.ReadToEnd()
            $parsed = $body | ConvertFrom-Json
            
            $restoredSignals = $null
            $sourceName = "backup"

            if ($parsed.filename) {
                $targetPath = Join-Path $backupsDir ([System.IO.Path]::GetFileName($parsed.filename))
                if (Test-Path $targetPath) {
                    $raw = [System.IO.File]::ReadAllText($targetPath, [System.Text.Encoding]::UTF8)
                    $backupContent = $raw | ConvertFrom-Json
                    if ($backupContent.signals) { $restoredSignals = $backupContent.signals }
                    else { $restoredSignals = $backupContent }
                    $sourceName = $parsed.filename
                }
            } elseif ($parsed.signals) {
                $restoredSignals = $parsed.signals
                $sourceName = if ($parsed.note) { $parsed.note } else { "Ponto de parada" }
            }

            if ($restoredSignals -and $restoredSignals.Count -gt 0) {
                # Pre-backup
                $currSignals = if (Test-Path $dbFile) { @(([System.IO.File]::ReadAllText($dbFile, [System.Text.Encoding]::UTF8)) | ConvertFrom-Json) } else { @() }
                Create-BackupSnapshot "Pré-restauração de $sourceName" $currSignals | Out-Null

                $out = $restoredSignals | ConvertTo-Json -Depth 12
                [System.IO.File]::WriteAllText($dbFile, $out, $utf8NoBom)

                $ret = @{ success = $true; count = $restoredSignals.Count; signals = $restoredSignals } | ConvertTo-Json -Depth 12
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($ret)
                $res.StatusCode = 200
                $res.ContentType = "application/json; charset=utf-8"
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
                $res.Close()
                continue
            } else {
                $ret = '{"error":"Backup não encontrado ou vazio"}'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($ret)
                $res.StatusCode = 400
                $res.ContentType = "application/json; charset=utf-8"
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
                $res.Close()
                continue
            }
        }

        # POST /api/signals/bulk
        if ($path -eq "/api/signals/bulk" -and $req.HttpMethod -eq "POST") {
            $reader = New-Object System.IO.StreamReader($req.InputStream, [System.Text.Encoding]::UTF8)
            $body = $reader.ReadToEnd()
            $parsed = $body | ConvertFrom-Json
            $signalsToSave = if ($parsed.signals) { $parsed.signals } else { $parsed }

            if ($signalsToSave -and $signalsToSave.Count -gt 0) {
                $note = if ($parsed.note) { $parsed.note } else { "Sincronização em massa" }
                Create-BackupSnapshot $note $signalsToSave | Out-Null
                $out = $signalsToSave | ConvertTo-Json -Depth 12
                [System.IO.File]::WriteAllText($dbFile, $out, $utf8NoBom)

                $ret = @{ success = $true; count = $signalsToSave.Count; signals = $signalsToSave } | ConvertTo-Json -Depth 12
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($ret)
                $res.StatusCode = 200
                $res.ContentType = "application/json; charset=utf-8"
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
                $res.Close()
                continue
            }
        }

        # POST /api/signals
        if ($path -eq "/api/signals" -and $req.HttpMethod -eq "POST") {
            $reader = New-Object System.IO.StreamReader($req.InputStream, [System.Text.Encoding]::UTF8)
            $body = $reader.ReadToEnd()
            $newSignal = $body | ConvertFrom-Json
            
            $signals = if (Test-Path $dbFile) { @(([System.IO.File]::ReadAllText($dbFile, [System.Text.Encoding]::UTF8)) | ConvertFrom-Json) } else { @() }
            $existingIndex = -1
            for ($i = 0; $i -lt $signals.Count; $i++) {
                if ($signals[$i].code -eq $newSignal.code) {
                    $existingIndex = $i
                    break
                }
            }
            if ($existingIndex -ge 0) {
                $signals[$existingIndex] = $newSignal
            } else {
                $signals += $newSignal
            }

            Create-BackupSnapshot "Criação/Atualização do sinal $($newSignal.code)" $signals | Out-Null
            $out = $signals | ConvertTo-Json -Depth 12
            [System.IO.File]::WriteAllText($dbFile, $out, $utf8NoBom)

            $ret = @{ success = $true; signal = $newSignal } | ConvertTo-Json -Depth 10
            $b = [System.Text.Encoding]::UTF8.GetBytes($ret)
            $res.StatusCode = 201
            $res.ContentType = "application/json; charset=utf-8"
            $res.OutputStream.Write($b, 0, $b.Length)
            $res.Close()
            continue
        }

        # PUT /api/signals/:code
        if ($path.StartsWith("/api/signals/") -and ($req.HttpMethod -eq "PUT" -or $req.HttpMethod -eq "POST")) {
            $rawCode = $path.Substring(13)
            $code = [System.Uri]::UnescapeDataString($rawCode).Trim()
            $reader = New-Object System.IO.StreamReader($req.InputStream, [System.Text.Encoding]::UTF8)
            $body = $reader.ReadToEnd()
            $updatedSignal = $body | ConvertFrom-Json
            
            $signals = if (Test-Path $dbFile) { @(([System.IO.File]::ReadAllText($dbFile, [System.Text.Encoding]::UTF8)) | ConvertFrom-Json) } else { @() }
            
            $found = $false
            for ($i = 0; $i -lt $signals.Count; $i++) {
                if ($signals[$i].code.ToString().Trim() -eq $code -or ($updatedSignal.code -and $signals[$i].code.ToString().Trim() -eq $updatedSignal.code.ToString().Trim())) {
                    $signals[$i] = $updatedSignal
                    $found = $true
                    break
                }
            }
            if (-not $found) {
                $signals += $updatedSignal
            }

            $out = $signals | ConvertTo-Json -Depth 12
            [System.IO.File]::WriteAllText($dbFile, $out, $utf8NoBom)

            $ret = @{ success = $true; signal = $updatedSignal } | ConvertTo-Json -Depth 10
            $b = [System.Text.Encoding]::UTF8.GetBytes($ret)
            $res.StatusCode = 200
            $res.ContentType = "application/json; charset=utf-8"
            $res.OutputStream.Write($b, 0, $b.Length)
            $res.Close()
            continue
        }

        # DELETE /api/signals/:code
        if ($path.StartsWith("/api/signals/") -and $req.HttpMethod -eq "DELETE") {
            $rawCode = $path.Substring(13)
            $code = [System.Uri]::UnescapeDataString($rawCode).Trim()
            $signals = if (Test-Path $dbFile) { @(([System.IO.File]::ReadAllText($dbFile, [System.Text.Encoding]::UTF8)) | ConvertFrom-Json) } else { @() }
            $filtered = @($signals | Where-Object { $_.code.ToString().Trim() -ne $code })
            
            Create-BackupSnapshot "Exclusão do sinal $code" $filtered | Out-Null
            $out = $filtered | ConvertTo-Json -Depth 12
            [System.IO.File]::WriteAllText($dbFile, $out, $utf8NoBom)

            $ret = @{ success = $true; code = $code } | ConvertTo-Json
            $b = [System.Text.Encoding]::UTF8.GetBytes($ret)
            $res.StatusCode = 200
            $res.ContentType = "application/json; charset=utf-8"
            $res.OutputStream.Write($b, 0, $b.Length)
            $res.Close()
            continue
        }

        # Static file serving
        $cleanPath = $path.TrimStart('/')
        $filePath = Join-Path $rootDir $cleanPath
        if ($path -eq "/" -or [string]::IsNullOrWhiteSpace($cleanPath)) { $filePath = Join-Path $rootDir "index.html" }

        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $res.ContentLength64 = $bytes.Length
            if ($filePath.EndsWith(".html")) { $res.ContentType = "text/html; charset=utf-8" }
            elseif ($filePath.EndsWith(".css")) { $res.ContentType = "text/css; charset=utf-8" }
            elseif ($filePath.EndsWith(".js")) { $res.ContentType = "application/javascript; charset=utf-8" }
            elseif ($filePath.EndsWith(".json")) { $res.ContentType = "application/json; charset=utf-8" }
            elseif ($filePath.EndsWith(".png")) { $res.ContentType = "image/png" }
            elseif ($filePath.EndsWith(".jpg") -or $filePath.EndsWith(".jpeg")) { $res.ContentType = "image/jpeg" }
            elseif ($filePath.EndsWith(".svg")) { $res.ContentType = "image/svg+xml" }
            elseif ($filePath.EndsWith(".kml")) { $res.ContentType = "application/vnd.google-earth.kml+xml" }
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.Close()
        } else {
            $res.StatusCode = 404
            $res.Close()
        }
    } catch {
        Write-Host "Server warning:" $_
    }
}
