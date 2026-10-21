#!/bin/sh
# Script sinh chứng chỉ SSL tự ký cho Nhà Hàng Maison Xuan (dành cho Linux / Git Bash / Docker)
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/selfsigned.key \
  -out nginx/ssl/selfsigned.crt \
  -subj "/C=VN/ST=Hanoi/L=Hanoi/O=Maison Xuan Restaurant/OU=IT/CN=localhost"
echo "✅ Đã tạo chứng chỉ SSL tự ký thành công tại nginx/ssl/"
