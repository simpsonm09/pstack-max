# GitHub Copilot's Windows PreToolUse entry point. Run the shared POSIX hook
# through Git for Windows so its awk rules stay identical on both platforms.
# Every failure stays silent and exits 0 because Copilot denies non-zero hooks.

function ConvertTo-PosixPath([string] $Path) {
  if ($Path -match '^([A-Za-z]):[\\/](.*)$') {
    return '/' + $Matches[1].ToLowerInvariant() + '/' + $Matches[2].Replace('\', '/')
  }
  return $null
}

function Quote-ProcessArgument([string] $Value) {
  return '"' + $Value + '"'
}

$process = $null
try {
  $git = Get-Command git.exe -ErrorAction SilentlyContinue
  if (-not $git) { $git = Get-Command git -ErrorAction SilentlyContinue }
  $roots = @()
  if ($git) {
    $execPath = (& $git.Source --exec-path 2>$null | Select-Object -First 1)
    if ($LASTEXITCODE -eq 0 -and $execPath) {
      $root = $execPath.Trim()
      1..3 | ForEach-Object { $root = Split-Path -Parent $root }
      $roots += $root
    }
    $root = Split-Path -Parent (Split-Path -Parent $git.Source)
    $roots += $root
  }

  $sh = $null
  $awkDir = $null
  foreach ($root in ($roots | Select-Object -Unique)) {
    foreach ($dir in @((Join-Path $root 'usr\bin'), (Join-Path $root 'bin'))) {
      $candidateSh = Join-Path $dir 'sh.exe'
      $candidateAwk = Join-Path $dir 'awk.exe'
      $candidateGawk = Join-Path $dir 'gawk.exe'
      if ((Test-Path -LiteralPath $candidateSh -PathType Leaf) -and
          ((Test-Path -LiteralPath $candidateAwk -PathType Leaf) -or (Test-Path -LiteralPath $candidateGawk -PathType Leaf))) {
        $sh = $candidateSh
        $awkDir = $dir
        break
      }
    }
    if ($sh) { break }
  }
  if (-not $sh -or -not $env:COPILOT_PLUGIN_ROOT) { exit 0 }

  $pluginRoot = ConvertTo-PosixPath $env:COPILOT_PLUGIN_ROOT
  if (-not $pluginRoot) { exit 0 }
  $home = $env:HOME
  if ($env:COPILOT_HOME) { $home = $env:COPILOT_HOME }
  if ($home) {
    $posixHome = ConvertTo-PosixPath $home
    if (-not $posixHome) { exit 0 }
  }

  $start = New-Object System.Diagnostics.ProcessStartInfo
  $start.FileName = $sh
  $start.Arguments = (Quote-ProcessArgument (Join-Path $env:COPILOT_PLUGIN_ROOT 'hooks\pre-tool-use.sh'))
  $start.WorkingDirectory = $env:COPILOT_PLUGIN_ROOT
  $start.UseShellExecute = $false
  $start.CreateNoWindow = $true
  $start.RedirectStandardInput = $true
  $start.RedirectStandardOutput = $true
  $start.RedirectStandardError = $true
  $start.EnvironmentVariables['PATH'] = $awkDir + ';' + (Split-Path -Parent $sh)
  $start.EnvironmentVariables['COPILOT_PLUGIN_ROOT'] = $pluginRoot
  if ($env:COPILOT_HOME) { $start.EnvironmentVariables['COPILOT_HOME'] = $posixHome }
  if ($env:HOME) { $start.EnvironmentVariables['HOME'] = (ConvertTo-PosixPath $env:HOME) }

  $process = New-Object System.Diagnostics.Process
  $process.StartInfo = $start
  if (-not $process.Start()) { exit 0 }
  $stdout = New-Object System.IO.MemoryStream
  $stderr = New-Object System.IO.MemoryStream
  $outTask = $process.StandardOutput.BaseStream.CopyToAsync($stdout)
  $errTask = $process.StandardError.BaseStream.CopyToAsync($stderr)
  $stdinStream = [Console]::OpenStandardInput()
  $stdinStream.CopyTo($process.StandardInput.BaseStream)
  $process.StandardInput.Close()
  if (-not $process.WaitForExit(8000)) {
    $process.Kill()
    exit 0
  }
  [System.Threading.Tasks.Task]::WaitAll(@($outTask, $errTask), 1000) | Out-Null
  if ($process.ExitCode -eq 0 -and $stderr.Length -eq 0 -and $outTask.IsCompleted -and $errTask.IsCompleted) {
    $stdout.Position = 0
    $stdout.CopyTo([Console]::OpenStandardOutput())
  }
} catch {
  # Permission hooks must fail open and stay silent on all setup and runtime errors.
} finally {
  if ($process -and -not $process.HasExited) {
    try { $process.Kill() } catch { }
  }
}
exit 0
