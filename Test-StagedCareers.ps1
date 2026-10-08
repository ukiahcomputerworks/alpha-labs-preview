[CmdletBinding()]
param(
    [string]$SiteRoot = (Split-Path -Parent $MyInvocation.MyCommand.Path),
    [string]$BaseUrl
)

$ErrorActionPreference = 'Stop'
$resolvedRoot = (Resolve-Path -LiteralPath $SiteRoot).Path
$activePath = Join-Path $resolvedRoot 'careers\index.html'
$stagedPath = Join-Path $resolvedRoot 'meeting-staged\careers-lab-tech\index.html'
$failures = [System.Collections.Generic.List[string]]::new()

if (-not (Test-Path -LiteralPath $activePath -PathType Leaf)) { $failures.Add('Active Careers page is missing.') }
if (-not (Test-Path -LiteralPath $stagedPath -PathType Leaf)) { $failures.Add('Staged Careers page is missing.') }

if (-not $failures.Count) {
    $activeHtml = Get-Content -Raw -LiteralPath $activePath
    $stagedHtml = Get-Content -Raw -LiteralPath $stagedPath

    if ($activeHtml -notmatch 'data-staged-template="lab-tech-careers"' -or $activeHtml -notmatch 'Laboratory Technician') {
        $failures.Add('Active Careers page is missing the published Laboratory Technician opening.')
    }

    $requiredPatterns = @(
        'data-staged-template="lab-tech-careers"',
        'Laboratory Technician',
        'Monday through Friday, 8:00 a\.m\. to 5:00 p\.m\.',
        'laboratory information management system',
        'id="lab-tech-application"',
        'type="file"',
        'No information is transmitted, stored, or sent',
        'event\.preventDefault\(\)',
        'application-status'
    )
    foreach ($pattern in $requiredPatterns) {
        if ($stagedHtml -notmatch $pattern) { $failures.Add("Staged Careers page is missing required pattern: $pattern") }
    }
    if ($stagedHtml -notmatch '<meta name="robots" content="noindex, nofollow">') { $failures.Add('Staged Careers page is missing noindex.') }
    if ($stagedHtml -match '<form[^>]+action="https?://') { $failures.Add('Staged application form points to an external submission target.') }
}

if ($BaseUrl) {
    $url = "$($BaseUrl.TrimEnd('/'))/meeting-staged/careers-lab-tech/"
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 30
        if ($response.StatusCode -ne 200) { $failures.Add("HTTP $($response.StatusCode) for $url") }
        if ($response.Content -notmatch 'data-staged-template="lab-tech-careers"') { $failures.Add('Published staged page is missing the Lab Tech marker.') }
    }
    catch {
        $failures.Add("Request failed for ${url}: $($_.Exception.Message)")
    }
}

if ($failures.Count) {
    $failures | ForEach-Object { Write-Error $_ }
    throw "Staged Careers validation failed with $($failures.Count) error(s)."
}

[pscustomobject]@{
    Status = 'PASS'
    ActiveCareersPublished = $true
    StagedFormNonSubmitting = $true
    Mode = if ($BaseUrl) { 'published' } else { 'local' }
}
