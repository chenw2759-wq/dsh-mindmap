# 重启 dsh web（加载 dsh-mindmap 新 bundle 与「思维导图模式」预设）
# 用法：在 PowerShell 中执行  powershell -ExecutionPolicy Bypass -File restart-dsh-web.ps1

# 1. 找到占用 3080 的 dsh web 进程并结束
$conn = Get-NetTCPConnection -LocalPort 3080 -State Listen -ErrorAction SilentlyContinue
if ($conn) {
  $pidToKill = $conn.OwningProcess
  Write-Host "Killing dsh web (PID $pidToKill)…"
  Stop-Process -Id $pidToKill -Force
  Start-Sleep -Seconds 2
} else {
  Write-Host "Port 3080 not in use — nothing to kill."
}

# 2. 用与之前相同的命令重启（后台运行，日志写文件）
$log = "$HOME\.dsh\dsh-web-restart.log"
Write-Host "Starting dsh web… (log: $log)"
$proc = Start-Process -FilePath "D:\environment\node.exe" `
  -ArgumentList "M:\dsh\node_modules\.bin\..\@deepseek-ai\dsh\lib\bin.js","web" `
  -WorkingDirectory "M:\dsh" `
  -RedirectStandardOutput $log -RedirectStandardError "$log.err" `
  -WindowStyle Hidden -PassThru
Write-Host "Started PID $($proc.Id). Wait a few seconds, then refresh http://127.0.0.1:3080"
