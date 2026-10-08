[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$manifest = Get-Content -Raw -LiteralPath (Join-Path $root 'mirror-manifest.json') | ConvertFrom-Json
$failures = [System.Collections.Generic.List[string]]::new()
$siteHtml = ''

foreach ($item in $manifest) {
    $siteHtml += [IO.File]::ReadAllText((Join-Path $root $item.Output))
}

$requiredPhones = @(
    'tel:+17074680401',
    'tel:+19166865190',
    'tel:+19258286226',
    'tel:+17077693128',
    'tel:+14242675032',
    'tel:+17605363352',
    'tel:+19164407259'
)
foreach ($phone in $requiredPhones) {
    if (-not $siteHtml.Contains($phone)) { $failures.Add("Missing tap-to-call link: $phone") }
}

$requiredViewpoints = @(
    'pano=hrSOhWrCACuB3DL7BAOeWw&amp;viewpoint=39.1522388%2C-123.2055537&amp;heading=265.94&amp;pitch=3&amp;fov=75',
    'pano=Kzeu8duDrdPRLF1ls2HtdQ&amp;viewpoint=38.3864331%2C-121.3632251&amp;heading=131.63&amp;pitch=8.23&amp;fov=75',
    'eiwmjrYIy4pXrqJ8vMRZyg',
    '6tT44-bsUzYURf0uz4lkwg',
    'ADsf5U4F_86DB1IFNYfwpA',
    'PBBjY1xAnGrsFhH8jSf_cA'
)
foreach ($viewpoint in $requiredViewpoints) {
    if (-not $siteHtml.Contains($viewpoint)) { $failures.Add("Missing Street View location: $viewpoint") }
}

$streetViewLinks = [regex]::Matches($siteHtml, '<a\b[^>]*class="[^"]*street-view-link[^"]*"[^>]*>')
if ($streetViewLinks.Count -lt 14) {
    $failures.Add("Expected at least 14 Street View link placements after the Company-to-Contact consolidation; found $($streetViewLinks.Count).")
}
foreach ($link in $streetViewLinks) {
    if ($link.Value -notmatch 'target="_blank"' -or $link.Value -notmatch 'rel="noopener noreferrer"') {
        $failures.Add("Unsafe Street View external link: $($link.Value)")
    }
}

if ($siteHtml -match 'class="street-view-link"[^>]*>\s*Street View\s*</a>') {
    $failures.Add('Standalone Street View labels remain; the visible address must be the link.')
}

$addressLinks = [regex]::Matches($siteHtml, '<a\b[^>]*class="[^"]*street-view-link[^"]*"[^>]*>[\s\S]*?</a>')
foreach ($link in $addressLinks) {
    $visibleText = [Net.WebUtility]::HtmlDecode(([regex]::Replace($link.Value, '<[^>]+>', ' ')))
    if ($visibleText -notmatch '\d{2,}\s+[A-Za-z]') {
        $failures.Add("Street View link does not expose a visible street address: $($link.Value)")
    }
}

$aboutHtml = [IO.File]::ReadAllText((Join-Path $root 'about-us\index.html'))
if ($aboutHtml -match 'href="tel:\+15555555555"') {
    $failures.Add('The sample 555 number must not be presented as a working call link.')
}
if ($aboutHtml -match '1234 Block Blvd\.[\s\S]{0,300}street-view-link') {
    $failures.Add('The sample San Francisco address must not be presented as a verified Street View location.')
}

$feedbackHtml = [IO.File]::ReadAllText((Join-Path $root 'feedback\index.html'))
if ($feedbackHtml -notmatch 'type=[''"]tel[''"]') {
    $failures.Add('The feedback form phone field is no longer a telephone input.')
}

if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Error $_ }
    exit 1
}

Write-Host "PASS: $($requiredPhones.Count) unique tap-to-call destinations are present."
Write-Host "PASS: $($requiredViewpoints.Count) verified Alpha Labs locations use their visible addresses as safe Street View links across $($streetViewLinks.Count) placements."
Write-Host 'PASS: sample contact data remains non-actionable and telephone form input is preserved.'
