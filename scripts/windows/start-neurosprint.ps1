param(
  [string]$BindHost = "localhost",
  [int]$Port = 5173,
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

function Test-TcpPort {
  param(
    [Parameter(Mandatory = $true)]
    [string]$HostName,
    [Parameter(Mandatory = $true)]
    [int]$PortNumber
  )

  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $async = $client.BeginConnect($HostName, $PortNumber, $null, $null)
    if (-not $async.AsyncWaitHandle.WaitOne(700, $false)) {
      return $false
    }

    $client.EndConnect($async)
    return $true
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

function Get-ListeningProcessInfo {
  param(
    [Parameter(Mandatory = $true)]
    [int]$PortNumber
  )

  $netstatLines = cmd.exe /c "netstat -ano | findstr LISTENING | findstr :$PortNumber"
  foreach ($line in $netstatLines) {
    if ($line -match '^\s*TCP\s+\S+\s+\S+\s+LISTENING\s+(?<pid>\d+)\s*$') {
      $process = Get-Process -Id ([int]$matches.pid) -ErrorAction SilentlyContinue
      if (-not $process) {
        return $null
      }

      return [PSCustomObject]@{
        Id = $process.Id
        Name = $process.ProcessName
      }
    }
  }

  return $null
}

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$packageJson = Join-Path $projectRoot "package.json"
$nodeModules = Join-Path $projectRoot "node_modules"
$serverUrl = "http://${BindHost}:${Port}/"

if (-not (Test-Path -LiteralPath $packageJson)) {
  throw "Ne nayden package.json v papke proekta: $projectRoot"
}

$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npmCommand) {
  throw "Node.js/npm ne naydeny. Ustanovite Node.js LTS, zatem zapustite first-start-setup.bat."
}

if (-not (Test-Path -LiteralPath $nodeModules)) {
  throw "Papka node_modules ne naydena. Snachala zapustite first-start-setup.bat."
}

$listener = Get-ListeningProcessInfo -PortNumber $Port
if ($listener) {
  if ($listener.Name -like "node*") {
    Write-Host "NeuroSprint uzhe zapushchen na $serverUrl"
    if (-not $NoBrowser) {
      Start-Process $serverUrl | Out-Null
    }
    exit 0
  }

  throw "Port $Port uzhe zanyat processom '$($listener.Name)' (PID $($listener.Id)). Osvobodite port ili izmenite ego v skripte."
}

$serverCommand = "title NeuroSprint Dev Server && cd /d `"$projectRoot`" && call npm run dev -- --host $BindHost --port $Port --strictPort"
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $serverCommand -WorkingDirectory $projectRoot | Out-Null

for ($attempt = 0; $attempt -lt 30; $attempt++) {
  Start-Sleep -Seconds 1

  if (Test-TcpPort -HostName $BindHost -PortNumber $Port) {
    Write-Host "NeuroSprint zapushchen: $serverUrl"
    if (-not $NoBrowser) {
      Start-Process $serverUrl | Out-Null
    }
    exit 0
  }
}

Write-Warning "Okno servera otkryto, no $serverUrl ne otvetil v techenie 30 sekund."
Write-Warning "Proverte okno 'NeuroSprint Dev Server': tam budet tekst oshibki, esli server ne startoval."
exit 1
