[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$manifestPath = Join-Path $root 'mirror-manifest.json'
$stylesPath = Join-Path $root 'styles.css'
$scriptPath = Join-Path $root 'script.js'
$failures = [System.Collections.Generic.List[string]]::new()

if (-not (Test-Path -LiteralPath $manifestPath)) { throw 'mirror-manifest.json is missing.' }
if (-not (Test-Path -LiteralPath $stylesPath)) { throw 'styles.css is missing.' }
if (-not (Test-Path -LiteralPath $scriptPath)) { throw 'script.js is missing.' }

$manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
$styles = Get-Content -Raw -LiteralPath $stylesPath
$script = Get-Content -Raw -LiteralPath $scriptPath

if (@($manifest).Count -ne 35) {
    $failures.Add("Expected 35 retained routes; found $(@($manifest).Count).")
}

foreach ($token in @('--alpha-black', '--alpha-gold-material', '--alpha-champagne', '--alpha-ivory', '--alpha-display', '.alpha-after-dark', '@media (max-width: 600px)')) {
    if (-not $styles.Contains($token)) { $failures.Add("Missing visual-system marker: $token") }
}

foreach ($item in $manifest) {
    $path = Join-Path $root $item.Output
    if (-not (Test-Path -LiteralPath $path)) {
        $failures.Add("Missing route file: $($item.Output)")
        continue
    }

    $html = Get-Content -Raw -LiteralPath $path
    if ($html -notmatch '<meta name="robots" content="noindex, nofollow">') {
        $failures.Add("Missing preview robots protection: $($item.Route)")
    }
    if ($html -notmatch '<meta name="viewport" content="width=device-width, initial-scale=1"') {
        $failures.Add("Missing responsive viewport: $($item.Route)")
    }
    if ($html -notmatch 'styles\.css\?v=62') {
        $failures.Add("Missing Alpha After Dark design cache key v62: $($item.Route)")
    }
    if ($html -notmatch 'script\.js\?v=15') {
        $failures.Add("Missing Alpha After Dark behavior cache key v14: $($item.Route)")
    }
    $contactNavPosition = $html.IndexOf('id="menu-item-170"')
    $regulatoryNavPosition = $html.IndexOf('id="menu-item-176"')
    if (($contactNavPosition -lt 0) -xor ($regulatoryNavPosition -lt 0) -or ($contactNavPosition -ge 0 -and $contactNavPosition -gt $regulatoryNavPosition)) {
        $failures.Add("Contact does not precede Regulatory in the shared navigation: $($item.Route)")
    }
    if ($html -match 'PDF Download[^<]*(?:requires|Requires)|Adobe Acrobat Reader|get\.adobe\.com/reader') {
        $failures.Add("Obsolete Adobe Reader requirement remains: $($item.Route)")
    }
}

if ($styles -notmatch '\.alpha-after-dark__eyebrow::before,\s*\.alpha-after-dark__eyebrow::after' -or $styles -notmatch 'flex:\s*0 0 30px') {
    $failures.Add('The homepage hero eyebrow is missing its symmetrical gold dashes.')
}
if ($styles -notmatch 'table\.locations \.phone-link\s*\{\s*border-bottom:\s*0;\s*\}') {
    $failures.Add('The uneven bottom dash remains beneath Company Locations phone links.')
}

$careers = Get-Content -Raw -LiteralPath (Join-Path $root 'careers\index.html')
if ($careers -notmatch 'data-staged-template="lab-tech-careers"') {
    $failures.Add('The retained Laboratory Technician page is missing.')
}
if ($careers -notmatch 'No information is transmitted, stored, or sent') {
    $failures.Add('The Careers form safety notice is missing.')
}

$contact = Get-Content -Raw -LiteralPath (Join-Path $root 'contact-us-alpha-analytical-laboratories-inc\index.html')
if ($contact -notmatch 'TIGERweb 2025 State_County geometry, STATE 06' -or $contact -notmatch 'id="california-boundary"' -or $contact -notmatch 'california-map__shine-sweep') {
    $failures.Add('The official Census-derived California locator or its clipped shimmer is missing.')
}
if ($styles -notmatch '\.california-map\s*\{[\s\S]*?transform:\s*scale\(1\.12\);' -or $styles -notmatch 'transform-origin:\s*center;') {
    $failures.Add('The California locator is missing its approved 12 percent proportional enlargement.')
}
if (@([regex]::Matches($contact, 'data-location-panel="[^"]+"\s+hidden')).Count -ne 6 -or $contact -notmatch 'data-location-placeholder') {
    $failures.Add('The clean six-location dossier switch or its sealed placeholder is incomplete.')
}
if ($contact -match 'uv-reveal-area|uv-ink|location-intelligence__scan|data-uv-mode|data-location-ledger' -or $styles -match 'uv-reveal-area|uv-ink|location-intelligence__scan|alpha-docket-scan' -or $script -match 'updateUvPosition|is-uv-active|--uv-area-x') {
    $failures.Add('The rejected UV spotlight implementation remains in the Alpha Labs contact experience.')
}
if ($script -notmatch 'panel\.hidden = panel\.dataset\.locationPanel !== selectedLocation' -or $script -notmatch 'locationPlaceholder\.hidden = true') {
    $failures.Add('The immediate, fully readable location dossier behavior is missing.')
}

$services = Get-Content -Raw -LiteralPath (Join-Path $root 'services-listing\index.html')
foreach ($serviceMarker in @('Our Testing &amp; Analytical Services', 'Certified environmental testing for Northern California.', 'Drinking &amp; Bottled Water', 'Wastewater, Recycled &amp; Storm Water', 'POTW Pretreatment Programs', 'Soil, Sediment &amp; Hazardous Waste', 'Title 21, Title 22, and Disinfectant By-Product compliance analyses', 'California Toxics Rule (CTR)', 'POTW Discharge Permits', '24-hour auto-sampler installations', 'Full SW846 testing', 'UST compliance', 'trout survival bioassays', 'WaterTrax Partner:')) {
    if (-not $services.Contains($serviceMarker)) { $failures.Add("Missing approved Services Listing copy: $serviceMarker") }
}
foreach ($serviceTarget in @('drinking-bottled-water-program/', 'wastewater-recycled-water-storm-water-ground-water-program-work/', 'potw-pretreatment-program-work/', 'soil-sludge-sediment-haz-waste-characterization/')) {
    if (-not $services.Contains("alpha-labs-preview/$serviceTarget")) { $failures.Add("Missing Services Listing destination: $serviceTarget") }
}
if ($services -notmatch 'mailto:robbie@alpha-labs\.com' -or $services -notmatch 'https://aquaticinformatics\.com/products/wastewater-compliance-software/' -or $services -match 'Read More&#8230;') {
    $failures.Add('The Services Listing actions, official WaterTrax destination, or redundant Read More cleanup are incomplete.')
}

$regulatory = Get-Content -Raw -LiteralPath (Join-Path $root 'regulatory\index.html')
if ($regulatory -notmatch 'data-agency-vault' -or @([regex]::Matches($regulatory, 'data-agency-target=')).Count -ne 6 -or @([regex]::Matches($regulatory, 'data-agency-panel=')).Count -ne 6) {
    $failures.Add('The six-agency regulatory vault interaction is incomplete.')
}
if ($regulatory -notmatch 'agency-vault__masthead' -or $regulatory -notmatch 'agency-vault__poster') {
    $failures.Add('The compact regulatory intelligence masthead or selector poster is missing.')
}
if ($styles -notmatch 'body\.page-id-13 \.entry\s*\{[\s\S]*?border:\s*0\s*!important' -or $styles -notmatch 'agency-vault__masthead::before') {
    $failures.Add('The regulatory outer-frame removal or top-rule masthead treatment is missing.')
}
if ($script -notmatch 'centerDesktopDossier' -or $script -notmatch "behavior:\s*'smooth'") {
    $failures.Add('The regulatory desktop dossier-centering behavior is missing.')
}
if ($styles -notmatch '@media \(min-width: 901px\) and \(max-height: 900px\)' -or $styles -notmatch 'agency-intelligence__panel \{ animation: agency-file-release \.38s ease both; padding: \.5rem 0 \.25rem; \}') {
    $failures.Add('The compact-height regulatory dossier treatment is missing.')
}
foreach ($asset in @('epa.jpg', 'cdph.jpg', 'calrecycle.gif', 'water-board.jpg', 'dtsc.jpg', 'carb.jpg')) {
    if (-not (Test-Path -LiteralPath (Join-Path $root "assets\regulatory\$asset") -PathType Leaf)) {
        $failures.Add("Missing locally preserved agency logo: $asset")
    }
}

$homeMarkup = Get-Content -Raw -LiteralPath (Join-Path $root 'index.html')
if ($homeMarkup -match '<div class="title-area">') {
    $failures.Add('The redundant homepage header logo markup remains.')
}
foreach ($homeMarker in @('California&#8217;s quiet powerhouse for environmental analysis', 'The VIP Treatment&mdash;from Homeowners to the EPA', 'Six premier California locations', 'Over 25,000 square feet of state-of-the-art processing power', 'Fully ELAP-certified across Microbiology, Wet Chemistry, and Organic/Inorganic Chemistry', 'We don&#8217;t just run tests; we craft certainty', 'data-home-business-cta')) {
    if (-not $homeMarkup.Contains($homeMarker)) {
        $failures.Add("The approved homepage story is missing: $homeMarker")
    }
}
if ($homeMarkup -match 'feedback-btn\.png' -or $homeMarkup -match 'is a premier California \(ELAP certifications') {
    $failures.Add('Superseded homepage copy or the obsolete feedback image remains.')
}
$homeHeadingRule = [regex]::Match($styles, 'body\.home \.entry-content > h1,[\s\S]*?body\.home \.entry-content > h2,\s*body\.page-id-49 \.entry-title,\s*body\.page-id-9 \.entry-title\s*\{(?<declarations>[^}]*)\}')
if (-not $homeHeadingRule.Success -or $homeHeadingRule.Groups['declarations'].Value -notmatch 'alpha-contact-link-shimmer' -or $homeHeadingRule.Groups['declarations'].Value -match 'font-size') {
    $failures.Add('Homepage headings must shimmer in metallic gold without changing their established sizes.')
}
if ($styles -notmatch 'body\.home \.entry-content > p,[\s\S]*?body\.home \.entry-content li\s*\{[^}]*color:\s*#fff\s*!important;[^}]*font-size:\s*1\.125rem\s*!important;') {
    $failures.Add('Homepage body copy is missing its larger solid-white reading treatment.')
}
if ($styles -notmatch '\.alpha-action-rail__number,[\s\S]*?\.alpha-action-rail strong\s*\{[^}]*alpha-contact-link-shimmer[^}]*linear-gradient') {
    $failures.Add('Homepage action numbers and prompts are missing their metallic-gold shimmer treatment.')
}
if ($styles -notmatch '\.alpha-action-rail small\s*\{[^}]*color:\s*#fff\s*!important;[^}]*font-size:\s*\.82rem;') {
    $failures.Add('Homepage action supporting lines are missing their larger solid-white treatment.')
}
if (@([regex]::Matches($styles, '\.alpha-action-rail > a:nth-child\([1-4]\) :is\(\.alpha-action-rail__number, strong\) \{ animation-delay:')).Count -ne 4) {
    $failures.Add('Homepage action shimmers are not independently staggered across all four cards.')
}

if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Error $_ }
    exit 1
}

Write-Host "PASS: $(@($manifest).Count) retained routes reference the Alpha After Dark design system."
Write-Host 'PASS: robots, responsive viewport, staged Careers content, and preview-form safety are preserved.'
