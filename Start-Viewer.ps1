# Starts the Quick Reading viewer and opens it in your default browser.
# - Rebuilds dist/ whenever the source is newer than the last build (also while the viewer is running).
# - Serves dist/ on http://127.0.0.1:5173 (same address as "npm run dev", so saved sessions and notes carry over).
$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
$Port = 5173
$Url  = "http://127.0.0.1:$Port/"
Set-Location $Root
$Host.UI.RawUI.WindowTitle = 'Quick Reading viewer (close this window to stop)'

function Open-Viewer($u) {
  # Open as a normal tab in the Windows default browser
  Start-Process $u
}
function Fail($msg) { Write-Host "`n$msg" -ForegroundColor Red; Read-Host 'Press Enter to close'; exit 1 }

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Fail 'Node.js is not installed or not on PATH.' }
if (-not (Test-Path (Join-Path $Root 'node_modules'))) { Fail 'node_modules is missing. Run "npm install" in this folder once.' }

# Rebuild when anything that goes into the bundle is newer than dist/index.html
$dist = Join-Path $Root 'dist\index.html'
$inputs = @(Get-ChildItem -Recurse -File (Join-Path $Root 'src'), (Join-Path $Root 'schemas')) +
          @(Get-Item (Join-Path $Root 'index.html'), (Join-Path $Root 'package-lock.json'), (Join-Path $Root 'vite.config.js'), (Join-Path $Root 'security-policy.mjs'))
$newest = ($inputs | Sort-Object LastWriteTime -Descending | Select-Object -First 1).LastWriteTime
if (-not (Test-Path $dist) -or (Get-Item $dist).LastWriteTime -lt $newest) {
  Write-Host 'Building the viewer (first run or source changed)...' -ForegroundColor Cyan
  npm run build
  if ($LASTEXITCODE -ne 0) { Fail 'Build failed - see messages above.' }
}

# Already running (e.g. second double-click)? The fresh build above is served at once
# because the server reads dist/ from disk on every request: just open the page.
try {
  $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 "$($Url)__quick-reading-viewer"
  if ($r.Content -eq 'ok') { Open-Viewer $Url; exit 0 }
} catch { }

# Open the browser window shortly after the server starts
$opener = ${function:Open-Viewer}.ToString()
Start-Job -ScriptBlock {
  param($u, $openerText)
  for ($i = 0; $i -lt 40; $i++) {
    try { if ((Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 "$($u)__quick-reading-viewer").Content -eq 'ok') { break } } catch { Start-Sleep -Milliseconds 250 }
  }
  & ([scriptblock]::Create($openerText)) $u
} -ArgumentList $Url, $opener | Out-Null

node (Join-Path $Root 'scripts\serve-viewer.mjs') --port $Port
if ($LASTEXITCODE -ne 0) { Fail 'The viewer server stopped with an error.' }
