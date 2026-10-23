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
- **Giai đoạn hiện tại:** **ĐÃ HOÀN THÀNH GIAI ĐOẠN 3 (Prometheus & Grafana Monitoring)**. Đang chờ người dùng kiểm tra để thực hiện **Commit 3**.
- **Trạng thái dịch vụ:** Toàn bộ **8/8 container** đều đang chạy `Up` / `healthy`, 4/4 Prometheus targets đều ở trạng thái `UP`.

### Bảng Ánh Xạ Cổng Đang Hoạt Động Thực Tế (8 Container)
| Dịch vụ | Container Name | Cổng Container | Cổng Host (Windows) | Trạng Thái Kiểm Chứng Thực Tế |
|---|---|---|---|---|
| **Nginx HTTP** | `nhahang_nginx` | 80 | **8088** | [http://localhost:8088](http://localhost:8088) — Phục vụ web & API kèm 4 Security Headers |
| **Nginx HTTPS** | `nhahang_nginx` | 443 | **8443** | [https://localhost:8443](https://localhost:8443) — Mã hóa SSL tự ký, an toàn tuyệt đối |
| **Grafana Dashboard** | `nhahang_grafana` | 3000 | **3001** | [http://localhost:3001](http://localhost:3001) — Nạp sẵn dashboard Maison Xuan với dữ liệu sống |
| **Prometheus Server** | `nhahang_prometheus` | 9090 | **9091** | [http://localhost:9091](http://localhost:9091) — Scrape 4 targets chu kỳ 5s (`UP 4/4`) |
| **Web App Backend** | `nhahang_web` | 5000 | **5000** | [http://localhost:5000](http://localhost:5000) — Node.js Express, endpoint `/metrics` |
| **PostgreSQL 16** | `nhahang_postgres` | 5432 | **5433** | `healthy` — Cổng 5433 (tránh cổng 5432 PostgreSQL Windows) |
| **pgAdmin 4** | `nhahang_pgadmin` | 80 | **5050** | [http://localhost:5050](http://localhost:5050) — Đã kết nối PostgreSQL quản trị |
| **Postgres Exporter** | `nhahang_postgres_exporter`| 9187 | *Nội bộ* | Kết nối DB qua mạng nội bộ Docker, xuất metrics DB |
| **Nginx Exporter** | `nhahang_nginx_exporter` | 9113 | *Nội bộ* | Đọc metrics Nginx `stub_status`, xuất metrics HTTP |

---

## 🏗️ PHẦN 2: KIẾN TRÚC & CẤU TRÚC HỆ THỐNG (GIAI ĐOẠN 3)

### 1. Kiến Trúc Kỹ Thuật
- **Cổng vào (Entry Gateway):** Nginx Alpine v1.31 đóng vai trò Reverse Proxy, cân bằng kết nối, SSL termination, gắn HTTP Security Headers và mở `/stub_status` nội bộ.
- **Backend:** Node.js v20 (Alpine Linux), framework Express.js tích hợp thư viện `prom-client` thu thập số liệu chi tiết.
- **Frontend:** HTML5, CSS3 responsive, JavaScript ES6 (Fetch API).
- **Cơ sở dữ liệu:** PostgreSQL 16 (Alpine Linux).
- **Hệ thống Giám sát (Monitoring):**
  - **Prometheus:** Cổng host `9091`, scrape chu kỳ 5s từ `nhahang_web:5000`, `postgres_exporter:9187`, `nginx_exporter:9113`, `localhost:9090`.
  - **Grafana:** Cổng host `3001`, tự động nạp Data Source Prometheus và Dashboard Maison Xuan không cần cấu hình bằng tay.
- **Mạng điều phối:** Docker Compose bridge network (`nhahang_net`).

### 2. Cấu Trúc Thư Mục Dự Án Hiện Tại
```
C:\Users\HUONG\Documents\NhaHang\
├── .env                  # Cấu hình biến môi trường thực tế (Bảo mật, KHÔNG commit)
├── .env.example          # Mẫu cấu hình môi trường không chứa mật khẩu nhạy cảm
├── .gitignore            # Loại trừ node_modules/, .env, nginx/ssl/*.crt, *.key
├── docker-compose.yml    # Cấu hình 8 dịch vụ: db, app, pgadmin, nginx, postgres_exporter, nginx_exporter, prometheus, grafana
├── Dockerfile            # Khởi tạo image cho ứng dụng Node.js (node:20-alpine)
├── package.json          # Quản lý phụ thuộc: express, pg, cors, dotenv, prom-client
├── README.md             # Hướng dẫn chi tiết chạy dự án, kiểm thử & demo
├── LOG.md                # Tài liệu theo dõi tiến độ & bàn giao giữa các AI Agent
├── docs/
│   ├── VAN_DAP_GIAI_DOAN_1.md # Ôn tập vấn đáp Giai đoạn 1 (Web & DB)
│   ├── VAN_DAP_GIAI_DOAN_2.md # Ôn tập vấn đáp Giai đoạn 2 (Nginx & SSL)
│   └── VAN_DAP_GIAI_DOAN_3.md # Ôn tập vấn đáp Giai đoạn 3 (Prometheus & Grafana)
├── grafana/
│   ├── dashboards/
│   │   └── maison-xuan-overview.json # Dashboard JSON trực quan hóa hiệu năng & nghiệp vụ
│   └── provisioning/
│       ├── dashboards/
│       │   └── dashboard.yml         # Tự động nạp dashboard khi container khởi động
│       └── datasources/
│           └── datasource.yml        # Tự động kết nối datasource Prometheus
├── nginx/
│   ├── conf.d/
│   │   └── default.conf  # Virtual host: Proxy 80/443, SSL, Headers, stub_status
│   ├── ssl/              # Chứa selfsigned.crt và selfsigned.key (được gitignore)
│   ├── generate-ssl.sh
│   └── generate-ssl.ps1
├── prometheus/
│   └── prometheus.yml    # Cấu hình scrape interval 5s và 4 targets
└── src/
    ├── index.js          # Khởi tạo Express, tích hợp metrics middleware & /metrics route
    ├── metrics.js        # Module đo lường prom-client và truy vấn business metrics
    ├── db.js             # Quản lý connection pool PostgreSQL
    ├── initDb.js         # Khởi tạo schema 4 bảng và nạp dữ liệu mẫu
    ├── routes/
    │   ├── dishes.js     # API CRUD thực đơn
    │   ├── tables.js     # API quản lý bàn ăn
    │   └── orders.js     # API tạo đơn và thanh toán
    └── public/           # Giao diện người dùng tĩnh
```

---

## 📊 PHẦN 3: ĐÁNH GIÁ TIẾN ĐỘ THEO TIÊU CHÍ BÀI THI

| STT | Tiêu chí đánh giá bài thi | Trạng thái | Chi tiết hiện trạng thực tế |
|---|---|---|---|
| 1 | **GitHub & Quản lý phiên bản (Tối thiểu 3 commit)** | 🔄 **Đạt 2/3 commit** | Đã có Commit 1 (`179656d`), Commit 2 (`5564b43`). Chuẩn bị commit cho Giai đoạn 3 & 4. |
| 2 | **Ứng dụng Web & Database (Docker Compose)** | ✅ **Đạt** | Chạy ổn định trên Docker Compose, 4 bảng dữ liệu trong PostgreSQL, 13 món ăn lưu bền vững. |
| 3 | **Nginx Reverse Proxy & SSL Gateway** | ✅ **Đạt** | Nginx Alpine làm Reverse Proxy, HTTP cổng 8088, HTTPS cổng 8443, đầy đủ 4 Security Headers. |
| 4 | **Giám sát hệ thống (Prometheus & Grafana)** | ✅ **Đạt xuất sắc** | Prometheus (9091) scrape 4/4 targets `UP`. Grafana (3001) nạp sẵn Dashboard đo lường đầy đủ Web App, DB, Nginx và nghiệp vụ nhà hàng. |
| 5 | **Thu thập Log (Loki & Promtail)** | ✅ **Đạt xuất sắc** | Loki 3.0 (3101) & Promtail thu thập log tập trung từ Express, Nginx (access/error) và PostgreSQL. Datasource Loki tích hợp vào Grafana (3001). Đã kiểm thử 3 LogQL trả về kết quả thực tế. |
| 6 | **Bảo mật cơ bản & Nâng cao** | ✅ **Đạt** | `.env` tách biệt, chống SQL Injection, SSL/TLS tự ký, 4 HTTP Security Headers, cấm truy cập stub_status từ ngoài, đổi mật khẩu an toàn. |
| 7 | **Báo cáo (>= 10 trang) & Demo** | ⏳ **Chưa làm** | Chuẩn bị soạn thảo ở giai đoạn 5 hoàn thiện. |

---

## ✅ PHẦN 4: CÁC KẾT QUẢ ĐÃ KIỂM CHỨNG THỰC TẾ (GIAI ĐOẠN 3 & GIAI ĐOẠN 4)

1. **Kiểm tra trạng thái cụm 10 container (`docker compose ps`):**
   - Cả 10 container (`nhahang_nginx`, `nhahang_web`, `nhahang_postgres`, `nhahang_pgadmin`, `nhahang_postgres_exporter`, `nhahang_nginx_exporter`, `nhahang_prometheus`, `nhahang_grafana`, `nhahang_loki`, `nhahang_promtail`) đều đang hoạt động `Up` hoặc `healthy`.
2. **Kiểm tra Prometheus Targets (`http://localhost:9091/api/v1/targets`):**
   - Scrape 4/4 targets `UP`: `nhahang_web`, `nhahang_postgres`, `nhahang_nginx`, `prometheus`.
3. **Kiểm tra Grafana Provisioning (Datasources & Dashboards):**
   - Datasource **Prometheus** (`http://nhahang_prometheus:9090`) và **Loki** (`http://loki:3100`) đều tự động cấu hình và kết nối thành công.
   - Dashboard `maison-xuan-overview` được nạp sẵn tại [http://localhost:3001/d/maison-xuan-overview](http://localhost:3001/d/maison-xuan-overview).
4. **Kiểm tra Loki Ingestion & 3 câu truy vấn LogQL thực tế:**
   - **LogQL 1 (Express App):** `{service="nhahang_web"}` — Ghi nhận log request chuẩn cấu trúc ISO timestamp, HTTP method, URL, status code, latency.
   - **LogQL 2 (Nginx Gateway):** `{service="nhahang_nginx"}` — Ghi nhận access log HTTP/HTTPS và error log từ volume chia sẻ `/var/log/nginx/*_*.log`.
   - **LogQL 3 (Cảnh báo & Lỗi 4xx/5xx):** `{service="nhahang_web"} |= "WARN"` hoặc `{service=~"nhahang_web|nhahang_nginx"} |~ "404|500|WARN|ERROR"` — Bắt chính xác các request gọi endpoint không tồn tại (HTTP 404).
5. **Kiểm tra bảo mật và dữ liệu:**
   - 13 món ăn và cấu hình nghiệp vụ trong `nhahang_pgdata` được bảo toàn nguyên vẹn.
   - Mật khẩu và token không bị xuất hiện trong log hoặc commit Git.

---

## 📋 PHẦN 5: DANH SÁCH CÔNG VIỆC TIẾP THEO (GIAI ĐOẠN 5)

1. **Bước 1 (Người dùng kiểm tra):** Truy cập Grafana Explore [http://localhost:3001/explore](http://localhost:3001/explore) kiểm tra Loki datasource và chạy thử 3 câu truy vấn LogQL.
2. **Bước 2 (Xem xét cAdvisor theo yêu cầu đề thi):**
   - Hiện tại hệ thống đã có Node.js runtime metrics (`process_cpu_user_seconds_total`, `nodejs_heap_size_total_bytes`) và PostgreSQL DB metrics.
   - Đề xuất bổ sung dịch vụ `cadvisor` (container `nhahang_cadvisor`, host port `8085`) để thu thập thông số CPU/RAM cgroup của từng container riêng biệt theo chuẩn đề thi.
3. **Bước 3 (Thực hiện Commit):**
   ```bash
   git add .
   git commit -m "feat: tich hop Loki va Promtail centralized logging kem Grafana Loki datasource"
   git push origin main
   ```
4. **Bước 4 (Soạn báo cáo hoàn chỉnh & Vấn đáp):**
   - Tạo tài liệu báo cáo kỹ thuật tổng hợp toàn bộ 5 giai đoạn (>= 10 trang, kèm ảnh chụp).
   - Chuẩn bị kịch bản demo trực tiếp cho giảng viên.
