$processes = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
foreach ($pid in $processes) {
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 2
