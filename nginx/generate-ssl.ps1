# Script PowerShell sinh chứng chỉ SSL tự ký thông qua Docker container
# Không yêu cầu cài đặt OpenSSL trên máy host Windows

$sslDir = "$PSScriptRoot\ssl"
if (!(Test-Path $sslDir)) {
    New-Item -ItemType Directory -Path $sslDir -Force | Out-Null
}

Write-Host "🔐 Đang sinh chứng chỉ SSL tự ký cho Maison Xuan thông qua Docker..." -ForegroundColor Cyan

$cmd = "apk add --no-cache openssl > /dev/null 2>&1; openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /certs/selfsigned.key -out /certs/selfsigned.crt -subj '/C=VN/ST=Hanoi/L=Hanoi/O=Maison Xuan Restaurant/OU=IT/CN=localhost'"

docker run --rm -v "${sslDir}:/certs" alpine sh -c $cmd

if (Test-Path "$sslDir\selfsigned.crt") {
    Write-Host "✅ Tạo chứng chỉ SSL thành công tại: $sslDir" -ForegroundColor Green
} else {
    Write-Host "❌ Tạo chứng chỉ SSL thất bại!" -ForegroundColor Red
}
