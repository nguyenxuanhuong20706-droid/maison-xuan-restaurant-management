# NHÀ HÀNG MAISON XUAN
## Ghi chú vấn đáp — Giai đoạn 2: Nginx Reverse Proxy và HTTPS

---

### 1. Giai đoạn 2 em đã làm gì?

Ở Giai đoạn 2, em triển khai Nginx làm Reverse Proxy cho hệ thống Nhà Hàng Maison Xuan.

Nginx tiếp nhận yêu cầu từ trình duyệt, xử lý kết nối HTTPS và chuyển tiếp yêu cầu đến backend Express.

Em cũng cấu hình các HTTP Security Headers để tăng cường bảo vệ ứng dụng. Chức năng quản lý nhà hàng và dữ liệu PostgreSQL vẫn được giữ nguyên.

---

### 2. Nginx là gì?

Nginx là phần mềm máy chủ web. Trong dự án này, Nginx đóng vai trò trung gian giữa người sử dụng và backend Express.

Khi nhân viên mở website, yêu cầu được gửi đến Nginx trước, sau đó Nginx chuyển yêu cầu đến Express để xử lý.

**Ví dụ:**

Nhân viên → Nginx → Express → PostgreSQL.

Express xử lý nghiệp vụ tạo đơn hàng, PostgreSQL lưu dữ liệu. Nginx không trực tiếp tạo đơn hàng.

---

### 3. Tại sao cần Nginx? Không có thì sao?

Website vẫn hoạt động nếu không có Nginx.

Tuy nhiên, khi triển khai hệ thống, Nginx giúp:
- Quản lý cổng truy cập vào website.
- Cấu hình HTTPS để mã hóa dữ liệu truyền qua mạng.
- Bổ sung một số HTTP Security Headers.
- Ghi nhật ký truy cập để hỗ trợ kiểm tra sự cố.
- Có khả năng phân phối yêu cầu đến nhiều backend nếu hệ thống mở rộng trong tương lai.

**Nếu bỏ Nginx trong dự án hiện tại:**

Website vẫn có thể chạy trực tiếp qua Express tại `http://localhost:5000`, nhưng các địa chỉ truy cập thông qua Nginx sẽ không hoạt động. Hệ thống cũng mất những chức năng HTTPS và bảo mật do Nginx đang đảm nhiệm, nếu không có công cụ khác thay thế.

Nginx không bắt buộc để xây dựng website, nhưng hữu ích cho việc triển khai và quản trị hệ thống.

---

### 4. Reverse Proxy là gì?

Reverse Proxy là cơ chế máy chủ trung gian nhận yêu cầu từ người dùng rồi chuyển tiếp đến máy chủ ứng dụng phía sau.

Trong dự án:

Trình duyệt → Nginx → Express.

Ví dụ: Nhân viên nhấn **Tạo đơn hàng**. Nginx chuyển yêu cầu đến Express. Express xử lý và lưu đơn vào PostgreSQL.

---

### 5. HTTP và HTTPS khác nhau thế nào?

HTTP là giao thức giúp trình duyệt và máy chủ trao đổi thông tin.

HTTPS sử dụng TLS để mã hóa dữ liệu khi truyền qua mạng.

- **HTTP:** Nội dung trao đổi không được HTTP tự mã hóa.
- **HTTPS:** Nội dung được mã hóa trong quá trình truyền, giúp giảm nguy cơ bị nghe lén hoặc sửa đổi.

HTTPS không bắt buộc phải dùng Nginx. Tuy nhiên, trong dự án này, em sử dụng Nginx để quản lý kết nối HTTPS.

---

### 6. Có HTTPS thì website còn bị hacker tấn công không?

Có.

HTTPS chủ yếu bảo vệ dữ liệu trên đường truyền, không đảm bảo toàn bộ website an toàn.

Website vẫn có thể bị tấn công thông qua:
- SQL Injection: Khai thác lỗi xử lý truy vấn cơ sở dữ liệu.
- XSS: Chèn mã độc vào trang web.
- Lỗi đăng nhập và phân quyền.
- Lỗ hổng trong backend hoặc thư viện.

Vì vậy, HTTPS cần được kết hợp với các biện pháp bảo mật khác.

---

### 7. SSL/TLS Certificate là gì?

Chứng chỉ TLS là chứng chỉ số được máy chủ sử dụng trong quá trình thiết lập kết nối HTTPS, giúp trình duyệt xác minh danh tính máy chủ khi chứng chỉ hợp lệ và đáng tin cậy.

Trong dự án, em sử dụng chứng chỉ tự ký (*self-signed certificate*) để thực hành HTTPS trên localhost.

Vì chứng chỉ này không được trình duyệt tin cậy mặc định nên Chrome có thể hiển thị cảnh báo bảo mật.

Điều đó không đồng nghĩa HTTPS không mã hóa dữ liệu, nhưng chứng chỉ tự ký không cung cấp mức xác thực danh tính như chứng chỉ hợp lệ từ tổ chức cấp chứng chỉ đáng tin cậy.

