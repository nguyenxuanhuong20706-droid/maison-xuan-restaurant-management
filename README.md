# Hệ Thống Quản Lý Nhà Hàng Maison Xuan

Dự án thực hành môn **Triển khai và Quản trị Hệ thống Phần mềm** (Đề 12).  
Repository GitHub: [https://github.com/nguyenxuanhuong20706-droid/maison-xuan-restaurant-management](https://github.com/nguyenxuanhuong20706-droid/maison-xuan-restaurant-management)

---

## 1. Kiến Trúc Hệ Thống (Giai Đoạn 5 — Security Hardening & Monitoring)

Hệ thống được đóng gói hoàn toàn trong môi trường Docker bằng `Docker Compose`, bao gồm **10 container dịch vụ** hoạt động đồng bộ và bảo mật cao thông qua **3 mạng Docker phân tầng độc lập**:
- `nhahang_frontend_net`: Tầng tiếp nhận Gateway & Reverse Proxy.
- `nhahang_backend_net`: Tầng ứng dụng & cơ sở dữ liệu cô lập sâu.
- `nhahang_monitoring_net`: Tầng giám sát metrics và thu thập log tập trung.

```
+---------------------------------------------------------------------------------------------------------------------------------+
|                                                           Host Machine                                                          |
|                                                                                                                                 |
|   [Port 8088]   [Port 8443]   [127.0.0.1:9091] [127.0.0.1:3001]   [127.0.0.1:3101]  [127.0.0.1:5050]  [127.0.0.1:5433]  [127.0.0.1:5000]|
|     (HTTP)        (HTTPS)       (Prometheus)      (Grafana)           (Loki)           (pgAdmin)         (Postgres)        (Internal)   |
|        │             │                 │                │                  │                 │                 │                  │       |
+--------┼─────────────┼─────────────────┼────────────────┼──────────────────┼─────────────────┼─────────────────┼──────────────────┼-------+
         │             │                 │                │                  │                 │                 │                  │
         ▼             ▼                 │                │                  │                 │                 │                  │
    +──────────────────────────+         │                │                  │                 │                 │                  │
    |      nhahang_nginx       |         │                │                  │                 │                 │                  │
    |  (Nginx Gateway & SSL)   |         │                │                  │                 │                 │                  │
    +────────────┬─────────────+         │                │                  │                 │                 │                  │
                 │ proxy_pass            │                │                  │                 │                 │                  │
                 ▼                       │                ▼                  │                 │                 │                  │
    +──────────────────────────+         │    +───────────────────────+      │                 │                 │                  │
    |       nhahang_web        |         │    |    nhahang_grafana    |      │                 │                 │                  │
    |    (Node.js Express)     |         │    | (Dashboard & Explore) |      │                 │                 │                  │
    |  UID: 1000 (Non-root)    |         │    +───────┬───────┬───────+      │                 │                 │                  │
    +────────────┬─────────────+         │            │       │              │                 │                 │                  │
                 │                       ▼            │       │ LogQL query  │                 │                 │                  │
                 │            +────────────────────+  │       ▼              │                 │                 │                  │
                 │            | nhahang_prometheus |  │  +───────────────+   │                 │                 │                  │
                 │            | (Metrics TSDB)     |  │  | nhahang_loki  |<──┼──Push logs──┐   │                 │                  │
                 │            +────────────────────+  │  | (Logs TSDB)   |   │             │   │                 │                  │
                 │                      ▲             │  +───────────────+   │             │   │                 │                  │
                 │                      │             └────────┐             │             │   │                 │                  │
                 │                      │ PromQL query         │             │             │   │                 │                  │
                 ▼                      │                      ▼             │             │   ▼                 ▼                  │
    +──────────────────────────+ +──────────────+ +─────────────────────+ +──────────────+ +─────────────────────+    │
    |   nhahang_nginx_exporter | |(nhahang_web) | |  postgres_exporter  | |nhahang_pgadmin| |  nhahang_postgres   |    │
    |    (Cổng 9113 nội bộ)    | | (Cổng 5000)  | | (Cổng 9187 nội bộ)  | |  (pgAdmin 4) | | (PostgreSQL 16 DB)   |<───┘
    +──────────────────────────+ +──────────────+ +─────────────────────+ +──────────────+ +─────────────────────+
                 │                      │                                                          │
                 └──────────────────────┴─────────────────┬────────────────────────────────────────┘
                                                          ▼
                                            +──────────────────────────+
                                            |     nhahang_promtail     |
                                            | (Docker & File Shipper)  |
                                            +──────────────────────────+
                                    Phân vùng 3 mạng Docker độc lập (3-Tier)
```

### Bảng Ánh Xạ Cổng & Điểm Truy Cập Toàn Hệ Thống

| Dịch vụ | Container Name | Cổng Container | Cổng Host (Windows) | Điểm truy cập / Mục đích |
|---|---|---|---|---|
| **Nginx HTTP Gateway** | `nhahang_nginx` | `80` | **`8088`** | [http://localhost:8088](http://localhost:8088) — Reverse Proxy chính thức |
| **Nginx HTTPS Gateway** | `nhahang_nginx` | `443` | **`8443`** | [https://localhost:8443](https://localhost:8443) — Kết nối mã hóa SSL tự ký |
| **Grafana Dashboard** | `nhahang_grafana` | `3000` | **`127.0.0.1:3001`** | [http://localhost:3001](http://localhost:3001) — Trực quan hóa Metrics & Log Explore |
| **Loki Log Server** | `nhahang_loki` | `3100` | **`127.0.0.1:3101`** | [http://localhost:3101](http://localhost:3101) — Lưu trữ và đánh chỉ mục Log tập trung |
| **Prometheus Server** | `nhahang_prometheus` | `9090` | **`127.0.0.1:9091`** | [http://localhost:9091](http://localhost:9091) — Quản lý Metrics & Tra cứu PromQL |
| **Backend Web App** | `nhahang_web` | `5000` | **`127.0.0.1:5000`** | [http://localhost:5000/metrics](http://localhost:5000/metrics) — Node.js Express Server (Non-root `node`) |
| **PostgreSQL Database** | `nhahang_postgres` | `5432` | **`127.0.0.1:5433`** | Host port `127.0.0.1:5433` (khóa localhost an toàn, tránh xung đột PostgreSQL máy host) |
| **pgAdmin 4 Quản trị** | `nhahang_pgadmin` | `80` | **`127.0.0.1:5050`** | [http://localhost:5050](http://localhost:5050) — Quản lý cơ sở dữ liệu qua giao diện |
| **Promtail Log Agent** | `nhahang_promtail` | `9080` | *Nội bộ* | Thu thập log container và Nginx files đẩy về Loki |
| **Postgres Exporter** | `nhahang_postgres_exporter`| `9187` | *Nội bộ* | Thu thập metrics kết nối & giao dịch PostgreSQL |
| **Nginx Exporter** | `nhahang_nginx_exporter` | `9113` | *Nội bộ* | Thu thập metrics kết nối & request từ Nginx `stub_status` |

> [!TIP]
> Tất cả các cổng nội bộ và dịch vụ quản trị nhạy cảm (**`5433`**, **`5050`**, **`9091`**, **`3001`**, **`3101`**, **`5000`**) đều được **bind cố định vào `127.0.0.1`**, ngăn ngừa hoàn toàn nguy cơ quét cổng hoặc tấn công từ mạng ngoài/LAN, nhưng vẫn đảm bảo 100% khả năng truy cập từ trình duyệt máy Windows của bạn.

---

## 2. Các Tính Năng Đã Triển Khai

1. **Quản lý Nghiệp vụ Nhà hàng (Giai đoạn 1)**:
   - Quản lý Thực đơn (CRUD món ăn, tự động khóa món đã phát sinh hóa đơn).
   - Quản lý Bàn ăn (thêm bàn, đổi trạng thái: Bàn trống, Có khách, Đặt trước).
   - Quản lý Đơn hàng (tạo đơn, tính tiền tự động, cập nhật luồng phục vụ và thanh toán).

2. **Nginx Reverse Proxy & SSL (Giai đoạn 2)**:
   - Cổng vào duy nhất tiếp nhận HTTP (8088) và HTTPS (8443).
   - 4 HTTP Security Headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Content-Security-Policy`.
   - Cơ chế SSL tự ký tự động sinh bằng Docker OpenSSL.

3. **Giám Sát Hệ Thống Thời Gian Thực (Giai đoạn 3)**:
   - **Metrics Express (`prom-client`)**: Đo lường lưu lượng HTTP, thời gian phản hồi Histogram (P50, P95), request active, runtime Node.js và số liệu nghiệp vụ DB sống (13 món ăn, trạng thái bàn ăn, đơn hàng).
   - **Postgres Exporter & Nginx Exporter**: Kết nối DB và lưu lượng Nginx stub_status.
   - **Grafana Dashboard Tự Động**: Trực quan hóa toàn diện tại [http://localhost:3001/d/maison-xuan-overview](http://localhost:3001/d/maison-xuan-overview).

4. **Thu Thập Nhật Ký Tập Trung (Giai đoạn 4)**:
   - **Loki Server (`nhahang_loki` - 3101)**: Lưu trữ log tập trung, đánh chỉ mục theo nhãn siêu nhẹ.
   - **Promtail Shipper (`nhahang_promtail`)**: Thu thập log Nginx (từ volume `nhahang_nginx_logs`) và toàn bộ stdout/stderr của các container dự án qua Docker socket.
   - **Request Logger Middleware**: Ghi nhận có cấu trúc mọi HTTP request trong Express (thời gian ISO, level, method, URL, status code, latency).
   - **Grafana Data Source**: Tự động kết nối Loki vào Grafana Explore song song với Prometheus.

5. **Security Hardening & Giám Sát Tài Nguyên Hệ Thống (Giai đoạn 5 — MỚI)**:
   - **Non-root User**: Container `nhahang_web` chạy bằng user `node` (UID=1000, GID=1000), loại bỏ hoàn toàn quyền root.
   - **3-Tier Network Isolation**: Tách 3 mạng Docker (`nhahang_frontend_net`, `nhahang_backend_net`, `nhahang_monitoring_net`). Nginx không thể kết nối trực tiếp vào Database.
   - **Localhost Binding (127.0.0.1)**: Toàn bộ cổng cơ sở dữ liệu và quản trị chỉ mở trên máy cục bộ, bảo vệ an toàn trước mạng ngoài.
   - **Information Disclosure Protection**: Thêm `server_tokens off;`, `proxy_hide_header X-Powered-By;` và `app.disable('x-powered-by');` để ẩn triệt để phiên bản Nginx và Node.js Express.
   - **Privilege Hardening**: Áp dụng `security_opt: [no-new-privileges:true]` chống leo thang đặc quyền.
   - **CPU & RAM Monitoring**: Thêm 2 biểu đồ Timeseries đo tỷ lệ tải CPU (% CPU Usage Rate) và dung lượng RAM thực tế (Memory RSS & Heap) vào Grafana Dashboard.


---

## 3. Hướng Dẫn Khởi Chạy

### Bước 1: Chuẩn bị tệp cấu hình `.env`
```bash
cp .env.example .env
```
*(Nếu đã có tệp `.env`, giữ nguyên cấu hình hiện tại)*

### Bước 2: Sinh chứng chỉ SSL tự ký (Nếu triển khai trên máy mới)
```powershell
docker run --rm -v "${PWD}/nginx/ssl:/certs" alpine sh -c "apk add --no-cache openssl && openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /certs/selfsigned.key -out /certs/selfsigned.crt -subj '/C=VN/ST=Hanoi/L=Hanoi/O=MaisonXuan/OU=IT/CN=localhost'"
```

### Bước 3: Khởi chạy toàn bộ 10 container bằng Docker Compose
```bash
docker compose up -d --build
```

### Bước 4: Kiểm tra trạng thái các container
```bash
docker compose ps
```
Cả 10 container phải ở trạng thái `Up` hoặc `healthy`.

---

## 4. Hướng Dẫn Kiểm Thử & Demo

### 1. Truy Vấn Nhật Ký Bằng LogQL Trên Grafana Explore
- URL: [http://localhost:3001/explore](http://localhost:3001/explore) (Chọn Data Source: **Loki**)
- **Câu 1 — Xem log ứng dụng Express:**
  ```logql
  {service="nhahang_web"}
  ```
- **Câu 2 — Xem log truy cập Nginx Reverse Proxy:**
  ```logql
  {service="nhahang_nginx"}
  ```
- **Câu 3 — Lọc cảnh báo và lỗi HTTP 4xx / 5xx:**
  ```logql
  {service="nhahang_web"} |= "WARN"
  ```
  *(Hoặc lọc trên toàn bộ hệ thống: `{service=~"nhahang_web|nhahang_nginx"} |~ "404|500|WARN|ERROR"`)*

### 2. Tạo Tải & Lỗi Thực Tế Để Thấy Log Xuất Hiện Tức Thì
Mở PowerShell và chạy lệnh gửi một request vào đường dẫn không tồn tại:
```powershell
curl.exe -k -s https://localhost:8443/api/demo-kiem-tra-loi-404
```
Chạy lại câu lệnh LogQL `{service="nhahang_web"} |= "404"` trên Grafana Explore, dòng log ghi nhận đường dẫn `demo-kiem-tra-loi-404` với mã `404` sẽ xuất hiện ngay lập tức.

### 3. Kiểm Tra Giám Sát Hiệu Năng (Prometheus & Grafana)
- **Prometheus Targets:** [http://localhost:9091/targets](http://localhost:9091/targets) (4/4 targets `UP`).
- **Grafana Dashboard:** [http://localhost:3001/d/maison-xuan-overview](http://localhost:3001/d/maison-xuan-overview).

### 4. Truy Cập Website & Quản Trị
- **Website HTTPS**: [https://localhost:8443](https://localhost:8443)
- **Website HTTP**: [http://localhost:8088](http://localhost:8088)
- **Quản trị pgAdmin 4**: [http://localhost:5050](http://localhost:5050)

---

## 5. Dừng Dịch Vụ Khi Cần
```bash
docker compose down
```
*(Lưu ý: Dữ liệu PostgreSQL, Prometheus TSDB, cấu hình Grafana và Loki chunks được lưu an toàn trong các Docker Volume named)*
