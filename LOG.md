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
│   ├── ssl/              # Chứa selfsigned.crt và selfsigned.key (được | 1 | **GitHub & Quản lý phiên bản (Tối thiểu 3 commit)** | ✅ **Đạt xuất sắc** | Đã có Commit 1 (`179656d`), Commit 2 (`5564b43`), Commit 3 (`99fe137`). Chuẩn bị commit cho Giai đoạn 5. |
| 2 | **Ứng dụng Web & Database (Docker Compose)** | ✅ **Đạt** | Chạy ổn định trên Docker Compose, 4 bảng dữ liệu trong PostgreSQL, 13 món ăn và 6 bàn ăn lưu bền vững. |
| 3 | **Nginx Reverse Proxy & SSL Gateway** | ✅ **Đạt** | Nginx Alpine làm Reverse Proxy, HTTP cổng 8088, HTTPS cổng 8443, đầy đủ 4 Security Headers. |
| 4 | **Giám sát hệ thống (Prometheus & Grafana)** | ✅ **Đạt xuất sắc** | Prometheus (9091) scrape 4/4 targets `UP`. Grafana (3001) nạp sẵn Dashboard đo lường Web App, DB, Nginx, nghiệp vụ và tài nguyên CPU/RAM. |
| 5 | **Thu thập Log (Loki & Promtail)** | ✅ **Đạt xuất sắc** | Loki 3.0 (3101) & Promtail thu thập log tập trung từ Express, Nginx (access/error) và PostgreSQL. Datasource Loki tích hợp vào Grafana (3001). Đã kiểm thử 3 LogQL trả về kết quả thực tế. |
| 6 | **Bảo mật cơ bản & Nâng cao** | ✅ **Đạt xuất sắc** | Non-root `node` (UID=1000), 3-tier Network Isolation, 127.0.0.1 Binding cho cổng quản trị/DB, ẩn phiên bản Nginx & X-Powered-By, `no-new-privileges:true`. |
| 7 | **Báo cáo (>= 10 trang) & Demo** | 🔄 **Đang hoàn thiện** | Đã có tài liệu vấn đáp chi tiết 5 giai đoạn tại thư mục `docs/`. Chuẩn bị soạn báo cáo tổng hợp. |

---

## ✅ PHẦN 4: CÁC KẾT QUẢ ĐÃ KIỂM CHỨNG THỰC TẾ (GIAI ĐOẠN 5)

1. **Kiểm tra trạng thái cụm 10 container (`docker compose ps`):**
   - Cả 10 container (`nhahang_nginx`, `nhahang_web`, `nhahang_postgres`, `nhahang_pgadmin`, `nhahang_postgres_exporter`, `nhahang_nginx_exporter`, `nhahang_prometheus`, `nhahang_grafana`, `nhahang_loki`, `nhahang_promtail`) đều đang hoạt động `Up` hoặc `healthy`.
   - Các cổng nhạy cảm (`5433`, `5050`, `9091`, `3001`, `3101`, `5000`) đều được khóa chặt vào `127.0.0.1`.
2. **Kiểm tra Non-root user trong `nhahang_web`:**
   - Lệnh `docker compose exec app id` trả về: `uid=1000(node) gid=1000(node) groups=1000(node)`.
   - Lệnh `docker compose exec app whoami` trả về: `node`.
3. **Kiểm tra Network Isolation (Phân vùng 3 mạng):**
   - Từ Nginx gọi tới Database: `docker compose exec nginx nc -z -v -w 2 db 5432` -> `nc: bad address 'db'` (Cô lập thành công 100%).
   - Từ Web App gọi tới Database: `docker compose exec app nc -z -v -w 2 db 5432` -> `db open` (Kết nối nội bộ thành công).
4. **Kiểm tra ẩn thông tin nhạy cảm (Information Disclosure):**
   - Lệnh `curl.exe -I -s http://localhost:8088/` trả về:
     - `Server: nginx` (đã loại bỏ số phiên bản Nginx).
     - Triệt tiêu hoàn toàn header `X-Powered-By: Express`.
     - Duy trì đầy đủ 4 Security Headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Content-Security-Policy`.
5. **Kiểm tra Giám sát CPU/RAM trên Grafana:**
   - Đã bổ sung Hàng Panel 4: *Giám sát tài nguyên hệ thống & tiến trình (CPU & RAM)* vào Dashboard `maison-xuan-overview`.
   - Panel CPU đo % tải thực tế của Node.js Express và các exporters (`rate(nhahang_nodejs_process_cpu_seconds_total[1m]) * 100`).
   - Panel RAM đo dung lượng bộ nhớ thực tế (khoảng 71 MB cho Node.js Express, 126 MB cho Prometheus).
6. **Kiểm tra tính toàn vẹn dữ liệu:**
   - 13 món ăn, 6 bàn ăn và 4 đơn hàng trong PostgreSQL được bảo toàn nguyên vẹn.
   - Tài khoản và mật khẩu của PostgreSQL, pgAdmin và Grafana hoạt động ổn định.

---

## 📋 PHẦN 5: DANH SÁCH CÔNG VIỆC TIẾP THEO

1. **Bước 1 (Người dùng kiểm tra):** Kiểm tra lại giao diện website, pgAdmin (5050), Grafana Dashboard CPU/RAM (3001) trên máy Windows.
2. **Bước 2 (Thực hiện Commit Giai đoạn 5):**
   ```bash
   git add .
   git commit -m "feat: security hardening non-root 3-tier network isolation va container resource monitoring"
   git push origin main
   ```
3. **Bước 3 (Soạn thảo Báo cáo tổng hợp >= 10 trang):**
   - Tổng hợp nội dung từ `README.md`, `LOG.md` và 5 file `docs/VAN_DAP_GIAI_DOAN_*.md`.
   - Chèn 12 ảnh chụp màn hình theo danh sách hướng dẫn tại `docs/VAN_DAP_GIAI_DOAN_5.md`.