---

### 8. HTTP Security Headers là gì?

HTTP Security Headers là những thông tin máy chủ gửi cho trình duyệt để yêu cầu áp dụng một số quy tắc bảo vệ.

Trong dự án, em đã cấu hình:

- `X-Content-Type-Options: nosniff` — Hạn chế trình duyệt tự suy đoán kiểu nội dung.
- `X-Frame-Options: SAMEORIGIN` — Hạn chế website bị nhúng vào trang web thuộc nguồn khác.
- `Referrer-Policy: strict-origin-when-cross-origin` — Kiểm soát thông tin nguồn truy cập được gửi đi.
- `Content-Security-Policy` — Giới hạn các nguồn nội dung mà trình duyệt được phép tải hoặc thực thi theo chính sách cấu hình.

Các header này hỗ trợ giảm một số rủi ro bảo mật, nhưng không chống được mọi cuộc tấn công.

---

### 9. Giai đoạn 2 đã triển khai những gì?

- Nginx chạy trong container Docker riêng.
- Cấu hình Reverse Proxy đến Express.
- Truy cập HTTP qua cổng `8088`.
- Truy cập HTTPS qua cổng `8443`.
- Chứng chỉ HTTPS tự ký phục vụ thực hành.
- Bổ sung các HTTP Security Headers.
- Giữ nguyên chức năng quản lý nhà hàng và dữ liệu PostgreSQL.

---

### 10. Hướng dẫn demo Giai đoạn 2

**Bước 1:** Mở PowerShell tại thư mục dự án và chạy:
```powershell
docker compose ps
```
Giới thiệu container `nhahang_nginx` đang hoạt động cùng Express, PostgreSQL và pgAdmin.

**Bước 2:** Mở `http://localhost:5000`.  
Giải thích đây là cách truy cập trực tiếp backend Express trong cấu hình hiện tại.

**Bước 3:** Mở `http://localhost:8088`.  
Giải thích yêu cầu hiện được chuyển qua Nginx trước khi đến Express.

**Bước 4:** Mở `https://localhost:8443`.  
Giới thiệu kết nối HTTPS. Nếu Chrome cảnh báo chứng chỉ, giải thích đây là chứng chỉ tự ký dùng để thực hành trên localhost.

**Bước 5:** Kiểm tra website vẫn hiển thị món ăn, bàn ăn và đơn hàng như trước.

**Bước 6:** Nếu cần minh chứng Security Headers, chạy:
```powershell
curl.exe -I http://localhost:8088/
```
Chỉ ra các header bảo mật trong kết quả trả về.

---

### 11. Câu hỏi giảng viên có thể hỏi

- **Hỏi: Nếu không có Nginx, website có chạy không?**  
  *Đáp:* Có. Express vẫn có thể phục vụ website trực tiếp. Nginx giúp bổ sung lớp trung gian để quản lý truy cập, HTTPS và một số quy tắc bảo mật.

- **Hỏi: Nginx có thay thế Express không?**  
  *Đáp:* Không. Express xử lý nghiệp vụ nhà hàng, còn Nginx tiếp nhận và chuyển tiếp yêu cầu.

- **Hỏi: Reverse Proxy là gì?**  
  *Đáp:* Là máy chủ trung gian nhận yêu cầu từ người dùng rồi chuyển đến máy chủ ứng dụng phía sau.

- **Hỏi: HTTPS có ngăn được hacker không?**  
  *Đáp:* HTTPS giúp bảo vệ dữ liệu trên đường truyền nhưng không ngăn được mọi cuộc tấn công như SQL Injection, XSS hoặc lỗi phân quyền.

- **Hỏi: Tại sao Chrome báo Not secure dù dùng HTTPS?**  
  *Đáp:* Vì dự án sử dụng chứng chỉ tự ký, chưa được trình duyệt tin cậy mặc định. Chứng chỉ này phục vụ thực hành trên localhost.

- **Hỏi: Nginx có làm website nhanh hơn không?**  
  *Đáp:* Nginx có thể hỗ trợ tối ưu hiệu năng thông qua các cơ chế như caching hoặc cân bằng tải, nhưng trong dự án này em chưa kiểm thử để khẳng định website chạy nhanh hơn.

- **Hỏi: Tại sao phải dùng Nginx khi Express cũng có thể phục vụ HTTPS?**  
  *Đáp:* Vì Nginx giúp tách phần quản lý truy cập và HTTPS khỏi phần xử lý nghiệp vụ, thuận tiện hơn khi quản trị và mở rộng hệ thống.

---

### 12. Tổng kết Giai đoạn 2

Giai đoạn 1 giúp Nhà Hàng Maison Xuan có một website hoạt động với Express và PostgreSQL.

Giai đoạn 2 bổ sung Nginx làm Reverse Proxy, cấu hình HTTPS và HTTP Security Headers để hỗ trợ quản lý, bảo vệ kết nối truy cập vào website.

Nginx không thay đổi nghiệp vụ nhà hàng mà tập trung vào phần triển khai và quản trị hệ thống.
