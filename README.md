# Hệ Thống Quản Lý Nhà Hàng Maison Xuan

Dự án thực hành môn **Triển khai và Quản trị Hệ thống Phần mềm** (Đề 12).  
Repository GitHub: [https://github.com/nguyenxuanhuong20706-droid/maison-xuan-restaurant-management](https://github.com/nguyenxuanhuong20706-droid/maison-xuan-restaurant-management)

---

## 1. Kiến Trúc Hệ Thống (Giai Đoạn 2 — Nginx Reverse Proxy & SSL)

Hệ thống được đóng gói hoàn toàn trong môi trường Docker bằng `Docker Compose`, bao gồm 4 dịch vụ hoạt động độc lập trên mạng nội bộ `nhahang_net`:

```
+-----------------------------------------------------------------------------------------+
|                                      Host Machine                                       |
|                                                                                         |
|   [Port 8088 (HTTP)]     [Port 8443 (HTTPS)]            [Port 5433]       [Port 5050]   |
|           │                      │                           │                 │        |
+-----------┼──────────────────────┼───────────────────────────┼─────────────────┼--------+
            │                      │                           │                 │
            ▼                      ▼                           │                 │
    +──────────────────────────────────────+                   │                 │
    |            nhahang_nginx             |                   │                 │
    |    (Nginx Reverse Proxy & SSL)       |                   │                 │
    |       Ports: 80 (HTTP), 443 (HTTPS)  |                   │                 │
    +──────────────────┬───────────────────+                   │                 │
                       │ proxy_pass                            │                 │
                       ▼                                       ▼                 ▼
            +────────────────────+                   +─────────────────+  +──────────────+
            |    nhahang_web     | ───────SQL───────>| nhahang_postgres|  |nhahang_pgadmin|
            |  (Node.js Express) |                   | (PostgreSQL 16) |<─| (pgAdmin 4)  |
            |    Port: 5000      |                   |   Port: 5432    |  |  Port: 80    |
            +────────────────────+                   +─────────────────+  +──────────────+
                       │                                       │                 │
                       +───────────────────────────────────────┴─────────────────+
                                    Mạng nội bộ Docker (nhahang_net)
```

### Bảng Ánh Xạ Cổng & Điểm Truy Cập
| Dịch vụ | Container Name | Cổng Container | Cổng Host (Windows) | Điểm truy cập / Mục đích |
|---|---|---|---|---|
| **Nginx HTTP Gateway** | `nhahang_nginx` | `80` | **`8088`** | [http://localhost:8088](http://localhost:8088) — Reverse Proxy chính thức |
| **Nginx HTTPS Gateway** | `nhahang_nginx` | `443` | **`8443`** | [https://localhost:8443](https://localhost:8443) — Kết nối mã hóa SSL tự ký |
| **Backend Web App** | `nhahang_web` | `5000` | **`5000`** | [http://localhost:5000](http://localhost:5000) — Node.js trực tiếp (Internal) |
| **PostgreSQL Database** | `nhahang_postgres` | `5432` | **`5433`** | Host port `5433` (tránh xung đột PostgreSQL Windows cổng 5432) |
| **pgAdmin 4 Quản trị** | `nhahang_pgadmin` | `80` | **`5050`** | [http://localhost:5050](http://localhost:5050) — Quản lý cơ sở dữ liệu qua giao diện |

> [!NOTE]
> Tất cả các cổng host được lựa chọn cẩn thận để **tuyệt đối không xung đột** với các container thực hành cũ đang chạy trên máy (`mysql`, `wordpress` - port 8080, `grafana` - port 3000, `loki` - port 3100).

---

## 2. Các Tính Năng Đã Triển Khai

1. **Quản lý Món ăn (Thực đơn)**:
   - Thêm món mới (Tên, danh mục, đơn giá VNĐ, trạng thái).
   - Xem danh sách món ăn, tìm kiếm theo tên và lọc theo danh mục.
   - Sửa thông tin món ăn, cập nhật trạng thái phục vụ.
   - Xóa món ăn (nếu món đã từng phát sinh đơn hàng, hệ thống tự động chuyển trạng thái sang "Tạm hết món" để bảo toàn lịch sử dữ liệu).

2. **Quản lý Bàn ăn**:
   - Thêm bàn mới (Số/tên bàn, sức chứa khách, trạng thái khởi tạo).
   - Xem danh sách và thẻ trạng thái trực quan: Bàn trống, Có khách, Đã đặt.
   - Cập nhật trạng thái bàn ăn tức thì.

3. **Quản lý Đơn hàng (Gọi món & Thanh toán)**:
   - Tạo đơn hàng mới: Chọn bàn ăn, chọn một hoặc nhiều món cùng số lượng.
   - Tự động tính tổng tiền từ dữ liệu thực tế trong PostgreSQL.
   - Tự động cập nhật bàn sang trạng thái "Đang có khách" (`occupied`).
   - Cập nhật quy trình phục vụ: `Chờ xử lý` -> `Đang phục vụ` -> `Thanh toán/Hoàn thành` -> `Hủy đơn`.
   - Khi thanh toán hoặc hủy đơn, bàn tự động được trả về trạng thái `Bàn trống` (`available`).

4. **Nginx Reverse Proxy & Bảo Mật (Giai Đoạn 2)**:
   - **Reverse Proxy**: Làm cổng vào duy nhất, chuyển tiếp request từ client vào `nhahang_web` thông qua mạng nội bộ Docker.
   - **SSL/TLS Termination**: Hỗ trợ kết nối bảo mật HTTPS tại cổng `8443` với chứng chỉ SSL tự ký.
   - **HTTP Security Headers**:
     - `X-Content-Type-Options: nosniff`: Ngăn chặn trình duyệt đoán mò kiểu MIME (MIME-sniffing).
     - `X-Frame-Options: SAMEORIGIN`: Chống tấn công Clickjacking bằng cách ngăn nhúng website vào iframe từ domain lạ.
     - `Referrer-Policy: strict-origin-when-cross-origin`: Bảo vệ thông tin nguồn gốc truy cập.
     - `Content-Security-Policy`: Kiểm soát nguồn tải tài nguyên (scripts, styles từ chính host và Google Fonts).
   - **Proxy Headers**: Truyền đầy đủ `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`, `X-Forwarded-Host`.
   - **Quản lý Log**: Tách riêng access log và error log (kèm volume `nhahang_nginx_logs`) sẵn sàng cho việc gom log bằng Promtail/Loki.

---

## 3. Hướng Dẫn Khởi Chạy

### Bước 1: Chuẩn bị tệp cấu hình `.env`
Đảm bảo tệp `.env` đã được cấu hình:
```bash
cp .env.example .env
```

### Bước 2: Sinh chứng chỉ SSL tự ký (Nếu triển khai trên máy mới)
Nếu chưa có thư mục `nginx/ssl/`, chạy lệnh sau (sử dụng Docker để sinh không cần cài OpenSSL trên máy):
```powershell
docker run --rm -v "${PWD}/nginx/ssl:/certs" alpine sh -c "apk add --no-cache openssl && openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /certs/selfsigned.key -out /certs/selfsigned.crt -subj '/C=VN/ST=Hanoi/L=Hanoi/O=MaisonXuan/OU=IT/CN=localhost'"
```

### Bước 3: Khởi chạy các container
```bash
docker compose up -d --build
```

### Bước 4: Kiểm tra trạng thái
```bash
docker compose ps
```
Cả 4 container (`nhahang_nginx`, `nhahang_web`, `nhahang_postgres`, `nhahang_pgadmin`) phải ở trạng thái `Up` hoặc `healthy`.

---

## 4. Hướng Dẫn Kiểm Thử

### 1. Truy cập qua Nginx Reverse Proxy
- **HTTP**: [http://localhost:8088](http://localhost:8088)
- **HTTPS**: [https://localhost:8443](https://localhost:8443) *(Khi trình duyệt cảnh báo chứng chỉ tự ký, bấm Advanced -> Proceed to localhost)*
- **Health Check API**: [http://localhost:8088/health](http://localhost:8088/health) hoặc [https://localhost:8443/health](https://localhost:8443/health)

### 2. Kiểm tra cú pháp Nginx
```bash
docker exec nhahang_nginx nginx -t
```
*Kết quả chuẩn: `nginx.conf syntax is ok` và `test is successful`.*

### 3. Kiểm tra Security Headers bằng cURL
```bash
curl.exe -I http://localhost:8088/
curl.exe -k -I https://localhost:8443/
```
*Xác nhận có đủ các header: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Content-Security-Policy`.*

### 4. Truy cập giao diện Quản trị pgAdmin 4
- URL: [http://localhost:5050](http://localhost:5050)
- **Tài khoản đăng nhập**:
  - Email: `admin@example.com`
  - Mật khẩu: Thông tin cấu hình trong `.env`
- **Kết nối đến PostgreSQL**:
  - Host: `db`
  - Port: `5432`
  - Database: `nhahang_db`
  - Username: `nhahang_user`

---

## 5. Dừng Dịch Vụ Khi Cần
```bash
docker compose down
```
*(Lưu ý: Dữ liệu món ăn, bàn ăn, đơn hàng vẫn được lưu an toàn trong Docker Volume `nhahang_pgdata`)*
