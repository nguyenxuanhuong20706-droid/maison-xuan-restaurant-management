# Hệ Thống Quản Lý Nhà Hàng (NhaHang) — Giai Đoạn 1

Dự án thực hành môn **Triển khai và Quản trị Hệ thống Phần mềm**.

---

## 1. Kiến Trúc Hệ Thống (Giai Đoạn 1)

Hệ thống được đóng gói hoàn toàn trong môi trường Docker bằng `Docker Compose`, bao gồm 3 dịch vụ hoạt động độc lập trên mạng nội bộ `nhahang_net`:

```
+-------------------------------------------------------------------------+
|                               Host Machine                              |
|                                                                         |
|   [Port 5000]                 [Port 5433]               [Port 5050]     |
|        │                           │                         │          |
+--------┼───────────────────────────┼─────────────────────────┼----------+
         │                           │                         │
         ▼                           ▼                         ▼
+─────────────────+         +─────────────────+        +────────────────+
|   nhahang_web   |         | nhahang_postgres|        | nhahang_pgadmin|
| (Node.js/Express| ──SQL──>| (PostgreSQL 16) | <───── |  (pgAdmin 4)   |
|   Port: 5000)   |         |   Port: 5432)   |        |   Port: 80)    |
+─────────────────+         +─────────────────+        +────────────────+
         │                           │                         │
         +───────────────────────────┴─────────────────────────+
                     Mạng nội bộ Docker (nhahang_net)
```

### Bảng Ánh Xạ Cổng (Tránh Xung Đột Hệ Thống)
| Dịch vụ | Cổng Container (Nội bộ) | Cổng Host (Truy cập từ Windows) | Lý do chọn cổng |
|---|---|---|---|
| **Web App (Node.js)** | `5000` | `5000` | Tránh cổng 3000 (Grafana) và 8080 (WordPress) |
| **PostgreSQL** | `5432` | `5433` | Tránh trùng cổng 5432 của PostgreSQL đã cài trên Windows |
| **pgAdmin 4** | `80` | `5050` | Cổng web quản trị tiện lợi, không đụng độ các dịch vụ cũ |

---

## 2. Các Chức Năng Đã Triển Khai

1. **Quản lý Món ăn (Thực đơn)**:
   - Thêm món mới (Tên, danh mục, đơn giá VNĐ, trạng thái).
   - Xem danh sách món ăn, tìm kiếm theo tên và lọc theo danh mục.
   - Sửa thông tin món ăn.
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

---

## 3. Hướng Dẫn Khởi Chạy

### Bước 1: Chuẩn bị tệp cấu hình `.env`
Đảm bảo tệp `.env` đã được tạo từ `.env.example`:
```bash
cp .env.example .env
```

### Bước 2: Build và khởi động các container
Tại thư mục gốc `C:\Users\HUONG\Documents\NhaHang`, mở terminal và chạy:
```bash
docker compose up -d --build
```

### Bước 3: Kiểm tra trạng thái các container
```bash
docker compose ps
```
Cả 3 container (`nhahang_web`, `nhahang_postgres`, `nhahang_pgadmin`) phải ở trạng thái `Up` (hoặc `healthy`).

---

## 4. Kiểm Thử & Truy Cập

- **Giao diện Web Nhà Hàng**: [http://localhost:5000](http://localhost:5000)
- **Kiểm tra Health Check API**: [http://localhost:5000/health](http://localhost:5000/health)
- **Giao diện Quản trị pgAdmin 4**: [http://localhost:5050](http://localhost:5050)

### Hướng dẫn kết nối Database trong pgAdmin 4:
1. Đăng nhập pgAdmin bằng thông tin trong `.env`:
   - **Email**: `admin@nhahang.local`
   - **Password**: `Admin@NhaHang2026`
2. Tạo kết nối mới (Add New Server):
   - **Name**: `NhaHang_PostgreSQL`
   - Tab **Connection**:
     - **Host name/address**: `db` *(kết nối trong cùng mạng docker)*
     - **Port**: `5432`
     - **Maintenance database**: `nhahang_db`
     - **Username**: `nhahang_user`
     - **Password**: `nhahang_password_2026`
3. Bấm **Save** để xem các bảng: `tables`, `dishes`, `orders`, `order_items`.

---

## 5. Dừng Dịch Vụ Khi Cần
```bash
docker compose down
```
*(Lưu ý: Dữ liệu vẫn được lưu an toàn trong Docker Volume `nhahang_pgdata`)*
