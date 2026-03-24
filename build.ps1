# Build Tool - Gop tat ca CSS/JS vao 1 file HTML
# Usage: powershell -File build.ps1

$SrcDir = Join-Path $PSScriptRoot "src"
$DistDir = Join-Path $PSScriptRoot "dist"
$OutputFile = Join-Path $DistDir "XuatNhapHang.html"

$CssFiles = @(
    "css/variables.css",
    "css/base.css",
    "css/components.css",
    "css/layout.css"
)

$JsFiles = @(
    "js/config.js",
    "js/state.js",
    "js/utils.js",
    "js/telegram.js",
    "js/ui.js",
    "js/api.js",
    "js/auth.js",
    "js/router.js",
    "js/app.js"
)

Write-Host "`nBuilding..." -ForegroundColor Cyan

# Ensure dist
if (-not (Test-Path $DistDir)) {
    New-Item -ItemType Directory -Path $DistDir | Out-Null
}

# Read HTML template
$html = Get-Content (Join-Path $SrcDir "index.html") -Raw -Encoding UTF8

# Inline CSS
$allCss = ""
foreach ($f in $CssFiles) {
    $path = Join-Path $SrcDir $f
    Write-Host "  CSS: $f"
    $allCss += (Get-Content $path -Raw -Encoding UTF8) + "`n`n"
}

# Inline JS
$allJs = ""
foreach ($f in $JsFiles) {
    $path = Join-Path $SrcDir $f
    Write-Host "  JS:  $f"
    $allJs += (Get-Content $path -Raw -Encoding UTF8) + "`n`n"
}

# Replace placeholders
$html = $html.Replace("    <!-- CSS -->", $allCss)
$html = $html.Replace("    <!-- JS -->", $allJs)

# Write output
[System.IO.File]::WriteAllText($OutputFile, $html, [System.Text.Encoding]::UTF8)

$size = [math]::Round((Get-Item $OutputFile).Length / 1024, 1)
Write-Host "`nBuilt: dist/XuatNhapHang.html ($size KB)" -ForegroundColor Green
