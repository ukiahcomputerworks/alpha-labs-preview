[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateNotNullOrEmpty()]
    [string]$Message,

    [int]$TimeoutSeconds = 180
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$expectedRoot = 'C:\Users\Admin\OneDrive - CWU\Apps\Prospect-Web-Mockups\alpha-labs-preview'
$liveUrl = 'https://ukiahcomputerworks.github.io/alpha-labs-preview/'
$repository = 'ukiahcomputerworks/alpha-labs-preview'

if ((Resolve-Path -LiteralPath $projectRoot).Path -ne $expectedRoot) {
    throw "Unexpected project root: $projectRoot"
}

Push-Location $projectRoot
try {
    & 'C:\Users\Admin\OneDrive - CWU\AI\Projects\MakeMoney\Test-ProspectPreview.ps1' -SiteRoot $projectRoot
    if (-not $?) { throw 'Local rescue-preview validation failed.' }

    & (Join-Path $projectRoot 'Test-PublicMirror.ps1') -SiteRoot $projectRoot
    if (-not $?) { throw 'Route-for-route mirror validation failed.' }

    git add -A
    $staged = git diff --cached --name-only
    if (-not $staged) { throw 'No meeting changes are staged.' }

    git commit -m $Message
    if ($LASTEXITCODE -ne 0) { throw 'Git commit failed.' }

    $commit = (git rev-parse HEAD).Trim()
    git push origin main
    if ($LASTEXITCODE -ne 0) { throw 'Git push failed.' }

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        $build = gh api "repos/$repository/pages/builds/latest" | ConvertFrom-Json
        if ($build.commit -eq $commit -and $build.status -eq 'built') { break }
        if ($build.commit -eq $commit -and $build.status -eq 'errored') {
            throw "GitHub Pages build failed for $commit."
        }
        Start-Sleep -Seconds 3
    } while ((Get-Date) -lt $deadline)

    if ($build.commit -ne $commit -or $build.status -ne 'built') {
        throw "Timed out waiting for GitHub Pages to publish $commit."
    }

    $cacheBustedUrl = "${liveUrl}?v=$commit"
    $response = Invoke-WebRequest -Uri $cacheBustedUrl -UseBasicParsing -TimeoutSec 30
    if ($response.StatusCode -ne 200) { throw "Live site returned HTTP $($response.StatusCode)." }

    & (Join-Path $projectRoot 'Test-PublicMirror.ps1') -SiteRoot $projectRoot -BaseUrl $liveUrl -CacheKey $commit
    if (-not $?) { throw 'Published route validation failed.' }

    [pscustomobject]@{
        Status = 'PUBLISHED'
        Commit = $commit
        BuildStatus = $build.status
        Url = $cacheBustedUrl
    }
}
finally {
    Pop-Location
}
