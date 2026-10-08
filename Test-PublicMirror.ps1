[CmdletBinding()]
param(
    [string]$SiteRoot = (Split-Path -Parent $MyInvocation.MyCommand.Path),
    [string]$BaseUrl,
    [string]$CacheKey
)

$ErrorActionPreference = 'Stop'
$resolvedRoot = (Resolve-Path -LiteralPath $SiteRoot).Path
$manifestPath = Join-Path $resolvedRoot 'mirror-manifest.json'
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    throw "Missing mirror manifest: $manifestPath"
}
$manifest = @(Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json)
if ($manifest.Count -ne 35) {
    throw "Expected 35 public routes; found $($manifest.Count)."
}

$failures = [System.Collections.Generic.List[string]]::new()
foreach ($item in $manifest) {
    $filePath = Join-Path $resolvedRoot $item.Output
    if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
        $failures.Add("Missing output for $($item.Route): $($item.Output)")
        continue
    }

    $html = Get-Content -Raw -LiteralPath $filePath
    if ($html -notmatch '<meta name="robots" content="noindex, nofollow">') {
        $failures.Add("Missing noindex on $($item.Route)")
    }
    if ($html -notmatch 'styles\.css\?v=65') {
        $failures.Add("Missing meeting override stylesheet on $($item.Route)")
    }
    if ($html -notmatch 'script\.js\?v=15') {
        $failures.Add("Missing meeting behavior script on $($item.Route)")
    }

    if ($BaseUrl) {
        $route = if ($item.Route -eq '/') {
            '/'
        }
        elseif ($item.Route.EndsWith('.html')) {
            $item.Route
        }
        else {
            "$($item.Route)/"
        }
        $url = "$($BaseUrl.TrimEnd('/'))$route"
        if ($CacheKey) { $url = "${url}?v=$CacheKey" }
        try {
            $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 30
            if ($response.StatusCode -ne 200) {
                $failures.Add("HTTP $($response.StatusCode) for $url")
            }
        }
        catch {
            $failures.Add("Request failed for ${url}: $($_.Exception.Message)")
        }
    }
}

if ($failures.Count) {
    $failures | ForEach-Object { Write-Error $_ }
    throw "Public mirror validation failed with $($failures.Count) error(s)."
}

[pscustomobject]@{
    Status = 'PASS'
    Routes = $manifest.Count
    Mode = if ($BaseUrl) { 'published' } else { 'local' }
}
