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
| 1 | **GitHub & Quản lý phiên bản (Tối thiểu 3 commit)** | 🔄 **Đạt 2/3 commit** | Đã có Commit 1 (`179656d`), Commit 2 (`5564b43`). Chuẩn bị cho **Commit 3 (Giai đoạn 3)**. |
| 2 | **Ứng dụng Web & Database (Docker Compose)** | ✅ **Đạt** | Chạy ổn định trên Docker Compose, 4 bảng dữ liệu trong PostgreSQL, 13 món ăn lưu bền vững. |
| 3 | **Nginx Reverse Proxy & SSL Gateway** | ✅ **Đạt** | Nginx Alpine làm Reverse Proxy, HTTP cổng 8088, HTTPS cổng 8443, đầy đủ 4 Security Headers. |
| 4 | **Giám sát hệ thống (Prometheus & Grafana)** | ✅ **Đạt xuất sắc** | Prometheus (9091) scrape 4/4 targets `UP`. Grafana (3001) nạp sẵn Dashboard đo lường đầy đủ Web App, DB, Nginx và nghiệp vụ nhà hàng. |
| 5 | **Thu thập Log (Loki & Promtail)** | ⏳ **Chưa làm** | Sẽ triển khai riêng ở Giai đoạn 4. |
| 6 | **Bảo mật cơ bản & Nâng cao** | ✅ **Đạt phần lớn** | `.env` tách biệt, chống SQL Injection, SSL/TLS tự ký, 4 HTTP Security Headers, cấm truy cập stub_status từ ngoài. |
| 7 | **Báo cáo (>= 10 trang) & Demo** | ⏳ **Chưa làm** | Soạn thảo ở giai đoạn cuối sau khi hoàn thiện toàn bộ tính năng. |

---

## ✅ PHẦN 4: CÁC KẾT QUẢ ĐÃ KIỂM CHỨNG THỰC TẾ (GIAI ĐOẠN 3)

1. **Kiểm tra trạng thái cụm 8 container (`docker compose ps`):**
   - Cả 8 container (`nhahang_nginx`, `nhahang_web`, `nhahang_postgres`, `nhahang_pgadmin`, `nhahang_postgres_exporter`, `nhahang_nginx_exporter`, `nhahang_prometheus`, `nhahang_grafana`) đều đang hoạt động `Up` hoặc `healthy`.
2. **Kiểm tra Prometheus Targets (`http://localhost:9091/api/v1/targets`):**
   - `nhahang_web` (`app:5000/metrics`): `UP` (Health: up, lastError: "")
   - `nhahang_postgres` (`postgres_exporter:9187/metrics`): `UP` (Health: up, lastError: "")
   - `nhahang_nginx` (`nginx_exporter:9113/metrics`): `UP` (Health: up, lastError: "")
   - `prometheus` (`localhost:9090/metrics`): `UP` (Health: up, lastError: "")
3. **Kiểm tra Grafana Provisioning & Dashboard:**
   - Datasource Prometheus được tự động cấu hình và kết nối thành công.
   - Dashboard `maison-xuan-overview` được tự động nạp vào thư mục "Maison Xuan", truy cập tại [http://localhost:3001/d/maison-xuan-overview](http://localhost:3001/d/maison-xuan-overview).
4. **Kiểm tra đo lường số liệu thực tế:**
   - Chỉ số món ăn thực tế: `nhahang_dishes_total = 13` (khớp 100% cơ sở dữ liệu).
   - Chỉ số bàn ăn thực tế: `available = 2, occupied = 1, reserved = 3`.
   - Lưu lượng HTTP qua Nginx: Ghi nhận chính xác số request tăng khi curl vào API.
   - Độ trễ phản hồi (P95, P50 latency) được ghi nhận chính xác theo thời gian thực.
5. **Kiểm tra tính an toàn của mã nguồn Git:**
   - `.env` và chứng chỉ SSL bí mật không bị đưa lên Git.
   - `.env.example` đã được cập nhật giá trị mẫu.
   - Chưa thực hiện commit hoặc push theo đúng yêu cầu của người dùng.

---

## 📋 PHẦN 5: DANH SÁCH CÔNG VIỆC TIẾP THEO

1. **Bước 1 (Người dùng thực hiện):** Kiểm tra lại giao diện website, Prometheus và Grafana trên trình duyệt.
2. **Bước 2 (Thực hiện Commit 3):**
   ```bash
   git add .
   git commit -m "feat: tich hop Prometheus va Grafana monitoring kem postgres va nginx exporter"
   git push origin main
   ```
3. **Bước 3 (Giai đoạn 4 — Logging & Báo cáo):**
   - Triển khai Loki và Promtail gom log từ Nginx và Web App (chọn cổng tránh xung đột với Loki cũ cổng 3100).
   - Tinh chỉnh nhận diện thương hiệu Maison Xuan (2006).
   - Soạn thảo báo cáo kỹ thuật tối thiểu 10 trang kèm hình ảnh minh chứng.
