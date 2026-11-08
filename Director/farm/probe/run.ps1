# Runs the headless probe once with -batchmode (graphics on), then once with -batchmode -nographics, on a throwaway
# project, with a memory guard so J's open editor is never squeezed. Usage: powershell -File run.ps1 [-NoGraphicsToo]
param([switch]$NoGraphicsToo)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$unity = 'C:\Program Files\Unity\Hub\Editor\6000.3.7f1\Editor\Unity.exe'
$os = Get-CimInstance Win32_OperatingSystem
$freeGB = $os.FreePhysicalMemory / 1MB; $headroomGB = $os.FreeVirtualMemory / 1MB
"memory: {0:N1} GB physical free, {1:N1} GB commit headroom" -f $freeGB, $headroomGB
if ($headroomGB -lt 8) { Write-Error "commit headroom under 8 GB: not starting a second Unity (J's editor comes first)"; exit 9 }

function Probe($label, $extra) {
  $out = Join-Path $root "out-$label"; if (Test-Path $out) { Remove-Item -Recurse -Force $out }
  New-Item -ItemType Directory -Force $out | Out-Null
  $env:PROBE_OUT = $out
  $log = Join-Path $out 'unity.log'
  $args = @('-batchmode') + $extra + @('-projectPath', $root, '-executeMethod', 'HeadlessProbe.Run', '-quit', '-logFile', $log, '-noUpm')
  "--- $label : Unity $($args -join ' ')"
  $sw = [Diagnostics.Stopwatch]::StartNew()
  $p = Start-Process -FilePath $unity -ArgumentList $args -PassThru -WindowStyle Hidden
  while (-not $p.HasExited) {
    Start-Sleep -Seconds 5
    $o = Get-CimInstance Win32_OperatingSystem
    if ($sw.Elapsed.TotalMinutes -gt 12) { "timeout: killing the probe"; Stop-Process -Id $p.Id -Force; break }
    if (($o.FreeVirtualMemory / 1MB) -lt 3) { "commit headroom under 3 GB: killing the probe"; Stop-Process -Id $p.Id -Force; break }
  }
  "exit {0} after {1:N0} s" -f $p.ExitCode, $sw.Elapsed.TotalSeconds
  if (Test-Path (Join-Path $out 'result.json')) { Get-Content (Join-Path $out 'result.json') } else { "no result.json; last log lines:"; Get-Content $log -Tail 25 }
}
Probe 'graphics' @()
if ($NoGraphicsToo) { Probe 'nographics' @('-nographics') }
