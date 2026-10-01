[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$siteRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$stagedPage = Join-Path $siteRoot 'meeting-staged\careers-lab-tech\index.html'
$livePage = Join-Path $siteRoot 'careers\index.html'

if (-not (Test-Path -LiteralPath $stagedPage -PathType Leaf)) {
    throw "Missing staged Careers page: $stagedPage"
}

$stagedHtml = Get-Content -Raw -LiteralPath $stagedPage
if ($stagedHtml -notmatch 'data-staged-template="lab-tech-careers"') {
    throw 'The staged Careers page does not contain the expected Lab Tech marker.'
}
if ($stagedHtml -notmatch 'No information is transmitted, stored, or sent') {
    throw 'The staged Careers page is missing its non-submission disclosure.'
}

$currentHtml = Get-Content -Raw -LiteralPath $livePage
$stylesheetPattern = '(?:https://ukiahcomputerworks\.github\.io/alpha-labs-preview/|\.\./|\.\./\.\./)?styles\.css\?v=\d+'
$currentStylesheet = [regex]::Match($currentHtml, $stylesheetPattern)
if (-not $currentStylesheet.Success) {
    throw 'The active Careers page does not contain the expected versioned stylesheet URL.'
}

$appliedTemplate = [regex]::Replace(
    $stagedHtml,
    $stylesheetPattern,
    $currentStylesheet.Value
)
[IO.File]::WriteAllText($livePage, $appliedTemplate, [Text.UTF8Encoding]::new($false))

$appliedHtml = Get-Content -Raw -LiteralPath $livePage
if ($appliedHtml -notmatch 'data-staged-template="lab-tech-careers"') {
    throw 'The Lab Tech Careers page was not applied.'
}

[pscustomobject]@{
    Status = 'READY_TO_PUBLISH'
    Source = $stagedPage
    Destination = $livePage
}
