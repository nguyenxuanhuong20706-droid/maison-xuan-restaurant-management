# SỔ TAY BÀN GIAO & NHẬT KÝ DỰ ÁN (LOG.md)

---

## 📌 PHẦN 1: TÓM TẮT BÀN GIAO (DÀNH CHO AGENT TIẾP THEO — ĐỌC TRONG 3-5 PHÚT)

> [!IMPORTANT]
> **QUY TẮC BẮT BUỘC CHO AGENT MỚI:**
> 1. **KHÔNG KHỞI TẠO LẠI DỰ ÁN** và **TUYỆT ĐỐI KHÔNG XÓA DỮ LIỆU/VOLUME**.
> 2. **KHÔNG CAN THIỆP** các container/dịch vụ của các bài thực hành cũ đang chạy trên máy (`mysql`, `wordpress` - port 8080, `grafana` - port 3000, `loki` - port 3100, `promtail` thuộc LokiPractice & TTCS).
> 3. **KHÔNG CHẠY** `docker system prune`, `docker volume rm`, hoặc các lệnh dọn dẹp Docker toàn hệ thống.
> 4. Luôn kiểm tra trạng thái thực tế bằng lệnh (`docker ps`, kiểm tra cổng) trước khi thực hiện bước tiếp theo.
> 5. Cập nhật file `LOG.md` này sau mỗi hạng mục lớn hoàn thành.

### Trạng Thái Hiện Tại
- **Tên dự án:** NhaHang — Hệ thống Quản lý Nhà hàng / Order.
- **Đề bài thi:** Đề 12 — Triển khai và Quản trị Hệ thống Quản lý Nhà hàng.
- **Hạn chót hoàn thành:** Trước **14:30 ngày 24/10/2026**.
- **Giai đoạn hiện tại:** **Đã hoàn thành phần cốt lõi Giai đoạn 1** (Ứng dụng Express, PostgreSQL 16, pgAdmin 4 trên Docker Compose).
- **Trạng thái dịch vụ:** Cả 3 container (`nhahang_web`, `nhahang_postgres`, `nhahang_pgadmin`) đang chạy `Up` và kết nối ổn định.

