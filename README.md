# Hệ Thống Quản Lý Nhà Hàng Maison Xuan

Dự án thực hành môn **Triển khai và Quản trị Hệ thống Phần mềm** (Đề 12).  
Repository GitHub: [https://github.com/nguyenxuanhuong20706-droid/maison-xuan-restaurant-management](https://github.com/nguyenxuanhuong20706-droid/maison-xuan-restaurant-management)

---

## 1. Kiến Trúc Hệ Thống (Giai Đoạn 3 — Prometheus & Grafana Monitoring)

Hệ thống được đóng gói hoàn toàn trong môi trường Docker bằng `Docker Compose`, bao gồm **8 container dịch vụ** hoạt động đồng bộ và bảo mật trên mạng nội bộ `nhahang_net`:

```
+-----------------------------------------------------------------------------------------------------------------------+
|                                                      Host Machine                                                     |
|                                                                                                                       |
|   [Port 8088]   [Port 8443]       [Port 9091]      [Port 3001]        [Port 5050]       [Port 5433]       [Port 5000] |
|     (HTTP)        (HTTPS)         (Prometheus)      (Grafana)          (pgAdmin)         (Postgres)        (Internal) |
|        │             │                 │                │                  │                 │                  │     |
+--------┼─────────────┼─────────────────┼────────────────┼──────────────────┼─────────────────┼──────────────────┼-----+
         │             │                 │                │                  │                 │                  │
         ▼             ▼                 │                │                  │                 │                  │
    +──────────────────────────+         │                │                  │                 │                  │
    |      nhahang_nginx       |         │                │                  │                 │                  │
    |  (Nginx Gateway & SSL)   |         │                │                  │                 │                  │
    +────────────┬─────────────+         │                │                  │                 │                  │
                 │ proxy_pass            │                │                  │                 │                  │
                 ▼                       │                ▼                  │                 │                  │
    +──────────────────────────+         │    +───────────────────────+      │                 │                  │
    |       nhahang_web        |         │    |    nhahang_grafana    |      │                 │                  │
    |    (Node.js Express)     |         │    | (Dashboard Trực quan) |      │                 │                  │
    |  Endpoint: /metrics      |         │    +───────────┬───────────+      │                 │                  │
    +────────────┬─────────────+         │                │ PromQL query     │                 │                  │
                 │                       ▼                ▼                  │                 │                  │
                 │            +──────────────────────────────────────+       │                 │                  │
                 │            |          nhahang_prometheus          |       │                 │                  │
                 │            |   (Thu thập & Lưu trữ Time-Series)   |       │                 │                  │
                 │            +───────┬──────────────┬───────────────+       │                 │                  │
                 │                    │ scrape       │ scrape                │                 │                  │
                 ▼                    ▼              ▼                       ▼                 ▼                  │
    +──────────────────────────+ +──────────────+ +─────────────────────+ +──────────────+ +─────────────────────+    │
    |   nhahang_nginx_exporter | | (nhahang_web)| |  postgres_exporter  | |nhahang_pgadmin| |  nhahang_postgres   |    │
    |    (Cổng 9113 nội bộ)    | | (Cổng 5000)  | | (Cổng 9187 nội bộ)  | |  (pgAdmin 4) | | (PostgreSQL 16 DB)   |<───┘
    +──────────────────────────+ +──────────────+ +──────────┬──────────+ +──────────────+ +─────────────────────+
                                                             │ SQL metrics                         ▲
                                                             └─────────────────────────────────────┘
                                           Mạng nội bộ Docker (nhahang_net)
```

### Bảng Ánh Xạ Cổng & Điểm Truy Cập Toàn Hệ Thống

| Dịch vụ | Container Name | Cổng Container | Cổng Host (Windows) | Điểm truy cập / Mục đích |
|---|---|---|---|---|
| **Nginx HTTP Gateway** | `nhahang_nginx` | `80` | **`8088`** | [http://localhost:8088](http://localhost:8088) — Reverse Proxy chính thức |
| **Nginx HTTPS Gateway** | `nhahang_nginx` | `443` | **`8443`** | [https://localhost:8443](https://localhost:8443) — Kết nối mã hóa SSL tự ký |
| **Grafana Dashboard** | `nhahang_grafana` | `3000` | **`3001`** | [http://localhost:3001](http://localhost:3001) — Trực quan hóa hiệu năng & số liệu nghiệp vụ |
| **Prometheus Server** | `nhahang_prometheus` | `9090` | **`9091`** | [http://localhost:9091](http://localhost:9091) — Quản lý Targets & Tra cứu PromQL |
| **Backend Web App** | `nhahang_web` | `5000` | **`5000`** | [http://localhost:5000](http://localhost:5000) — Node.js Express (Metrics: `/metrics`) |
| **PostgreSQL Database** | `nhahang_postgres` | `5432` | **`5433`** | Host port `5433` (tránh xung đột PostgreSQL Windows cổng 5432) |
| **pgAdmin 4 Quản trị** | `nhahang_pgadmin` | `80` | **`5050`** | [http://localhost:5050](http://localhost:5050) — Quản lý cơ sở dữ liệu qua giao diện |
| **Postgres Exporter** | `nhahang_postgres_exporter`| `9187` | *Nội bộ* | Thu thập metrics kết nối & giao dịch PostgreSQL |
| **Nginx Exporter** | `nhahang_nginx_exporter` | `9113` | *Nội bộ* | Thu thập metrics kết nối & request từ Nginx `stub_status` |

> [!NOTE]
> Cổng **`9091`** và **`3001`** được lựa chọn độc lập để **tuyệt đối không xung đột** với bất kỳ dịch vụ hay bài thực hành cũ nào trên máy (như WordPress port 8080, Grafana port 3000, Loki port 3100).

---

## 2. Các Tính Năng Đã Triển Khai

1. **Quản lý Nghiệp vụ Nhà hàng (Giai đoạn 1)**:
   - Quản lý Thực đơn (CRUD món ăn, tự động khóa món đã từng có trong hóa đơn để toàn vẹn dữ liệu).
   - Quản lý Bàn ăn (thêm bàn, đổi trạng thái: Bàn trống, Có khách, Đặt trước).
   - Quản lý Đơn hàng (tạo đơn, tính tổng tiền tự động, chuyển đổi trạng thái phục vụ và thanh toán).

2. **Nginx Reverse Proxy & SSL (Giai đoạn 2)**:
   - Cổng vào duy nhất tiếp nhận HTTP (8088) và HTTPS (8443).
   - Tích hợp 4 HTTP Security Headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Content-Security-Policy`.
   - Cơ chế SSL tự ký tự động tạo bằng Docker OpenSSL.

3. **Giám Sát Hệ Thống Thời Gian Thực (Giai đoạn 3 — MỚI)**:
   - **Metrics Express (`prom-client`)**: Tự động đo lường:
     - Lưu lượng HTTP (`nhahang_http_requests_total`) theo phương thức, route và status code.
     - Thời gian phản hồi (`nhahang_http_request_duration_seconds`) theo phân bố Histogram (tính P50, P95 Latency).
     - Số lượng request active (`nhahang_http_requests_active`).
     - Số liệu runtime Node.js (CPU, RSS Memory, Used Heap, Event loop lag, GC).
     - Số liệu nghiệp vụ nhà hàng sống từ DB: Tổng món ăn, số bàn theo trạng thái, số đơn theo trạng thái.
   - **Postgres Exporter**: Số kết nối hoạt động (`pg_stat_activity_count`), số commit/rollback giao dịch.
   - **Nginx Exporter**: Kết nối đang hoạt động và tổng request xử lý qua Nginx.
   - **Prometheus Scrape**: Cấu hình 4 targets chu kỳ 5 giây, tất cả 4 targets đều ở trạng thái `UP`.
   - **Grafana Dashboard Tự Động**: Nạp sẵn qua cơ chế Provisioning, giao diện trực quan 3 hàng gồm Tổng quan trạng thái, Hiệu năng Web App và Cơ sở dữ liệu/Nginx.

---

## 3. Hướng Dẫn Khởi Chạy

### Bước 1: Chuẩn bị tệp cấu hình `.env`
```bash
cp .env.example .env
```
*(Nếu đã có tệp `.env`, giữ nguyên các cấu hình hiện tại)*

### Bước 2: Sinh chứng chỉ SSL tự ký (Nếu triển khai trên máy mới)
```powershell
docker run --rm -v "${PWD}/nginx/ssl:/certs" alpine sh -c "apk add --no-cache openssl && openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /certs/selfsigned.key -out /certs/selfsigned.crt -subj '/C=VN/ST=Hanoi/L=Hanoi/O=MaisonXuan/OU=IT/CN=localhost'"
```

### Bước 3: Khởi chạy toàn bộ hệ thống bằng Docker Compose
```bash
docker compose up -d --build
```

### Bước 4: Kiểm tra trạng thái các container
```bash
docker compose ps
```
Cả 8 container phải ở trạng thái `Up` hoặc `healthy`.

---

## 4. Hướng Dẫn Kiểm Thử & Demo

### 1. Kiểm tra Giám sát trên Prometheus
- URL: [http://localhost:9091/targets](http://localhost:9091/targets)
- Xác nhận **4/4 targets** (`nhahang_web`, `nhahang_postgres`, `nhahang_nginx`, `prometheus`) đều hiển thị nhãn xanh **`UP`**.
- Thử tra cứu các câu lệnh PromQL:
  ```promql
  nhahang_dishes_total
  sum(rate(nhahang_http_requests_total[1m])) by (status_code)
  pg_stat_activity_count
  ```

### 2. Kiểm tra Dashboard Trực Quan trên Grafana
- URL: [http://localhost:3001/d/maison-xuan-overview](http://localhost:3001/d/maison-xuan-overview)
- **Tài khoản đăng nhập**:
  - Username: `admin`
  - Mật khẩu: Thông tin trong `.env` (`Admin@NhaHang2026`)
- Dashboard **Maison Xuan — Giám Sát Hiệu Năng & Nghiệp Vụ Toàn Diện** hiển thị đầy đủ các biểu đồ với số liệu sống từ hệ thống.

### 3. Tạo Tải Thực Tế Để Quan Sát Biểu Đồ Nhảy Số
Chạy lệnh curl trong PowerShell để gửi 20 request qua cổng HTTPS của Nginx:
```powershell
1..20 | ForEach-Object { curl.exe -k -s https://localhost:8443/api/dishes > $null }
```
Quan sát trên Grafana Dashboard: Biểu đồ **Lưu Lượng Yêu Cầu HTTP** và **Nginx Requests / Giây** sẽ lập tức nhảy số tăng tương ứng.

### 4. Truy Cập Website Nhà Hàng
- **HTTPS Gateway**: [https://localhost:8443](https://localhost:8443) *(Khuyên dùng)*
- **HTTP Gateway**: [http://localhost:8088](http://localhost:8088)
- **Endpoint Metrics thô**: [http://localhost:5000/metrics](http://localhost:5000/metrics)
- **Health Check API**: [https://localhost:8443/health](https://localhost:8443/health)

---

## 5. Dừng Dịch Vụ Khi Cần
```bash
docker compose down
```
*(Lưu ý: Dữ liệu PostgreSQL, Prometheus TSDB và cấu hình Grafana được bảo toàn trong các Docker Volume named)*
