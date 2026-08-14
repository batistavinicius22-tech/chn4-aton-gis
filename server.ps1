$port = 3000
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "======================================================="
Write-Host "  Servidor CHN-4 PowerShell rodando em http://localhost:$port"
Write-Host "======================================================="

$dbFile = "c:\Users\batis\.gemini\antigravity-ide\scratch\chn4-aton-gis\signals.json"
$rootDir = "c:\Users\batis\.gemini\antigravity-ide\scratch\chn4-aton-gis"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

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

        if ($path -eq "/api/signals" -and $req.HttpMethod -eq "GET") {
            $json = [System.IO.File]::ReadAllText($dbFile, [System.Text.Encoding]::UTF8)
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $res.ContentType = "application/json; charset=utf-8"
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.Close()
            continue
        }

        if ($path -eq "/api/signals" -and $req.HttpMethod -eq "POST") {
            $reader = New-Object System.IO.StreamReader($req.InputStream, $req.ContentEncoding)
            $body = $reader.ReadToEnd()
            $newSignal = $body | ConvertFrom-Json
            
            $signals = @(([System.IO.File]::ReadAllText($dbFile, [System.Text.Encoding]::UTF8)) | ConvertFrom-Json)
            $signals += $newSignal
            $out = $signals | ConvertTo-Json -Depth 10
            [System.IO.File]::WriteAllText($dbFile, $out, $utf8NoBom)

            $ret = '{"success":true}'
            $b = [System.Text.Encoding]::UTF8.GetBytes($ret)
            $res.StatusCode = 201
            $res.OutputStream.Write($b, 0, $b.Length)
            $res.Close()
            continue
        }

        if ($path.StartsWith("/api/signals/") -and $req.HttpMethod -eq "DELETE") {
            $code = [System.Uri]::UnescapeDataString($path.Substring(13))
            $signals = @(([System.IO.File]::ReadAllText($dbFile, [System.Text.Encoding]::UTF8)) | ConvertFrom-Json)
            $filtered = @($signals | Where-Object { $_.code -ne $code })
            $out = $filtered | ConvertTo-Json -Depth 10
            [System.IO.File]::WriteAllText($dbFile, $out, $utf8NoBom)

            $ret = '{"success":true}'
            $b = [System.Text.Encoding]::UTF8.GetBytes($ret)
            $res.StatusCode = 200
            $res.OutputStream.Write($b, 0, $b.Length)
            $res.Close()
            continue
        }

        # Static file serving
        $filePath = Join-Path $rootDir ($path.TrimStart('/'))
        if ($path -eq "/") { $filePath = Join-Path $rootDir "index.html" }

        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $res.ContentLength64 = $bytes.Length
            if ($filePath.EndsWith(".html")) { $res.ContentType = "text/html; charset=utf-8" }
            elseif ($filePath.EndsWith(".css")) { $res.ContentType = "text/css; charset=utf-8" }
            elseif ($filePath.EndsWith(".js")) { $res.ContentType = "application/javascript; charset=utf-8" }
            elseif ($filePath.EndsWith(".json")) { $res.ContentType = "application/json; charset=utf-8" }
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.Close()
        } else {
            $res.StatusCode = 404
            $res.Close()
        }
    } catch {
        console.warn($_)
    }
}
