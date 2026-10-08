[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$expectedRoot = 'C:\Users\Admin\OneDrive - CWU\Apps\Prospect-Web-Mockups\alpha-labs-preview'
$sourceOrigin = 'https://www.alpha-labs.com'
$previewOrigin = 'https://ukiahcomputerworks.github.io/alpha-labs-preview'
$sitemaps = @(
    "$sourceOrigin/wp-sitemap-posts-page-1.xml",
    "$sourceOrigin/wp-sitemap-posts-post-1.xml"
)

if ((Resolve-Path -LiteralPath $projectRoot).Path -ne $expectedRoot) {
    throw "Unexpected project root: $projectRoot"
}

function Get-OutputPath {
    param([uri]$Uri)

    $path = $Uri.AbsolutePath.TrimStart('/')
    if (-not $path) { return Join-Path $projectRoot 'index.html' }
    if ($path.EndsWith('.html')) { return Join-Path $projectRoot $path }
    return Join-Path $projectRoot (Join-Path $path 'index.html')
}

function Get-PublicContent {
    param(
        [Parameter(Mandatory)] [string]$Uri,
        [int]$TimeoutSec = 45
    )

    $headers = @{ 'User-Agent' = 'Mozilla/5.0 (compatible; CWU-Preview-Mirror/1.0)' }
    for ($attempt = 1; $attempt -le 4; $attempt++) {
        try {
            return (Invoke-WebRequest -Uri $Uri -Headers $headers -UseBasicParsing -TimeoutSec $TimeoutSec).Content
        }
        catch {
            if ($attempt -eq 4) { throw }
            Start-Sleep -Seconds (2 * $attempt)
        }
    }
}

$urls = [System.Collections.Generic.List[string]]::new()
foreach ($sitemap in $sitemaps) {
    [xml]$xml = Get-PublicContent -Uri $sitemap -TimeoutSec 30
    foreach ($node in $xml.SelectNodes("//*[local-name()='loc']")) {
        $urls.Add($node.InnerText.Trim())
    }
}
$urls = @($urls | Sort-Object -Unique)
$knownPaths = @{}
foreach ($url in $urls) {
    $uri = [uri]$url
    $knownPaths[$uri.AbsolutePath.TrimEnd('/')] = $true
}
$knownPaths[''] = $true

foreach ($url in $urls) {
    $uri = [uri]$url
    $outputPath = Get-OutputPath -Uri $uri
    $outputDirectory = Split-Path -Parent $outputPath
    New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

    $html = Get-PublicContent -Uri $url

    if ($html -match '<meta\s+name=["'']robots["''][^>]*>') {
        $html = [regex]::Replace($html, '<meta\s+name=["'']robots["''][^>]*>', '<meta name="robots" content="noindex, nofollow">', 'IgnoreCase')
    }
    else {
        $html = [regex]::Replace($html, '<head([^>]*)>', '<head$1><meta name="robots" content="noindex, nofollow">', 'IgnoreCase')
    }

    $html = [regex]::Replace($html, 'href=(?<quote>["''])(?<value>[^"'']+)\k<quote>', {
        param($match)
        $value = $match.Groups['value'].Value
        $candidate = $null
        if ($value.StartsWith($sourceOrigin, [System.StringComparison]::OrdinalIgnoreCase)) {
            $candidate = ([uri]$value).AbsolutePath.TrimEnd('/')
        }
        elseif ($value.StartsWith('/')) {
            $candidate = ([uri]("$sourceOrigin$value")).AbsolutePath.TrimEnd('/')
        }

        if ($null -ne $candidate -and $knownPaths.ContainsKey($candidate)) {
            $normalized = if (-not $candidate) {
                '/'
            }
            elseif ($candidate.EndsWith('.html')) {
                $candidate
            }
            else {
                "$candidate/"
            }
            $fragment = if ($value.Contains('#')) { "#$($value.Split('#', 2)[1])" } else { '' }
            return "href=$($match.Groups['quote'].Value)$previewOrigin$normalized$fragment$($match.Groups['quote'].Value)"
        }
        return $match.Value
    }, 'IgnoreCase')

    # Keep the public source site's assets, feeds, downloads, and other non-page
    # references working while ensuring the staged page routes remain staged.
    $html = [regex]::Replace($html, '(?<attr>href|src)=(?<quote>["''])(?<value>[^"'']+)\k<quote>', {
        param($match)
        $value = $match.Groups['value'].Value
        if ($value.StartsWith('//')) {
            $value = "https:$value"
        }
        elseif ($value.StartsWith('/')) {
            $value = "$sourceOrigin$value"
        }
        return "$($match.Groups['attr'].Value)=$($match.Groups['quote'].Value)$value$($match.Groups['quote'].Value)"
    }, 'IgnoreCase')

    $depth = if ($uri.AbsolutePath -eq '/' -or $uri.AbsolutePath.EndsWith('.html')) { '' } else { '../' }
    $injection = "<link rel=`"stylesheet`" href=`"${depth}styles.css?v=78`"><script src=`"${depth}script.js?v=20`" defer></script>"
    $html = [regex]::Replace($html, '</head>', "$injection</head>", 'IgnoreCase')
    $html = [regex]::Replace($html, '<form(?<attrs>[^>]*)>', '<form${attrs} data-rescue-mirror="true" onsubmit="return false">', 'IgnoreCase')

    [System.IO.File]::WriteAllText($outputPath, $html, [System.Text.UTF8Encoding]::new($false))
    Start-Sleep -Milliseconds 250
}

$manifest = $urls | ForEach-Object {
    $uri = [uri]$_
    [pscustomobject]@{
        Source = $_
        Route = $uri.AbsolutePath
        Output = (Get-OutputPath -Uri $uri).Substring($projectRoot.Length + 1)
    }
}
$manifest | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath (Join-Path $projectRoot 'mirror-manifest.json') -Encoding utf8

[pscustomobject]@{
    MirroredRoutes = $urls.Count
    Manifest = Join-Path $projectRoot 'mirror-manifest.json'
    Preview = "$previewOrigin/"
}
