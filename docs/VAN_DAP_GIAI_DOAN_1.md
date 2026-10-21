# NHÀ HÀNG MAISON XUAN
## Ghi chú vấn đáp — Giai đoạn 1: Xây dựng website và cơ sở dữ liệu

### 1. Giai đoạn 1 em đã làm gì?

Ở Giai đoạn 1, em xây dựng hệ thống quản lý Nhà Hàng Maison Xuan bằng Node.js, Express và PostgreSQL.

Hệ thống được triển khai bằng Docker Compose và sử dụng pgAdmin để quản trị cơ sở dữ liệu.

Website có các chức năng chính:
- Quản lý món ăn: thêm, xem, sửa và xóa món.
- Quản lý bàn ăn và trạng thái bàn.
- Quản lý đơn hàng, số lượng món và tổng tiền.
- Theo dõi trạng thái đơn hàng và thanh toán.

**Câu trả lời ngắn khi thuyết trình:**
> "Ở Giai đoạn 1, em xây dựng và triển khai hệ thống quản lý nhà hàng bằng Node.js Express kết hợp PostgreSQL. Em sử dụng Docker Compose để chạy các dịch vụ và pgAdmin để kiểm tra, quản trị dữ liệu. Hệ thống hỗ trợ quản lý món ăn, bàn ăn và đơn hàng."

---

### 2. Node.js là gì? Tại sao cần?

Node.js là môi trường cho phép chạy JavaScript bên ngoài trình duyệt, đặc biệt ở phía máy chủ.

Trong dự án, Node.js dùng để chạy chương trình backend Express.

Nếu không có Node.js, backend JavaScript hiện tại của em không thể chạy theo cách đã thiết kế.

---

### 3. Express là gì? Tại sao cần?

Express là framework hỗ trợ xây dựng ứng dụng web và API trên Node.js.

Express tiếp nhận yêu cầu từ website và xử lý các chức năng nghiệp vụ.

Ví dụ: Nhân viên nhấn **Tạo đơn hàng**, Express nhận dữ liệu, xử lý yêu cầu và lưu đơn vào PostgreSQL.

Nếu không sử dụng Express, vẫn có thể xây dựng backend bằng công cụ khác, nhưng phải thay đổi cách tổ chức và xử lý các yêu cầu.

---

### 4. PostgreSQL là gì? Tại sao cần?

PostgreSQL là hệ quản trị cơ sở dữ liệu quan hệ.

Nó lưu trữ thông tin món ăn, bàn ăn, đơn hàng và chi tiết đơn hàng.

Dự án có bốn bảng:
- `dishes`: Món ăn.
- `tables`: Bàn ăn.
- `orders`: Đơn hàng.
- `order_items`: Chi tiết món trong từng đơn hàng.

Ví dụ: Khi thêm món Toboki Hàn Quốc giá 62.000 đồng, thông tin được lưu trong bảng `dishes`.

Nếu không có cơ sở dữ liệu hoặc cơ chế lưu trữ thay thế, dữ liệu chỉ giữ trong bộ nhớ chương trình có thể mất khi ứng dụng khởi động lại.

---

### 5. pgAdmin là gì? Có phải database không?

Không. pgAdmin là công cụ có giao diện để quản trị PostgreSQL.

- PostgreSQL: Nơi thực sự lưu dữ liệu.
- pgAdmin: Công cụ giúp xem bảng, chạy câu lệnh SQL và kiểm tra dữ liệu.

Ví dụ: Sau khi thêm món trên website, em mở pgAdmin và kiểm tra bảng `dishes` để xác minh món đã được lưu.

Nếu không có pgAdmin, PostgreSQL vẫn hoạt động. Em có thể quản trị database bằng dòng lệnh hoặc công cụ khác.

---

### 6. Docker là gì? Tại sao cần?

Docker là nền tảng dùng để đóng gói và chạy ứng dụng trong các môi trường gọi là container.

Trong dự án, em chạy các dịch vụ bằng container thay vì phải cài đặt và cấu hình thủ công từng thành phần trên máy.

Ở Giai đoạn 1 có ba container:
- `nhahang_web`: Chạy website Express.
- `nhahang_postgres`: Chạy PostgreSQL.
- `nhahang_pgadmin`: Chạy pgAdmin.

Docker giúp các thành phần được triển khai nhất quán và dễ quản lý.

Không có Docker, website vẫn có thể chạy bằng cách cài đặt Node.js và PostgreSQL trực tiếp, nhưng việc cấu hình môi trường sẽ khác.

---

### 7. Docker Compose là gì?

Docker Compose là công cụ giúp khai báo và quản lý nhiều container trong một tệp cấu hình, thường là `docker-compose.yml`.

Thay vì chạy từng container riêng, em dùng:
```bash
docker compose up -d
```
Để khởi động các dịch vụ của dự án.

