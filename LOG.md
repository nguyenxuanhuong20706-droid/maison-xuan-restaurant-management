# SỔ TAY BÀN GIAO & NHẬT KÝ DỰ ÁN (LOG.md)

---

## 📌 PHẦN 1: TÓM TẮT BÀN GIAO (DÀNH CHO AGENT TIẾP THEO — ĐỌC TRONG 3-5 PHÚT)

> [!IMPORTANT]
> **QUY TẮC BẮT BUỘC CHO AGENT MỚI:**
> 1. **KHÔNG KHỞI TẠO LẠI DỰ ÁN** và **TUYỆT ĐỐI KHÔNG XÓA DỮ LIỆU/VOLUME**.
> 2. **KHÔNG CAN THIỆP** các container/dịch vụ của các bài thực hành cũ đang chạy trên máy (`mysql`, `wordpress` - port 8080, `grafana` - port 3000, `loki` - port 3100, `promtail` thuộc LokiPractice & TTCS).
> 3. **KHÔNG CHẠY** `docker compose down -v`, `docker volume rm`, `docker system prune`, hoặc các lệnh dọn dẹp Docker toàn hệ thống.
> 4. **KHÔNG TỰ ĐỘNG COMMIT HOẶC PUSH GIT:** Người dùng (Huong) sẽ trực tiếp kiểm tra và thực hiện commit/push.
> 5. Luôn kiểm tra trạng thái thực tế bằng lệnh (`docker ps`, kiểm tra cổng) trước khi làm việc.
> 6. Cập nhật file `LOG.md` này sau mỗi hạng mục lớn hoàn thành.