### Bảng Ánh Xạ Cổng Đang Hoạt Động
| Dịch vụ | Container Name | Cổng Nội Bộ (Container) | Cổng Host (Windows) | Trạng Thái Kiểm Chứng |
|---|---|---|---|---|
| **Web App** | `nhahang_web` | 5000 | **5000** | [http://localhost:5000](http://localhost:5000) — Đang hoạt động |
| **PostgreSQL** | `nhahang_postgres` | 5432 | **5433** | `healthy` (Tránh cổng 5432 PostgreSQL cục bộ của Windows) |
| **pgAdmin 4** | `nhahang_pgadmin` | 80 | **5050** | [http://localhost:5050](http://localhost:5050) — Đã đăng nhập & kết nối |

---

## 🏗️ PHẦN 2: KIẾN TRÚC & CẤU TRÚC HỆ THỐNG

### 1. Kiến Trúc Kỹ Thuật
- **Backend:** Node.js v20 (Alpine Linux), framework Express.js.
- **Frontend:** Vanilla HTML5, CSS3 (Modern responsive dashboard), JavaScript ES6 (Fetch API).
- **Cơ sở dữ liệu:** PostgreSQL 16 (Alpine Linux).
- **Quản trị cơ sở dữ liệu:** pgAdmin 4.
- **Điều phối môi trường:** Docker & Docker Compose (`nhahang_net` bridge network).
- **Bảo mật cấu hình:** Quản lý qua file `.env`, tệp mẫu `.env.example`, `.env` đã được chặn đẩy lên Git qua `.gitignore`.

### 2. Cấu Trúc Thư Mục Dự Án
```
C:\Users\HUONG\Documents\NhaHang\
├── .env                  # Tệp cấu hình biến môi trường thực tế (Bảo mật, KHÔNG commit)
├── .env.example          # Mẫu cấu hình môi trường không chứa mật khẩu nhạy cảm
├── .gitignore            # Loại trừ node_modules/, .env, tệp tạm
├── docker-compose.yml    # Cấu hình 3 dịch vụ: app (web), db (postgres), pgadmin
├── Dockerfile            # Khởi tạo image cho ứng dụng Node.js (node:20-alpine)
├── package.json          # Quản lý thư viện phụ thuộc: express, pg, cors, dotenv
├── README.md             # Hướng dẫn chi tiết chạy dự án, tài liệu kiến trúc
├── LOG.md                # Tài liệu theo dõi tiến độ & bàn giao giữa các AI Agent
├── src/
│   ├── index.js          # Điểm khởi tạo Express server, health check, middleware
│   ├── db.js             # Quản lý connection pool đến PostgreSQL với pg Pool
│   ├── initDb.js         # Khởi tạo schema 4 bảng và tự động nạp dữ liệu mẫu
│   ├── routes/
│   │   ├── dishes.js     # API CRUD quản lý thực đơn món ăn (/api/dishes)
│   │   ├── tables.js     # API quản lý bàn ăn (/api/tables)
│   │   └── orders.js     # API tạo đơn, tính tiền, cập nhật trạng thái (/api/orders)
│   └── public/           # Giao diện người dùng tĩnh
│       ├── index.html    # Trang quản trị tổng hợp dạng Tab (Đơn hàng, Bàn, Món)
│       ├── css/style.css # Giao diện hiện đại, trực quan, hỗ trợ thi thực hành
│       └── js/app.js     # Logic gọi API, cập nhật dữ liệu DOM theo thời gian thực
```

### 3. Mô Hình Dữ Liệu PostgreSQL (4 Bảng)
1. **`tables`**: `id`, `table_number` (UNIQUE), `capacity`, `status` (`available`, `occupied`, `reserved`).
2. **`dishes`**: `id`, `name`, `category`, `price`, `is_available`.
3. **`orders`**: `id`, `table_id` (FK -> `tables.id`), `status` (`pending`, `serving`, `completed`, `cancelled`), `total_price`, `note`, `created_at`.
4. **`order_items`**: `id`, `order_id` (FK -> `orders.id`), `dish_id` (FK -> `dishes.id`), `quantity`, `price`.

---

## 📊 PHẦN 3: ĐÁNH GIÁ TIẾN ĐỘ THEO TIÊU CHÍ BÀI THI

| STT | Tiêu chí đánh giá bài thi | Trạng thái | Chi tiết hiện trạng & Ghi chú |
|---|---|---|---|
| 1 | **GitHub & Quản lý phiên bản (Tối thiểu 3 commit)** | ⏳ **Chưa đạt** | Thư mục chưa được khởi tạo Git (`git init`), chưa tạo commit và chưa gắn remote repository. |
| 2 | **Ứng dụng Web & Database (Docker Compose)** | 🔄 **Đang hoàn thiện** | Đã hoàn thành bộ khung code, Docker Compose chạy tốt, dữ liệu thật trong PostgreSQL. Cần người dùng kiểm thử đầy đủ các luồng CRUD. |
| 3 | **Nginx Reverse Proxy** | ⏳ **Chưa làm** | Thuộc Giai đoạn 2 (định tuyến cổng, load balancing/proxy pass). |
| 4 | **Giám sát hệ thống (Prometheus & Grafana)** | ⏳ **Chưa làm** | Thuộc Giai đoạn tiếp theo. Lưu ý máy đã có Grafana container cũ ở port 3000. |
| 5 | **Thu thập Log (Loki & Promtail)** | ⏳ **Chưa làm** | Thuộc Giai đoạn tiếp theo. Lưu ý máy đã có Loki port 3100 và Promtail cũ. |
| 6 | **Bảo mật cơ bản** | 🔄 **Một phần** | Đã tách `.env`, bảo vệ thông tin đăng nhập DB, mạng nội bộ cách ly giữa các container, chống SQL injection bằng parameterized queries (`$1, $2`). |
| 7 | **Báo cáo (>= 10 trang) & Demo** | ⏳ **Chưa làm** | Thực hiện ở giai đoạn cuối sau khi hoàn thiện toàn bộ hệ thống. |

---

## ✅ PHẦN 4: CÁC KẾT QUẢ ĐÃ KIỂM CHỨNG THỰC TẾ

1. **Khởi chạy Docker Compose:**
   - Đã build và chạy thành công với `docker compose up -d --build`.
   - Lệnh `docker ps` xác nhận cả 3 container `nhahang_web`, `nhahang_postgres`, `nhahang_pgadmin` hoạt động bình thường.
2. **PostgreSQL Container:**
   - Container `nhahang_postgres` đạt trạng thái `healthy` qua Docker healthcheck `pg_isready`.
   - Ánh xạ cổng host: `5433:5432` — không gây xung đột với PostgreSQL cục bộ đã cài trên Windows.
   - Cơ sở dữ liệu `nhahang_db` khởi tạo thành công 4 bảng: `tables`, `dishes`, `orders`, `order_items`.
3. **Ứng dụng Web (Node.js Express):**
   - Hoạt động tại cổng host `5000` ([http://localhost:5000](http://localhost:5000)).
   - Endpoint health check [http://localhost:5000/health](http://localhost:5000/health) trả về HTTP 200 `{ "status": "UP" }`.
   - Kết nối database nội bộ Docker qua host `db`, port `5432`.
4. **pgAdmin 4 Quản trị:**
   - Hoạt động tại cổng host `5050` ([http://localhost:5050](http://localhost:5050)).
   - Đã xử lý lỗi xác thực email: pgAdmin từ chối định dạng email `.local` (`admin@nhahang.local`), đã sửa cấu hình thành `admin@example.com` và đăng nhập thành công.
   - Đã kết nối thành công đến PostgreSQL bên trong mạng Docker bằng host `db`, port `5432`.
5. **Dữ liệu thực tế người dùng đã kiểm chứng:**
   - Người dùng đã thêm thủ công 2 món ăn mới qua giao diện/hệ thống:
     - Món **#12: Toboki Hàn Quốc** — Đơn giá: **62.000 VNĐ**.
     - Món **#13: Mỳ cay Seoul** — Đơn giá: **65.000 VNĐ**.
   - Đã truy vấn SQL trực tiếp trong container `nhahang_postgres` và kiểm tra qua pgAdmin: cả 2 món đều tồn tại chính xác trong bảng `dishes`.
6. **Kiểm tra tính bền vững của dữ liệu (Data Persistence):**
   - Đã chạy thử nghiệm lệnh `docker compose restart`.
   - Cả 3 container khởi động lại nhanh chóng, `nhahang_postgres` trở lại trạng thái `healthy`.
   - Dữ liệu 2 món ăn #12 và #13 cùng toàn bộ dữ liệu bàn ăn và đơn hàng vẫn nguyên vẹn trong Docker Volume `nhahang_pgdata`.
7. **Lưu ý về kiểm thử tính năng:**
   - Các thao tác CRUD khác (sửa/xóa món, cập nhật bàn, toàn bộ chu trình tạo/hủy nhiều đơn phức tạp) **chưa được người dùng kiểm thử đầy đủ**, do đó chưa được tự ý đánh dấu hoàn thành 100%.

---

## ⚠️ PHẦN 5: CÁC VẤN ĐỀ ĐÃ XỬ LÝ & LỖI CÒN TỒN TẠI

### Các Vấn Đề Đã Được Xử Lý
1. **Xung đột cổng hệ thống:**
   - Máy chủ host có sẵn PostgreSQL Windows (port 5432), Grafana cũ (port 3000), Loki cũ (port 3100), WordPress cũ (port 8080).
   - *Giải pháp:* Đã ánh xạ tách biệt an toàn: Web (5000), PostgreSQL (5433), pgAdmin (5050).
2. **Lỗi xác thực email pgAdmin 4:**
   - pgAdmin phiên bản mới kiểm tra chặt chẽ TLD của email, báo lỗi khi dùng `admin@nhahang.local`.
   - *Giải pháp:* Đã đổi biến môi trường `PGADMIN_DEFAULT_EMAIL` sang `admin@example.com`.
3. **Lỗi ép kiểu dữ liệu khi seed đơn hàng mẫu:**
   - Hàm `initDatabase` ban đầu dùng biểu thức số học truyền tham số string vào query `UPDATE orders`.
   - *Giải pháp:* Đã sửa lại trong `src/initDb.js` để parse rõ ràng sang kiểu `Float` trước khi ghi vào database.

### Các Hạng Mục / Vấn Đề Còn Tồn Tại
1. **Chưa có Git repository:** Dự án chưa khởi tạo Git local, chưa có commit nào, chưa kết nối remote GitHub.
2. **Các luồng CRUD người dùng cần tiếp tục trải nghiệm & xác nhận:** Cần chạy thêm các ca kiểm thử giao diện để đảm bảo bạn nắm vững nghiệp vụ khi trả lời vấn đáp thi.
3. **Giai đoạn tiếp theo chưa triển khai:** Nginx reverse proxy, Prometheus, Grafana, Loki, Promtail chưa được cấu hình (theo đúng yêu cầu chỉ làm Giai đoạn 1).

---

## 📋 PHẦN 6: DANH SÁCH CÔNG VIỆC TIẾP THEO (THEO THỨ TỰ ƯU TIÊN)

1. **Ưu tiên 1 (Ngay lập tức):** Người dùng hoàn tất kiểm thử các thao tác CRUD còn lại trên giao diện [http://localhost:5000](http://localhost:5000) (tạo bàn mới, chuyển trạng thái bàn, tạo đơn, thanh toán đơn, sửa món).
2. **Ưu tiên 2 (Tiêu chí 1 của bài thi):**
   - Khởi tạo Git: `git init`.
   - Xác nhận file `.env` không bị track (`git status`).
   - Tạo **Commit 1: "feat: khoi tao du an quan ly nha hang voi Express, PostgreSQL va pgAdmin bang Docker Compose"**.
   - Hướng dẫn người dùng liên kết với repository GitHub cá nhân để push code.
3. **Ưu tiên 3 (Giai đoạn 2 - Triển khai Nginx Reverse Proxy):**
   - Thêm dịch vụ `nginx` vào `docker-compose.yml`.
   - Cấu hình file `nginx.conf` để chuyển tiếp cổng từ Nginx vào `nhahang_web` (chọn cổng host không trùng).
   - Tạo Commit 2 cho phần Nginx.
4. **Ưu tiên 4 (Giai đoạn 3 - Giám sát & Logging):**
   - Tích hợp Prometheus metrics cho Node.js app hoặc cAdvisor.
   - Tích hợp Grafana dashboard riêng cho dự án NhaHang (chú ý chọn cổng khác 3000 để không xung đột Grafana cũ).
   - Tích hợp Loki & Promtail để gom log từ container nhà hàng (chọn cổng khác 3100).
   - Tạo Commit 3.
5. **Ưu tiên 5 (Giai đoạn 4 - Hoàn thiện & Báo cáo):**
   - Soạn thảo khung báo cáo tối thiểu 10 trang theo đúng chuẩn đề tài thi môn học.
   - Chuẩn bị kịch bản demo và các câu hỏi vấn đáp thường gặp.

---

## 🛠️ PHẦN 7: CÁC LỆNH VẬN HÀNH HỆ THỐNG CẦN NHỚ

```bash
# 1. Khởi động hệ thống (lần đầu hoặc sau khi sửa mã nguồn/Dockerfile)
docker compose up -d --build

# 2. Khởi động lại hệ thống mà không build lại
docker compose restart

# 3. Kiểm tra trạng thái các container
docker compose ps

# 4. Xem log của container ứng dụng web
docker logs -f nhahang_web

# 5. Xem log của container database
docker logs -f nhahang_postgres

# 6. Dừng hệ thống (dữ liệu vẫn an toàn trong volume)
docker compose down

# 7. Truy cập vào PostgreSQL CLI kiểm tra trực tiếp
docker exec -it nhahang_postgres psql -U nhahang_user -d nhahang_db
```
