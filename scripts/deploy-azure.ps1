# Builds Gyaan Setu and publishes it to an Azure Storage static website.
#
# Usage (from the project folder, after `az login`):
#   powershell -ExecutionPolicy Bypass -File scripts/deploy-azure.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/deploy-azure.ps1 -SkipBuild
#
# The storage account must already have static website hosting turned on
# (see docs/DEPLOYMENT.md, "Azure").

param(
  [string]$StorageAccount = "gyaansetu27772",
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$az = (Get-Command az -ErrorAction SilentlyContinue).Source
if (-not $az) { $az = "C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd" }
if (-not (Test-Path $az)) { throw "Azure CLI not found. Install it, then run az login." }

if (-not $SkipBuild) {
  Write-Host "Building..."
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "Build failed." }
}

# The CLI looks up the account key itself; this keeps its warning quiet.
$key = & $az storage account keys list --account-name $StorageAccount --query "[0].value" --output tsv
if ($LASTEXITCODE -ne 0 -or -not $key) { throw "Cannot read the storage account key. Are you signed in (az login)?" }
$auth = @("--account-name", $StorageAccount, "--account-key", $key)

Write-Host "Uploading dist/ ..."
& $az storage blob upload-batch @auth --destination '$web' --source dist --overwrite true `
  --content-cache-control "public, max-age=86400" --max-connections 8 --output none
if ($LASTEXITCODE -ne 0) { throw "Upload failed." }

# Files that must be checked on every visit, or learners keep an old version.
$fresh = @("index.html", "service-worker.js", "manifest.webmanifest", "images/lessons/image-manifest.json")
foreach ($file in $fresh) {
  & $az storage blob update @auth --container-name '$web' --name $file --content-cache-control "no-cache" --output none
}

# Types the CLI may guess wrongly. The browser compiles WebAssembly faster
# when it is served as application/wasm.
$types = @{
  ".wasm" = "application/wasm"
  ".mjs" = "text/javascript"
  ".webmanifest" = "application/manifest+json"
  ".woff2" = "font/woff2"
}
Get-ChildItem dist -Recurse -File | Where-Object { $types.ContainsKey($_.Extension) } | ForEach-Object {
  $name = $_.FullName.Substring((Resolve-Path dist).Path.Length + 1).Replace("\", "/")
  & $az storage blob update @auth --container-name '$web' --name $name --content-type $types[$_.Extension] --output none
}

$url = & $az storage account show --name $StorageAccount --query "primaryEndpoints.web" --output tsv
Write-Host ""
Write-Host "Published: $url"
