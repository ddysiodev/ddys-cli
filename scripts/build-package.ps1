param(
  [string]$Version = "",
  [string]$OutputDir = "..\..\releases"
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$PackageJson = Get-Content -LiteralPath (Join-Path $Root "package.json") -Raw -Encoding UTF8 | ConvertFrom-Json
if ([string]::IsNullOrWhiteSpace($Version)) {
  $Version = $PackageJson.version
}
if ([string]::IsNullOrWhiteSpace($Version)) {
  throw "Package version is required."
}

$OutputPath = $OutputDir
if (-not [System.IO.Path]::IsPathRooted($OutputPath)) {
  $OutputPath = Join-Path $Root $OutputPath
}

$ResolvedOutput = Resolve-Path $OutputPath -ErrorAction SilentlyContinue
if (-not $ResolvedOutput) {
  New-Item -ItemType Directory -Path $OutputPath | Out-Null
  $ResolvedOutput = Resolve-Path $OutputPath
}

$PackageDir = Join-Path $Root "package"
$ZipName = "ddys-cli-v{0}.zip" -f $Version
$ZipPath = Join-Path $ResolvedOutput $ZipName

$RootPath = [System.IO.Path]::GetFullPath($Root).TrimEnd("\") + "\"
$PackagePath = [System.IO.Path]::GetFullPath($PackageDir)
if (-not $PackagePath.StartsWith($RootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to create a package outside the CLI root."
}

if (Test-Path $PackageDir) {
  Remove-Item -LiteralPath $PackageDir -Recurse -Force
}
if (Test-Path $ZipPath) {
  Remove-Item -LiteralPath $ZipPath -Force
}

$Include = @(
  "bin",
  "dist",
  "examples",
  "README.md",
  "README.zh-CN.md",
  "LICENSE",
  "package.json"
)

New-Item -ItemType Directory -Path $PackageDir | Out-Null
foreach ($Item in $Include) {
  $Source = Join-Path $Root $Item
  $Target = Join-Path $PackageDir $Item
  if ((Get-Item -LiteralPath $Source).PSIsContainer) {
    Copy-Item -LiteralPath $Source -Destination $Target -Recurse
  } else {
    New-Item -ItemType Directory -Path (Split-Path $Target -Parent) -Force | Out-Null
    Copy-Item -LiteralPath $Source -Destination $Target
  }
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::Open($ZipPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  $ResolvedPackage = [System.IO.Path]::GetFullPath($PackageDir).TrimEnd("\") + "\"
  $Files = Get-ChildItem -LiteralPath $PackageDir -Recurse -File
  foreach ($File in $Files) {
    $Full = [System.IO.Path]::GetFullPath($File.FullName)
    if (-not $Full.StartsWith($ResolvedPackage, [System.StringComparison]::OrdinalIgnoreCase)) {
      throw "Refusing to package a file outside the staging directory: $Full"
    }
    $Relative = $Full.Substring($ResolvedPackage.Length).Replace("\", "/")
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $Full, $Relative, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
} finally {
  $archive.Dispose()
}

Remove-Item -LiteralPath $PackageDir -Recurse -Force
Write-Host $ZipPath
