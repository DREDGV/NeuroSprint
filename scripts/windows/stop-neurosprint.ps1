param(
  [int]$Port = 5173
)

$ErrorActionPreference = "Stop"

$listenerPids = @()
$netstatLines = cmd.exe /c "netstat -ano | findstr LISTENING | findstr :$Port"
foreach ($line in $netstatLines) {
  if ($line -match '^\s*TCP\s+\S+\s+\S+\s+LISTENING\s+(?<pid>\d+)\s*$') {
    $listenerPids += [int]$matches.pid
  }
}

$listenerPids = $listenerPids | Select-Object -Unique
if (-not $listenerPids) {
  Write-Host "Na porte $Port nichego ne slushaet. Ostanavlivat nechego."
  exit 0
}

$stoppedAny = $false

foreach ($processId in $listenerPids) {
  $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
  if (-not $process) {
    continue
  }

  if ($process.ProcessName -notlike "node*") {
    Write-Warning "Port $Port ispolzuet ne-node process '$($process.ProcessName)' (PID $processId). Ostanovka propushchena radi bezopasnosti."
    continue
  }

  Stop-Process -Id $processId -Force
  Write-Host "Ostanovlen process '$($process.ProcessName)' (PID $processId) na porte $Port."
  $stoppedAny = $true
}

if (-not $stoppedAny) {
  Write-Warning "Node-process na porte $Port ne nayden. Esli port izmenilsya, otredaktiruyte skript ostanovki."
}

exit 0
