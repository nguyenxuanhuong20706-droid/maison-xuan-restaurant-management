# TÀI LIỆU VẤN ĐÁP VÀ BẢO VỆ GIAI ĐOẠN 5: SECURITY HARDENING & CONTAINER MONITORING
**Dự án:** Quản lý Nhà hàng Maison Xuan
**Môn học:** Triển khai và Quản trị Hệ thống Phần mềm (Đề 12)
**Tác giả:** Nguyễn Xuân Hướng
**Môi trường:** Docker Desktop (WSL2) trên Windows 11

---

## MỤC LỤC
1. [Tổng Quan Giai Đoạn 5](#1-tổng-quan-giai-đoạn-5)
2. [Chi Tiết 5 Biện Pháp Bảo Mật (Hardening)](#2-chi-tiết-5-biện-pháp-bảo-mật-hardening)
   - [Biện pháp 1: Non-root User cho Web App](#biện-pháp-1-non-root-user-cho-web-app)
   - [Biện pháp 2: Phân chia mạng nội bộ (3-Tier Network Isolation)](#biện-pháp-2-phân-chia-mạng-nội-bộ-3-tier-network-isolation)
   - [Biện pháp 3: Khóa cổng quản trị vào Localhost (127.0.0.1 Binding)](#biện-pháp-3-khóa-cổng-quản-trị-vào-localhost-127001-binding)
   - [Biện pháp 4: Chống lộ thông tin công nghệ (Information Disclosure Prevention)](#biện-pháp-4-chống-lộ-thông-tin-công-nghệ-information-disclosure-prevention)
   - [Biện pháp 5: Khống chế leo thang đặc quyền (no-new-privileges)](#biện-pháp-5-khống-chế-leo-thang-đặc-quyền-no-new-privileges)
3. [Rà Soát & Kết Quả Giám Sát CPU/RAM Container (cAdvisor vs Runtime Metrics)](#3-rà-soát--kết-quả-giám-sát-cpuram-container)
4. [Kịch Bản Demo Vấn Đáp Trước Giám Khảo (Step-by-Step)](#4-kịch-bản-demo-vấn-đáp-trước-giám-khảo-step-by-step)
5. [Bộ Câu Hỏi & Câu Trả Lời Vấn Đáp Điểm Cao](#5-bộ-câu-hỏi--câu-trả-lời-vấn-đáp-điểm-cao)
6. [Danh Sách Ảnh Màn Hình Cần Chụp Cho Báo Cáo Tổng Hợp (>= 10 Trang)](#6-danh-sách-ảnh-màn-hình-cần-chụp-cho-báo-cáo-tổng-hợp)

---

## 1. TỔNG QUAN GIAI ĐOẠN 5

Trong các giai đoạn trước (1 đến 4), hệ thống Maison Xuan đã hoàn thiện đầy đủ các chức năng nghiệp vụ, Reverse Proxy SSL, giám sát Prometheus/Grafana và thu thập log tập trung Loki/Promtail. Tuy nhiên, một hệ thống doanh nghiệp sẵn sàng vận hành (Production-Ready) bắt buộc phải trải qua khâu **Security Hardening** (Làm cứng bảo mật) nhằm thu hẹp tối đa bề mặt tấn công (Attack Surface) và bảo vệ an toàn tài nguyên.

Giai đoạn 5 triển khai **5 biện pháp bảo mật nâng cao**, đồng thời bổ sung giám sát tài nguyên CPU/RAM vào Grafana Dashboard mà không làm ảnh hưởng đến bất kỳ dữ liệu nghiệp vụ nào (toàn bộ 13 món ăn, 6 bàn ăn và đơn hàng được bảo toàn 100%).

---

## 2. CHI TIẾT 5 BIỆN PHÁP BẢO MẬT (HARDENING)

### Biện pháp 1: Non-root User cho Web App
* **Là gì?**
  Mặc định trong Docker, nếu không khai báo `USER`, tiến trình bên trong container sẽ chạy dưới quyền `root` (`UID=0, GID=0`). Biện pháp này cấu hình `Dockerfile` và `docker-compose.yml` để ứng dụng Node.js chạy bằng tài khoản người dùng thông thường `node` (`UID=1000, GID=1000`).
* **Tại sao cần?**
  Nguyên tắc đặc quyền tối thiểu (Principle of Least Privilege). Một ứng dụng web chỉ cần quyền đọc mã nguồn và lắng nghe cổng mạng, hoàn toàn không cần quyền quản trị tối cao của hệ điều hành.
* **Nếu không áp dụng thì rủi ro gì?**
  Nếu kẻ tấn công khai thác được một lỗ hổng trong mã nguồn ứng dụng (ví dụ: Remote Code Execution - RCE), chúng sẽ ngay lập tức chiếm quyền `root` bên trong container. Từ đó, kẻ tấn công có thể dễ dàng khai thác các kỹ thuật Container Escape (vượt rào container) để tấn công vào máy chủ Host hoặc các container lân cận.
* **Cách kiểm chứng trong buổi thi:**
  ```powershell
  # Kiểm tra ID và tên người dùng bên trong container nhahang_web
  docker compose exec app id
  # Kết quả: uid=1000(node) gid=1000(node) groups=1000(node)

  docker compose exec app whoami
  # Kết quả: node
  ```

---

### Biện pháp 2: Phân chia mạng nội bộ (3-Tier Network Isolation)
* **Là gì?**
  Thay vì đặt tất cả 10 container vào chung một mạng bridge (`nhahang_net`), hệ thống được phân tách thành **3 mạng Docker độc lập**:
  1. `nhahang_frontend_net`: Nginx Reverse Proxy (8088/8443) <--> Web App (5000).
  2. `nhahang_backend_net`: Web App <--> PostgreSQL (5432) <--> pgAdmin <--> Postgres Exporter.
  3. `nhahang_monitoring_net`: Prometheus, Grafana, Loki, Promtail, Postgres Exporter, Nginx Exporter, Web App.
* **Tại sao cần?**
  Mô hình phân vùng mạng kinh điển (Defense-in-Depth). Các dịch vụ chỉ được phép giao tiếp với những thành phần có quan hệ phụ thuộc nghiệp vụ trực tiếp.
* **Nếu không áp dụng thì rủi ro gì?**
  Nếu Nginx Gateway bị xâm nhập, kẻ tấn công có thể dò quét trực tiếp mạng nội bộ và kết nối thẳng vào database PostgreSQL (cổng 5432). Nhưng với phân vùng mạng, Nginx hoàn toàn không nằm trong `nhahang_backend_net`, không thể phân giải tên miền hay kết nối tới `db:5432`.
* **Cách kiểm chứng trong buổi thi:**
  ```powershell
  # 1. Từ Nginx thử kết nối tới Database (bị chặn hoàn toàn do khác network):
  docker compose exec nginx nc -z -v -w 2 db 5432
  # Kết quả: nc: bad address 'db' (Không thể phân giải và không thể kết nối!)

  # 2. Từ Web App kết nối tới Database (thành công do cùng nằm trong backend_net):
  docker compose exec app nc -z -v -w 2 db 5432
  # Kết quả: db (172.23.0.2:5432) open
  ```

---

### Biện pháp 3: Khóa cổng quản trị vào Localhost (127.0.0.1 Binding)
* **Là gì?**
  Mặc định, cú pháp `ports: - "5433:5432"` sẽ lắng nghe trên `0.0.0.0:5433`, tức mở ra toàn bộ mạng LAN/Wi-Fi công cộng. Biện pháp này sửa lại thành `127.0.0.1:PORT:PORT` cho toàn bộ các cổng quản trị và cơ sở dữ liệu (`5433`, `5050`, `9091`, `3001`, `3101`, `5000`).
* **Tại sao cần?**
  Chỉ có cổng Nginx Gateway (`8088` và `8443`) là được phép tiếp nhận traffic từ bên ngoài. Các cổng dữ liệu (PostgreSQL) và hệ thống giám sát quản trị (Grafana, Prometheus, pgAdmin, Loki) chỉ phục vụ người quản trị trên máy chủ cục bộ (Windows Host).
* **Nếu không áp dụng thì rủi ro gì?**
  Bất kỳ ai kết nối cùng mạng Wi-Fi hoặc mạng trường học đều có thể mở trình duyệt tới IP máy tính của bạn và truy cập trực tiếp vào pgAdmin, Prometheus, hoặc tấn công dò mật khẩu PostgreSQL Database.
* **Cách kiểm chứng trong buổi thi:**
  ```powershell
  docker compose ps
  # Quan sát cột PORTS:
  # nhahang_postgres:   127.0.0.1:5433->5432/tcp  (An toàn!)
  # nhahang_pgadmin:    127.0.0.1:5050->80/tcp    (An toàn!)
  # nhahang_prometheus: 127.0.0.1:9091->9090/tcp  (An toàn!)
  # nhahang_grafana:    127.0.0.1:3001->3000/tcp  (An toàn!)
  # nhahang_loki:       127.0.0.1:3101->3100/tcp  (An toàn!)
  # nhahang_nginx:      0.0.0.0:8088, 0.0.0.0:8443 (Gateway duy nhất)
  ```

---

### Biện pháp 4: Chống lộ thông tin công nghệ (Information Disclosure Prevention)
* **Là gì?**
  1. Thêm `server_tokens off;` trong cấu hình Nginx để ẩn số phiên bản Nginx (`Server: nginx` thay vì `Server: nginx/1.31.7`).
  2. Thêm `proxy_hide_header X-Powered-By;` trong Nginx và `app.disable('x-powered-by');` trong Express để triệt tiêu hoàn toàn header `X-Powered-By: Express`.
  3. Duy trì 4 HTTP Security Headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Content-Security-Policy`.
* **Tại sao cần?**
  Kẻ tấn công trước khi khai thác luôn thực hiện Reconnaissance (thu thập thông tin). Việc lộ phiên bản máy chủ và framework giúp chúng tìm chính xác các mã CVE (lỗ hổng bảo mật đã công bố) của phiên bản đó.
* **Nếu không áp dụng thì rủi ro gì?**
  Hệ thống bị lộ chính xác công nghệ backend (Express) và phiên bản Nginx, tạo điều kiện thuận lợi cho các cuộc tấn công tự động (automated vulnerability scanners).
* **Cách kiểm chứng trong buổi thi:**
  ```powershell
  curl.exe -I -s http://localhost:8088/
  # Quan sát:
  # Server: nginx (Đã ẩn số phiên bản)
  # KHÔNG CÒN xuất hiện header 'X-Powered-By: Express'
  # Đầy đủ: X-Content-Type-Options, X-Frame-Options, Referrer-Policy, CSP
  ```

---

### Biện pháp 5: Khống chế leo thang đặc quyền (no-new-privileges)
* **Là gì?**
  Cấu hình `security_opt: - no-new-privileges:true` trong `docker-compose.yml` cho các container `app`, `nginx`, `db`, `prometheus`, `grafana`, `loki`.
* **Tại sao cần?**
  Ngăn chặn tiến trình bên trong container sở hữu thêm quyền mới thông qua các file thực thi có cờ `setuid` hoặc `setgid` (ví dụ: các lỗ hổng khai thác quyền leo thang).
* **Nếu không áp dụng thì rủi ro gì?**
  Nếu có một nhị phân chứa lỗ hổng có bit SUID trong container, kẻ tấn công có thể thực thi nó để nâng quyền từ user thông thường lên quyền root.
* **Cách kiểm chứng trong buổi thi:**
  ```powershell
  docker compose config | Select-String "no-new-privileges"
  ```

---

## 3. RÀ SOÁT & KẾT QUẢ GIÁM SÁT CPU/RAM CONTAINER

### Đánh giá thực nghiệm với cAdvisor trên Docker Desktop (WSL2):
Trong Giai đoạn 5, nhóm đã tiến hành thử nghiệm bổ sung container `cAdvisor` (`gcr.io/cadvisor/cadvisor:v0.49.1`) để lấy metrics cấp độ cgroup của container. Tuy nhiên, kết quả kiểm tra thực tế trên môi trường Docker Desktop 29.x (WSL2 kernel `6.18.33.2-microsoft-standard-WSL2`) ghi nhận:
1. Docker Desktop hiện đại đã chuyển đổi mặc định sang Image Store sử dụng **containerd snapshotter** (`io.containerd.snapshotter.v1`).
2. cAdvisor (do Google phát triển cho Kubernetes) hiện vẫn phụ thuộc vào cấu trúc thư mục của graphdriver cũ (`/var/lib/docker/image/overlayfs/layerdb/mounts/...`).
3. Khi chạy trên Docker Desktop với containerd snapshotter, cAdvisor liên tục báo lỗi `open .../mount-id: no such file or directory` (vấn đề đã được xác nhận tại Upstream Issue cadvisor#3427), dẫn đến cAdvisor không thể gán nhãn tên container chính xác nếu không can thiệp sâu vào cấu hình máy chủ.

### Giải pháp kỹ thuật tối ưu & Thay thế hoàn hảo:
Theo đúng nguyên tắc an toàn: *"Không phá vỡ hệ thống ổn định để ép chạy một công cụ không tương thích"*, nhóm đã khai thác triệt để các số liệu tài nguyên **CPU và RAM thực tế** được xuất trực tiếp từ các Exporter và Web App:
* **CPU Metric:** `rate(nhahang_nodejs_process_cpu_seconds_total[1m]) * 100` đo tỷ lệ tải CPU của backend Node.js, và `rate(process_cpu_seconds_total[1m]) * 100` đo tải CPU của các exporter và Prometheus.
* **RAM Metric:** `nhahang_nodejs_process_resident_memory_bytes` đo dung lượng RAM vật lý (RSS) mà Node.js đang chiếm giữ (khoảng 71 MB), và `process_resident_memory_bytes` đo RAM thực tế của Postgres Exporter, Nginx Exporter, Prometheus Server.
* **Trực quan hóa:** Đã tích hợp trực tiếp **Hàng Panel thứ 4** vào Grafana Dashboard [http://localhost:3001/d/maison-xuan-overview](http://localhost:3001/d/maison-xuan-overview) với 2 biểu đồ Timeseries:
  - Panel 14: *Tỷ Lệ Tải CPU Tiến Trình (% CPU Usage Rate)*
  - Panel 15: *Dung Lượng Bộ Nhớ RAM Thực Tế (Memory RSS Usage)*

---

## 4. KỊCH BẢN DEMO VẤN ĐÁP TRƯỚC GIÁM KHẢO (STEP-BY-STEP)

### Bước 1: Chứng minh cụm 10 container hoạt động ổn định & cô lập mạng
```powershell
docker compose ps
```
👉 *Thuyết minh:* "Thưa thầy/cô, hệ thống hiện có 10 container. Tất cả các cổng quản trị như 5433 (DB), 5050 (pgAdmin), 9091 (Prometheus), 3001 (Grafana) đều đã được khóa chặt vào `127.0.0.1`, chỉ duy nhất Nginx cổng 8088/8443 là mở ra bên ngoài làm cổng vào an toàn."

### Bước 2: Chứng minh bảo mật Non-root User
```powershell
docker compose exec app id
```
👉 *Thuyết minh:* "Container ứng dụng backend `nhahang_web` không chạy bằng quyền root mà chạy bằng non-root user `node` có UID=1000 và GID=1000, tuân thủ nguyên tắc đặc quyền tối thiểu."

### Bước 3: Chứng minh Network Isolation giữa Nginx và Database
```powershell
docker compose exec nginx nc -z -v -w 2 db 5432
```
👉 *Thuyết minh:* "Em đã chia hệ thống thành 3 mạng Docker riêng biệt. Ở đây Nginx thuộc mạng Frontend, hoàn toàn không thể phân giải hoặc kết nối trực tiếp vào Database PostgreSQL, ngăn chặn nguy cơ xâm nhập sâu khi Gateway bị tấn công."

```powershell
docker compose exec app nc -z -v -w 2 db 5432
```
👉 *Thuyết minh:* "Trong khi đó, Web App nằm chung mạng Backend với Database nên kết nối bình thường (`db open`)."

### Bước 4: Chứng minh HTTP Security Headers & Ẩn thông tin công nghệ
```powershell
curl.exe -I -s http://localhost:8088/
```
👉 *Thuyết minh:* "Phản hồi HTTP từ Nginx đã được làm sạch: ẩn hoàn toàn số phiên bản Nginx (`Server: nginx`), triệt tiêu header `X-Powered-By`, đồng thời áp dụng đầy đủ 4 Security Headers chống Clickjacking, MIME Sniffing và XSS."

### Bước 5: Mở Grafana Dashboard trình diễn đo lường CPU & RAM
* Mở trình duyệt tại [http://localhost:3001/d/maison-xuan-overview](http://localhost:3001/d/maison-xuan-overview).
* Cuộn xuống hàng: **💻 GIÁM SÁT TÀI NGUYÊN HỆ THỐNG & TIẾN TRÌNH (CPU & RAM MONITORING)**.
👉 *Thuyết minh:* "Tại Grafana, em đã xây dựng thêm 2 biểu đồ giám sát tài nguyên: Panel CPU thể hiện % tải thực tế của Express và các tiến trình; Panel RAM thể hiện dung lượng bộ nhớ thực tế (khoảng 71MB cho Node.js Express, 126MB cho Prometheus Server)."

---

## 5. BỘ CÂU HỎI & CÂU TRẢ LỜI VẤN ĐÁP ĐIỂM CAO

### Câu 1: Tại sao chạy container với user root lại nguy hiểm?
* **Trả lời:** Mặc dù container có namespace cô lập, nhưng nhân Linux (kernel) là dùng chung với máy chủ host. Nếu kẻ tấn công chiếm quyền thực thi mã trong container chạy quyền root (`UID=0`), các lỗ hổng kernel hoặc cấu hình volume sơ hở có thể giúp chúng thực hiện Container Breakout (vượt rào) để chiếm toàn quyền điều khiển máy chủ vật lý. Do đó, chạy non-root user (như UID 1000) là tiêu chuẩn bảo mật bắt buộc của DevOps.

### Câu 2: Sự khác nhau giữa việc bind cổng `0.0.0.0:5433` và `127.0.0.1:5433` là gì?
* **Trả lời:**
  - `0.0.0.0` là lắng nghe trên tất cả các card mạng (bao gồm Ethernet, Wi-Fi, Internet). Bất kỳ máy nào cùng mạng LAN đều có thể gửi gói tin tới cổng này.
  - `127.0.0.1` (loopback interface) chỉ cho phép các kết nối xuất phát từ chính máy tính nội bộ đó. Do đó, các dịch vụ nhạy cảm như PostgreSQL hay pgAdmin bắt buộc phải bind vào `127.0.0.1`.

### Câu 3: `no-new-privileges` có ý nghĩa gì trong bảo mật Docker?
* **Trả lời:** Cờ này kích hoạt thuộc tính `PR_SET_NO_NEW_PRIVS` của Linux kernel. Nó ngăn không cho một tiến trình hoặc các tiến trình con của nó nhận thêm quyền hạn thông qua các nhị phân có cờ SUID/SGID (ví dụ: lệnh `sudo` hoặc `su`). Ngay cả khi kẻ tấn công tìm thấy một file SUID bị lỗi, chúng cũng không thể leo thang đặc quyền được.

### Câu 4: Tại sao trong Nginx không nên tự ý bật HSTS quá mạnh khi làm đồ án/thực hành?
* **Trả lời:** HSTS (`Strict-Transport-Security`) yêu cầu trình duyệt ghi nhớ vĩnh viễn rằng tên miền này CHỈ ĐƯỢC PHÉP truy cập qua HTTPS. Nếu bật HSTS trên `localhost` với thời gian `max-age` lớn kèm `includeSubDomains`, trình duyệt sẽ chặn hoàn toàn mọi truy cập HTTP cổng 8088 hoặc các cổng demo khác của localhost trong nhiều tháng sau đó, gây tê liệt môi trường thực hành. Vì vậy, trên môi trường lab/localhost, không nên áp dụng HSTS vĩnh viễn.

---

## 6. DANH SÁCH ẢNH MÀN HÌNH CẦN CHỤP CHO BÁO CÁO TỔNG HỢP (>= 10 TRANG)

Để báo cáo kỹ thuật đạt từ 10 đến 15 trang chuẩn chỉnh, hãy chụp các ảnh màn hình minh chứng sau và chèn vào báo cáo:

| STT | Tên ảnh màn hình | Nội dung minh chứng | Vị trí trong báo cáo |
|---|---|---|---|
| 1 | `01_docker_ps_10_containers.png` | Lệnh `docker compose ps` hiển thị đủ 10 containers đều `Up/healthy` kèm các cổng bind `127.0.0.1`. | Phần Kiến trúc & Tổng quan |
| 2 | `02_website_homepage_http.png` | Giao diện trang chủ Nhà hàng Maison Xuan chạy qua Nginx tại `http://localhost:8088`. | Phần Nghiệp vụ Nhà hàng |
| 3 | `03_website_https_ssl.png` | Giao diện website chạy qua HTTPS cổng `https://localhost:8443` có ổ khóa SSL. | Phần Nginx Gateway & SSL |
| 4 | `04_security_headers_curl.png` | Lệnh `curl.exe -I -s http://localhost:8088/` chứng minh ẩn phiên bản Nginx và Express. | Phần Security Hardening |
| 5 | `05_non_root_user_exec.png` | Lệnh `docker compose exec app id` chứng minh chạy bằng user `node` (UID=1000). | Phần Security Hardening |
| 6 | `06_network_isolation_test.png` | Lệnh `docker compose exec nginx nc -z -v db 5432` báo `bad address` (cô lập thành công). | Phần Phân vùng mạng 3-Tier |
| 7 | `07_pgadmin_database_tables.png` | Giao diện pgAdmin 4 tại `http://localhost:5050` hiển thị 4 bảng: `dishes`, `tables`, `orders`, `order_items`. | Phần Cơ sở dữ liệu |
| 8 | `08_prometheus_targets_up.png` | Giao diện Prometheus Targets tại `http://localhost:9091/targets` hiển thị 4/4 targets `UP`. | Phần Monitoring Prometheus |
| 9 | `09_grafana_dashboard_overview.png` | Toàn cảnh Dashboard Grafana tại [http://localhost:3001](http://localhost:3001) với các panel nghiệp vụ, HTTP và DB. | Phần Trực quan hóa Grafana |
| 10 | `10_grafana_cpu_ram_monitoring.png` | Khung hình phóng to Hàng Panel 4: Biểu đồ CPU Usage Rate & RAM Memory Usage. | Phần Container Monitoring |
| 11 | `11_loki_logql_query_explore.png` | Giao diện Grafana Explore truy vấn LogQL `{service="nhahang_web"}` và `{service="nhahang_nginx"}`. | Phần Centralized Logging |
| 12 | `12_git_commit_history.png` | Lệnh `git log --oneline` thể hiện lịch sử commit bài thi đạt chuẩn phiên bản. | Phần Quản trị mã nguồn Git |
