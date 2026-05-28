param(
  [string]$Mode = "start"
)

$ErrorActionPreference = "Stop"
$RootDir = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
$RootPath = $RootDir.Path
Set-Location -LiteralPath $RootPath

$env:USERPROFILE = $RootPath
$env:HOME = $RootPath
$env:npm_config_cache = Join-Path $RootPath ".npm-cache"
$env:DOTSLASH_CACHE = Join-Path $RootPath ".dotslash-cache"
New-Item -ItemType Directory -Force -Path $env:npm_config_cache, $env:DOTSLASH_CACHE | Out-Null

function Show-Usage {
  @"
usage: powershell -ExecutionPolicy Bypass -File ./script/build_and_run.ps1 [mode]

Modes:
  start, run        Start the Expo dev server
  ios               Start Expo and open iOS
  android           Start Expo and open Android
  web               Start Expo for web
  dev-client        Start Expo in development-client mode
  tunnel            Start Expo using tunnel transport
  export-web        Export the web build locally
  doctor            Run Expo diagnostics
  help              Show this help
"@
}

function Invoke-Expo {
  param([string[]]$ExpoArgs)

  if (Get-Command npx -ErrorAction SilentlyContinue) {
    & npx expo @ExpoArgs
    return
  }

  throw "npx was not found. Install Node.js and npm first."
}

switch ($Mode) {
  { $_ -in @("start", "run") } { Invoke-Expo @("start"); break }
  { $_ -in @("--ios", "ios") } { Invoke-Expo @("start", "--ios"); break }
  { $_ -in @("--android", "android") } { Invoke-Expo @("start", "--android"); break }
  { $_ -in @("--web", "web") } { Invoke-Expo @("start", "--web"); break }
  { $_ -in @("--dev-client", "dev-client") } { Invoke-Expo @("start", "--dev-client"); break }
  { $_ -in @("--tunnel", "tunnel") } { Invoke-Expo @("start", "--tunnel"); break }
  { $_ -in @("--export-web", "export-web") } { Invoke-Expo @("export", "--platform", "web"); break }
  { $_ -in @("--doctor", "doctor") } { & npx expo-doctor; break }
  { $_ -in @("--help", "help") } { Show-Usage; break }
  default {
    Show-Usage
    exit 2
  }
}