### Trạng Thái Hiện Tại
- **Tên dự án:** Nhà Hàng Maison Xuan (maison-xuan-restaurant-management).
- **Đề bài thi:** Đề 12 — Triển khai và Quản trị Hệ thống Quản lý Nhà hàng / Order.
- **Hạn chót hoàn thành:** Trước **14:30 ngày 24/10/2026**.
- **Repository GitHub:** [https://github.com/nguyenxuanhuong20706-droid/maison-xuan-restaurant-management](https://github.com/nguyenxuanhuong20706-droid/maison-xuan-restaurant-management) (Nhánh `main`).
- **Giai đoạn hiện tại:** **ĐÃ HOÀN THÀNH GIAI ĐOẠN 2 (Nginx Reverse Proxy & SSL Gateway)**. Đang chờ người dùng kiểm tra để commit **Commit 2**.
- **Trạng thái dịch vụ:** Cả 4 container (`nhahang_nginx`, `nhahang_web`, `nhahang_postgres`, `nhahang_pgadmin`) đều đang chạy `Up` / `healthy`.

### Bảng Ánh Xạ Cổng Đang Hoạt Động Thực Tế
| Dịch vụ | Container Name | Cổng Container | Cổng Host (Windows) | Trạng Thái Kiểm Chứng Thực Tế |
|---|---|---|---|---|
| **Nginx HTTP** | `nhahang_nginx` | 80 | **8088** | [http://localhost:8088](http://localhost:8088) — Phục vụ web & API kèm 4 Security Headers |
| **Nginx HTTPS** | `nhahang_nginx` | 443 | **8443** | [https://localhost:8443](https://localhost:8443) — Mã hóa SSL tự ký, đầy đủ Security Headers |
| **Web App Backend** | `nhahang_web` | 5000 | **5000** | [http://localhost:5000](http://localhost:5000) — Node.js Express trực tiếp |
| **PostgreSQL 16** | `nhahang_postgres` | 5432 | **5433** | `healthy` — Cổng 5433 (tránh cổng 5432 PostgreSQL Windows) |
| **pgAdmin 4** | `nhahang_pgadmin` | 80 | **5050** | [http://localhost:5050](http://localhost:5050) — Đã đăng nhập & kết nối PostgreSQL |

---

## 🏗️ PHẦN 2: KIẾN TRÚC & CẤU TRÚC HỆ THỐNG

### 1. Kiến Trúc Kỹ Thuật (Giai Đoạn 2)
- **Cổng vào (Entry Gateway):** Nginx Alpine v1.31 đóng vai trò Reverse Proxy, cân bằng kết nối, SSL termination và gắn HTTP Security Headers.
- **Backend:** Node.js v20 (Alpine Linux), framework Express.js.
- **Frontend:** HTML5, CSS3 responsive, JavaScript ES6 (Fetch API).
- **Cơ sở dữ liệu:** PostgreSQL 16 (Alpine Linux).
- **Quản trị cơ sở dữ liệu:** pgAdmin 4 (Email: `admin@example.com`).
- **Mạng điều phối:** Docker Compose bridge network (`nhahang_net`).
- **Khóa & Chứng chỉ SSL:** Tạo tại `nginx/ssl/` bằng OpenSSL qua Docker, được loại trừ khỏi Git qua `.gitignore`.

### 2. Cấu Trúc Thư Mục Dự Án
```
C:\Users\HUONG\Documents\NhaHang\
├── .env                  # Cấu hình biến môi trường thực tế (Bảo mật, KHÔNG commit)
├── .env.example          # Mẫu cấu hình môi trường không chứa mật khẩu nhạy cảm
├── .gitignore            # Loại trừ node_modules/, .env, nginx/ssl/*.crt, *.key
├── docker-compose.yml    # Cấu hình 4 dịch vụ: db, app, pgadmin, nginx
├── Dockerfile            # Khởi tạo image cho ứng dụng Node.js (node:20-alpine)
├── package.json          # Quản lý thư viện phụ thuộc: express, pg, cors, dotenv
├── README.md             # Hướng dẫn chi tiết chạy dự án & kiểm thử
├── LOG.md                # Tài liệu theo dõi tiến độ & bàn giao giữa các AI Agent
├── nginx/
│   ├── conf.d/
│   │   └── default.conf  # Cấu hình virtual host: Reverse proxy 80/443, SSL, Security Headers
│   ├── ssl/              # Chứa selfsigned.crt và selfsigned.key (được gitignore)
│   ├── generate-ssl.sh   # Script bash sinh chứng chỉ SSL tự ký
│   └── generate-ssl.ps1  # Script PowerShell sinh chứng chỉ SSL tự ký qua Docker
└── src/
    ├── index.js          # Điểm khởi tạo Express server, health check, middleware
    ├── db.js             # Quản lý connection pool đến PostgreSQL với pg Pool
    ├── initDb.js         # Khởi tạo schema 4 bảng và nạp dữ liệu mẫu
    ├── routes/
    │   ├── dishes.js     # API CRUD quản lý thực đơn món ăn (/api/dishes)
    │   ├── tables.js     # API quản lý bàn ăn (/api/tables)
    │   └── orders.js     # API tạo đơn, tính tiền, cập nhật trạng thái (/api/orders)
    └── public/           # Giao diện người dùng tĩnh (HTML/CSS/JS)
```

---

## 📊 PHẦN 3: ĐÁNH GIÁ TIẾN ĐỘ THEO TIÊU CHÍ BÀI THI

| STT | Tiêu chí đánh giá bài thi | Trạng thái | Chi tiết hiện trạng thực tế |
|---|---|---|---|
| 1 | **GitHub & Quản lý phiên bản (Tối thiểu 3 commit)** | 🔄 **Đạt 1/3 commit** | Nhánh `main` đã có **Commit 1**: *"Khoi tao he thong quan ly nha hang voi PostgreSQL va pgAdmin"*. Đang chuẩn bị cho **Commit 2**. |
| 2 | **Ứng dụng Web & Database (Docker Compose)** | ✅ **Đạt** | Chạy ổn định trên Docker Compose, 4 bảng dữ liệu trong PostgreSQL, 2 món ăn #12, #13 lưu bền vững. |
| 3 | **Nginx Reverse Proxy & SSL Gateway** | ✅ **Đạt** | Đã cấu hình Nginx Alpine làm Reverse Proxy, hỗ trợ HTTP cổng 8088, HTTPS cổng 8443, đầy đủ Security Headers. |
| 4 | **Giám sát hệ thống (Prometheus & Grafana)** | ⏳ **Chưa làm** | Thuộc Giai đoạn tiếp theo. Cần chọn cổng tránh Grafana cũ (port 3000). |
| 5 | **Thu thập Log (Loki & Promtail)** | ⏳ **Chưa làm** | Thuộc Giai đoạn tiếp theo. Đã chuẩn bị sẵn file access log và volume log trong Nginx. |
| 6 | **Bảo mật cơ bản & Nâng cao** | ✅ **Đạt phần lớn** | `.env` tách biệt, chống SQL Injection bằng parameterized queries, SSL/TLS tự ký, bổ sung 4 HTTP Security Headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Content-Security-Policy`. |
| 7 | **Báo cáo (>= 10 trang) & Demo** | ⏳ **Chưa làm** | Soạn thảo ở giai đoạn cuối sau khi hoàn thiện toàn bộ tính năng. |

---

## ✅ PHẦN 4: CÁC KẾT QUẢ ĐÃ KIỂM CHỨNG THỰC TẾ (GIAI ĐOẠN 2)

1. **Kiểm tra cấu hình Nginx trong container:**
   - Lệnh: `docker exec nhahang_nginx nginx -t`
   - Kết quả: `syntax is ok` và `test is successful`.
2. **Kiểm tra trạng thái cụm 4 container (`docker compose ps`):**
   - `nhahang_nginx`: Up (healthy) — Ports 8088->80, 8443->443
   - `nhahang_web`: Up — Port 5000->5000
   - `nhahang_postgres`: Up (healthy) — Port 5433->5432
   - `nhahang_pgadmin`: Up — Port 5050->80
3. **Kiểm tra HTTP Reverse Proxy tại cổng 8088:**
   - Lệnh: `curl.exe -I http://localhost:8088/`
   - Kết quả: `HTTP/1.1 200 OK`, `Server: nginx/1.31.7`, trả về giao diện đầy đủ.
4. **Kiểm tra HTTPS Reverse Proxy tại cổng 8443:**
   - Lệnh: `curl.exe -k -I https://localhost:8443/`
   - Kết quả: `HTTP/1.1 200 OK`, SSL Handshake thành công với chứng chỉ `CN=localhost`.
5. **Kiểm tra 4 HTTP Security Headers đã cấu hình:**
   - `X-Content-Type-Options: nosniff` (Đạt)
   - `X-Frame-Options: SAMEORIGIN` (Đạt)
   - `Referrer-Policy: strict-origin-when-cross-origin` (Đạt)
   - `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self';` (Đạt)
6. **Xác minh tính nguyên vẹn của dữ liệu cũ qua Reverse Proxy:**
   - Gọi API qua Nginx: `curl.exe -s http://localhost:8088/api/dishes`
   - Kết quả: Toàn bộ danh sách món ăn trả về bình thường, bao gồm:
     - Món **#12: Toboki Hàn Quốc** — Đơn giá: **62.000 VNĐ** (Nguyên vẹn).
     - Món **#13: Mỳ cay Seoul** — Đơn giá: **65.000 VNĐ** (Nguyên vẹn).
   - Dữ liệu bàn ăn và đơn hàng qua `https://localhost:8443/api/tables` và `https://localhost:8443/api/orders` trả về chính xác 100%.
7. **Bảo mật mã nguồn Git:**
   - Lệnh `git status -u` xác nhận các tệp chứng chỉ bí mật `selfsigned.crt` và `selfsigned.key` được chặn hoàn toàn, không xuất hiện trong danh sách staging của Git.

---

## ⚠️ PHẦN 5: CÁC VẤN ĐỀ ĐÃ XỬ LÝ & LỖI CÒN TỒN TẠI

### Các Vấn Đề Đã Được Xử Lý Ở Giai Đoạn 2
1. **Lựa chọn cổng không đụng độ:** Chọn cổng host `8088` (cho HTTP) và `8443` (cho HTTPS) tránh hoàn toàn cổng 8080 (WordPress cũ) và các dịch vụ khác.
2. **Sinh chứng chỉ SSL tự ký không phụ thuộc hệ điều hành:** Tạo chứng chỉ trực tiếp thông qua Docker container `alpine` chứa OpenSSL, giúp bất kỳ môi trường nào cũng có thể tự động tái tạo chứng chỉ.
3. **Cấu hình CSP (Content-Security-Policy) phù hợp:** Bổ sung `https://fonts.googleapis.com` và `https://fonts.gstatic.com` vào CSP để font chữ Plus Jakarta Sans hiển thị chuẩn, không bị trình duyệt chặn.

### Các Hạng Mục Chưa Làm
1. **Prometheus & Grafana:** Chưa cấu hình (chuẩn bị cho Giai đoạn 3).
2. **Loki & Promtail:** Chưa cấu hình (chuẩn bị cho Giai đoạn 3).
3. **Báo cáo và tài liệu vấn đáp:** Chưa soạn thảo.
4. **Nhận diện thương hiệu Maison Xuan 2006:** Giữ lại để tinh chỉnh giao diện ở giai đoạn cuối theo yêu cầu của bạn.

---

## 📋 PHẦN 6: DANH SÁCH CÔNG VIỆC TIẾP THEO (THEO THỨ TỰ ƯU TIÊN)

1. **Ưu tiên 1 (Ngay bây giờ):** Người dùng (Huong) kiểm tra lại toàn bộ trạng thái hệ thống, sau đó thực hiện **Commit 2**:
   - `git add .`
   - `git commit -m "feat: cau hinh Nginx reverse proxy va SSL tu ky kem security headers"`
   - `git push origin main`
2. **Ưu tiên 2 (Giai đoạn 3 — Giám sát & Logging):**
   - Triển khai Prometheus và Grafana (chọn cổng host không trùng với cổng 3000 của Grafana cũ).
   - Triển khai Loki và Promtail gom log của Nginx và Node.js app (chọn cổng host không trùng cổng 3100 của Loki cũ).
   - Tạo **Commit 3**.
3. **Ưu tiên 3 (Giai đoạn 4 — Hoàn thiện & Báo cáo):**
   - Tinh chỉnh nhận diện thương hiệu Maison Xuan trên giao diện.
   - Soạn thảo báo cáo tối thiểu 10 trang kèm sơ đồ kiến trúc và ảnh chụp minh chứng.
