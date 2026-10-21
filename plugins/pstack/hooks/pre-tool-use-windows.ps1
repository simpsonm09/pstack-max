# GitHub Copilot's Windows PreToolUse entry point. Run the shared POSIX hook
# through Git for Windows so its awk rules stay identical on both platforms.
# Every failure stays silent and exits 0 because Copilot denies non-zero hooks.

# C:\x becomes C:/x: Git for Windows' sh and awk open that form, and it is the form the
# POSIX hook itself receives, so both sides quote the same paths in their messages.
# TEMPORARY CI DIAGNOSTICS: removed before merge.
function Write-HookDebug([string] $Text) { if ($env:PSTACK_HOOK_DEBUG) { [Console]::Error.WriteLine("pstack-hook-debug: $Text") } }

function ConvertTo-PosixPath([string] $Path) {
  if ($Path -match '^([A-Za-z]):[\\/](.*)$') {
    return $Matches[1] + ':/' + $Matches[2].Replace('\', '/')
  }
  return $null
}

# The POSIX rules compare forward-slash paths and reject a backslash, so the Windows
# paths Copilot sends in cwd and the view path are rewritten to the C:/x form the
# plugin root uses. Anything that is not JSON passes through for the hook to reject.
function Convert-PayloadPaths([string] $Text) {
  try { $data = $Text | ConvertFrom-Json } catch { return $Text }
  if ($null -eq $data) { return $Text }
  if ($data.cwd -is [string] -and (ConvertTo-PosixPath $data.cwd)) { $data.cwd = ConvertTo-PosixPath $data.cwd }
  foreach ($name in @("toolArgs", "tool_input")) {
    $toolArgs = $data.$name
    if ($toolArgs -and $toolArgs.path -is [string] -and (ConvertTo-PosixPath $toolArgs.path)) {
      $toolArgs.path = ConvertTo-PosixPath $toolArgs.path
    }
  }
  return ($data | ConvertTo-Json -Compress -Depth 32)
}

function Quote-ProcessArgument([string] $Value) {
  return '"' + $Value.Replace('"', '\"') + '"'
}

$process = $null
$payloadFile = $null
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
  Write-HookDebug "roots=$($roots -join '|') sh=$sh awkDir=$awkDir root=$env:COPILOT_PLUGIN_ROOT"
  if (-not $sh -or -not $env:COPILOT_PLUGIN_ROOT) { exit 0 }

  $pluginRoot = ConvertTo-PosixPath $env:COPILOT_PLUGIN_ROOT
  if (-not $pluginRoot) { exit 0 }
  # $HOME is a read-only automatic variable, so the Copilot home gets its own name.
  $copilotHome = $env:HOME
  if ($env:COPILOT_HOME) { $copilotHome = $env:COPILOT_HOME }
  if ($copilotHome) {
    $posixHome = ConvertTo-PosixPath $copilotHome
    if (-not $posixHome) { exit 0 }
  }

  # The payload goes to the POSIX hook through a file rather than a pipe: sh reads it with a
  # redirect, so no pipe handle has to survive the hand-off from PowerShell to MSYS.
  $payload = Convert-PayloadPaths ((New-Object System.IO.StreamReader([Console]::OpenStandardInput(), (New-Object System.Text.UTF8Encoding($false)))).ReadToEnd())
  $payloadFile = [IO.Path]::GetTempFileName()
  [IO.File]::WriteAllText($payloadFile, $payload, (New-Object System.Text.UTF8Encoding($false)))
  $hookPath = ConvertTo-PosixPath (Join-Path $env:COPILOT_PLUGIN_ROOT 'hooks\pre-tool-use.sh')
  $start = New-Object System.Diagnostics.ProcessStartInfo
  $start.FileName = $sh
  $trace = if ($env:PSTACK_HOOK_DEBUG) { '-x ' } else { '' }
  $start.Arguments = $trace + '-c ' + (Quote-ProcessArgument 'exec "$0" < "$1"') + ' ' + (Quote-ProcessArgument $hookPath) + ' ' + (Quote-ProcessArgument (ConvertTo-PosixPath $payloadFile))
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
  $process.StandardInput.Close()
  if (-not $process.WaitForExit(8000)) {
    $process.Kill()
    exit 0
  }
  [System.Threading.Tasks.Task]::WaitAll(@($outTask, $errTask), 1000) | Out-Null
  Write-HookDebug "payload=$payload exit=$($process.ExitCode) out=$($stdout.Length) err=$([Text.Encoding]::UTF8.GetString($stderr.ToArray()))"
  if ($process.ExitCode -eq 0 -and $outTask.IsCompleted -and $errTask.IsCompleted) {
    $stdout.Position = 0
    $stdout.CopyTo([Console]::OpenStandardOutput())
  }
} catch {
  Write-HookDebug "error=$_"
  # Permission hooks must fail open and stay silent on all setup and runtime errors.
} finally {
  if ($process -and -not $process.HasExited) {
    try { $process.Kill() } catch { }
  }
  if ($payloadFile) { Remove-Item -LiteralPath $payloadFile -Force -ErrorAction SilentlyContinue }
}
exit 0
