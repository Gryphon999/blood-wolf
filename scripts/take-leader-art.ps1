# Moves the newest Bing Image Creator download into assets-src/leaders/<id>.jpg
# Usage: .\scripts\take-leader-art.ps1 queen_elina
param([Parameter(Mandatory = $true)][string]$Id)

$dest = Join-Path $PSScriptRoot '..\assets-src\leaders'
New-Item -ItemType Directory -Force $dest | Out-Null
$newest = Get-ChildItem "$env:USERPROFILE\Downloads" -File -Filter 'AAA_game_c*.jpg' |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $newest) { throw 'No downloaded figure found' }
if (((Get-Date) - $newest.LastWriteTime).TotalMinutes -gt 10) { throw "Newest download is stale: $($newest.Name)" }
Move-Item $newest.FullName (Join-Path $dest "$Id.jpg") -Force
"$Id <- $($newest.Name) ($([int]($newest.Length / 1KB)) KB)"