Lệnh kiểm tra:
```bash
docker compose ps
```
Để xem trạng thái các container.

---

### 8. Dữ liệu có mất khi Docker khởi động lại không?

Trong dự án Maison Xuan, PostgreSQL sử dụng Docker volume để lưu dữ liệu.

Em đã kiểm thử bằng cách thêm hai món:
- Toboki Hàn Quốc — 62.000 đồng.
- Mỳ cay Seoul — 65.000 đồng.

Sau đó em chạy:
```bash
docker compose restart
```
Khi các container khởi động lại, hai món vẫn còn trong database.

Điều này chứng minh dữ liệu được giữ nguyên sau lần khởi động lại đã kiểm thử.

---

### 9. Git và GitHub dùng để làm gì?

**Git** là công cụ quản lý phiên bản mã nguồn, giúp ghi lại các thay đổi trong quá trình phát triển.

**GitHub** là nền tảng lưu trữ và cộng tác trên các Git repository trực tuyến.

Một số lệnh:
- `git init`: Khởi tạo Git cho dự án.
- `git add .`: Đưa các thay đổi vào vùng chờ commit.
- `git commit -m "..."`: Ghi lại một phiên bản thay đổi.
- `git push origin main`: Đẩy commit lên GitHub.

Em đã tạo Commit 1 để lưu phiên bản đầu tiên của hệ thống và đẩy lên repository Maison Xuan.

---

### 10. Demo trực tiếp Giai đoạn 1

- **Bước 1:** Mở PowerShell tại thư mục dự án và chạy `docker compose ps` để giới thiệu các container.
- **Bước 2:** Mở `http://localhost:5000` để giới thiệu website chạy trực tiếp qua Express.
- **Bước 3:** Mở phần Món ăn, Bàn ăn và Đơn hàng, giới thiệu các chức năng.
- **Bước 4:** Mở `http://localhost:5050`, đăng nhập pgAdmin và kiểm tra bốn bảng trong PostgreSQL.
- **Bước 5:** Chọn bảng `dishes`, kiểm tra dữ liệu món ăn đã lưu.
- **Bước 6:** Giải thích rằng Docker volume giúp giữ dữ liệu sau khi container khởi động lại.

*Lưu ý: Khi demo trực tiếp, chỉ thực hiện những thao tác thêm, sửa, xóa hoặc thanh toán mà em đã kiểm thử an toàn trước đó.*

---

### 11. Câu hỏi giảng viên có thể hỏi

- **Hỏi: Frontend và backend khác nhau thế nào?**  
  *Đáp:* Frontend là phần giao diện người dùng nhìn thấy và thao tác. Backend xử lý yêu cầu, nghiệp vụ và làm việc với database.
- **Hỏi: Express và PostgreSQL khác nhau thế nào?**  
  *Đáp:* Express xử lý yêu cầu và nghiệp vụ, còn PostgreSQL lưu trữ dữ liệu.
- **Hỏi: PostgreSQL và pgAdmin khác nhau thế nào?**  
  *Đáp:* PostgreSQL là hệ quản trị cơ sở dữ liệu, pgAdmin là công cụ quản trị PostgreSQL qua giao diện.
- **Hỏi: Docker Compose có phải ngôn ngữ lập trình không?**  
  *Đáp:* Không. Docker Compose là công cụ khai báo và điều phối nhiều container bằng tệp cấu hình YAML.
- **Hỏi: Vì sao không chạy website trực tiếp mà dùng Docker?**  
  *Đáp:* Docker giúp đóng gói môi trường chạy ứng dụng, dễ khởi động các dịch vụ cùng nhau và giảm sự khác biệt giữa các môi trường triển khai.
- **Hỏi: Nếu xóa container PostgreSQL thì dữ liệu có mất không?**  
  *Đáp:* Nếu dữ liệu được lưu trong Docker volume riêng và volume đó được giữ lại, có thể tạo lại container mà vẫn sử dụng dữ liệu cũ. Nhưng nếu xóa cả volume chứa dữ liệu thì có nguy cơ mất dữ liệu.
- **Hỏi: Vì sao phải sử dụng GitHub?**  
  *Đáp:* Để lưu trữ mã nguồn trực tuyến, theo dõi lịch sử phát triển và thuận tiện cho việc chia sẻ, đánh giá dự án.

---

### 12. Tổng kết Giai đoạn 1

Giai đoạn 1 giúp hệ thống Nhà Hàng Maison Xuan có website hoạt động, xử lý nghiệp vụ bằng Express, lưu dữ liệu bằng PostgreSQL, quản trị database qua pgAdmin và triển khai các dịch vụ bằng Docker Compose.

Đây là nền tảng để tiếp tục bổ sung Nginx, giám sát hệ thống và thu thập nhật ký ở các giai đoạn sau.
