# NHÀ HÀNG MAISON XUAN
## Ghi chú vấn đáp — Giai đoạn 4: Thu thập Nhật ký Tập trung với Loki và Promtail

---

### 1. Giai đoạn 4 em đã làm gì?

Ở Giai đoạn 4, em triển khai giải pháp **Quản trị và Thu thập Nhật ký Tập trung (Centralized Logging)** cho toàn bộ hệ thống Nhà Hàng Maison Xuan bằng cách tích hợp **Grafana Loki** và **Promtail** vào Docker Compose.

Cụ thể:
1. **Triển khai Loki (`nhahang_loki` - Cổng host 3101):** Hệ thống lưu trữ và đánh chỉ mục log tập trung siêu nhẹ, thiết kế tối ưu theo nhãn (labels). Dữ liệu log được lưu bền vững trong Docker volume `nhahang_loki_data`.
2. **Triển khai Promtail (`nhahang_promtail`):** Đóng vai trò Log Shipper (đại lý thu thập), tự động gom log từ 2 nguồn:
   - File log của Nginx Reverse Proxy (`access_http.log`, `access_ssl.log`, `error_http.log`, `error_ssl.log`) thông qua volume `nhahang_nginx_logs`.
   - Luồng log container (`stdout`/`stderr`) của ứng dụng Express (`nhahang_web`), cơ sở dữ liệu (`nhahang_postgres`), pgAdmin và Nginx thông qua Docker socket (`/var/run/docker.sock`).
3. **Bổ sung Logging Middleware trong Express:** Ghi nhận có cấu trúc mọi yêu cầu HTTP với mốc thời gian, cấp độ log (`INFO`, `WARN`, `ERROR`), method, URL, mã phản hồi HTTP và thời gian xử lý (ms).
4. **Tích hợp vào Grafana ([http://localhost:3001](http://localhost:3001)):** Tự động liên kết Loki thành Data Source bổ sung (song song cùng Prometheus từ Giai đoạn 3). Người quản trị có thể tra cứu và phân tích log trực tiếp trong giao diện **Grafana Explore**.
5. **Kiểm chứng 3 câu truy vấn LogQL thực tế:** Gồm truy vấn log Express, log truy cập Nginx, và bộ lọc log cảnh báo / mã lỗi HTTP 4xx.

**Câu trả lời ngắn gọn khi bắt đầu thuyết trình:**
> *"Ở Giai đoạn 4, em hoàn thiện mảnh ghép quan sát toàn diện (Observability) bằng việc triển khai hệ thống Centralized Logging với Loki và Promtail. Toàn bộ nhật ký từ ứng dụng Web Express, Reverse Proxy Nginx và PostgreSQL được Promtail tự động thu thập theo thời gian thực và đẩy về Loki. Người quản trị có thể dùng ngôn ngữ LogQL trên Grafana Explore để truy vết nhanh các sự cố và mã lỗi mà không cần phải SSH vào từng container."*

---

### 2. Log là gì? Tại sao cần Hệ thống Log tập trung (Centralized Logging)?

- **Log (Nhật ký sự kiện):** Là dòng thông tin ghi lại các hành động, trạng thái hoặc sự cố diễn ra bên trong ứng dụng và máy chủ tại một thời điểm nhất định (ví dụ: *"Nhân viên gọi món cho Bàn 01"*, *"Lỗi không tìm thấy trang 404"*, *"Database khởi động thành công"*).
- **Vấn đề khi chưa có Log tập trung:** Trong môi trường Microservices hoặc Docker nhiều container, mỗi dịch vụ lưu log ở một nơi khác nhau (container stdout, file access log trong Nginx, file log trong PostgreSQL). Khi xảy ra sự cố, người quản trị phải gõ lệnh `docker logs` cho từng container riêng rẽ, không thể ghép nối luồng sự kiện theo trình tự thời gian và rất khó tìm nguyên nhân.
- **Lợi ích của Log tập trung (Centralized Logging):**
  - **Tất cả log về một mối:** Gom toàn bộ log của Nginx, Node.js, PostgreSQL vào cơ sở dữ liệu Loki duy nhất.
  - **Tra cứu và tìm kiếm tức thì:** Dùng ngôn ngữ LogQL để lọc theo thời gian, theo mã lỗi (`404`, `500`), theo địa chỉ IP hoặc theo tên dịch vụ.
  - **Tương quan Metric và Log (Metrics + Logs correlation):** Khi Grafana Dashboard báo độ trễ tăng vọt (Metric), người quản trị có thể nhảy sang Grafana Explore mở đúng khung giờ đó để đọc log chi tiết (Log).

---

### 3. Vai trò của Loki, Promtail, Grafana và LogQL

| Thành phần | Vai trò kỹ thuật trong Maison Xuan |
|---|---|
| **Promtail** | **Log Collector / Shipper:** Đọc file log từ volume Nginx và đọc luồng stream container qua Docker socket, gắn các nhãn siêu dữ liệu (`service`, `container`, `stream`), sau đó đẩy qua HTTP POST `/loki/api/v1/push` về Loki. |
| **Loki** | **Log Aggregation Server:** Nhận log từ Promtail, chỉ đánh chỉ mục (*indexing*) trên các nhãn (labels) giống như Prometheus, không lập chỉ mục toàn văn (full-text index) giúp tiết kiệm 80% RAM và dung lượng ổ cứng so với Elasticsearch. |
| **Grafana** | **Visualization & Explore:** Giao diện tra cứu tập trung. Cung cấp tính năng **Explore** để gõ các câu lệnh LogQL, xem biểu đồ tần suất log và danh sách bản ghi theo thời gian thực. |
| **LogQL** | **Log Query Language:** Ngôn ngữ truy vấn chuyên dụng của Loki (cú pháp tương đồng PromQL), hỗ trợ lọc luồng log theo nhãn và lọc nội dung log theo chuỗi hoặc biểu thức chính quy. |

---

### 4. 3 Câu Truy Vấn LogQL Thực Tế Đã Kiểm Chứng

Dưới đây là 3 câu truy vấn chuẩn bài thi đã được xác minh trên hệ thống thực tế:

#### Câu 1: Truy vấn toàn bộ log của Ứng dụng Web Express
- **Câu lệnh LogQL:**
  ```logql
  {service="nhahang_web"}
  ```
- **Mục đích:** Xem toàn bộ nhật ký nghiệp vụ của Node.js Express, bao gồm thời điểm khởi động server, kết nối DB và các request nhân viên gọi món.
- **Kết quả thực tế thu được:**
  ```text
  [2026-10-22T17:24:00.055Z] [INFO] [nhahang_web] GET /api/orders 200 14ms - IP: 172.20.0.5
  [2026-10-22T17:23:59.989Z] [INFO] [nhahang_web] GET /api/tables 200 6ms - IP: 172.20.0.5
  [2026-10-22T17:23:59.927Z] [INFO] [nhahang_web] GET /api/dishes 200 4ms - IP: 172.20.0.5
  ```

#### Câu 2: Truy vấn nhật ký truy cập Nginx Reverse Proxy
- **Câu lệnh LogQL:**
  ```logql
  {service="nhahang_nginx"}
  ```
- **Mục đích:** Theo dõi mọi kết nối HTTP và HTTPS đi qua cổng Nginx Gateway, bao gồm địa chỉ IP client, User-Agent và mã HTTP.
- **Kết quả thực tế thu được:**
  ```text
  172.20.0.1 - - [22/Oct/2026:17:24:00 +0000] "GET /api/dishes HTTP/1.1" 200 1205 "-" "curl/8.21.0"
  172.20.0.1 - - [22/Oct/2026:17:24:00 +0000] "GET /api/tables HTTP/1.1" 200 412 "-" "curl/8.21.0"
  ```

#### Câu 3: Lọc và phát hiện các yêu cầu lỗi hoặc mã HTTP 4xx / 5xx
- **Câu lệnh LogQL:**
  ```logql
  {service="nhahang_web"} |= "WARN"
  ```
  *(Hoặc lọc trên toàn bộ hệ thống: `{service=~"nhahang_web|nhahang_nginx"} |~ "404|500|WARN|ERROR"`)*
- **Mục đích:** Phát hiện các truy cập vào đường dẫn không tồn tại (quét lỗ hổng hoặc gõ sai URL) hoặc lỗi xử lý backend.
- **Kết quả thực tế thu được khi gửi request kiểm thử an toàn:**
  ```text
  [2026-10-22T17:24:00.189Z] [WARN] [nhahang_web] GET /api/test-route-not-found 404 2ms - IP: 172.20.0.5
  [2026-10-22T17:24:00.132Z] [WARN] [nhahang_web] GET /api/unknown-endpoint-demo-404 404 3ms - IP: 172.20.0.5
  ```

---

### 5. Hướng Dẫn Từng Bước Demo Cho Giảng Viên (Thời Lượng 2-3 Phút)

Khi thầy cô yêu cầu demo Giai đoạn 4, bạn thực hiện lần lượt theo 4 bước sau:

#### Bước 1: Mở Grafana Explore
- Truy cập Grafana: [http://localhost:3001](http://localhost:3001)
- Ở thanh menu bên trái, nhấn biểu tượng la bàn **Explore** (hoặc truy cập trực tiếp: [http://localhost:3001/explore](http://localhost:3001/explore)).
- Ở góc trên bên trái, chọn Data Source là **Loki**.
- **Nói:** *"Thưa thầy/cô, hệ thống Grafana của em đã tích hợp cả 2 Data Source: Prometheus cho số liệu hiệu năng (Metrics) và Loki cho nhật ký tập trung (Logs)."*

#### Bước 2: Chạy câu lệnh LogQL xem log Web App & Nginx
- Nhập câu lệnh: `{service="nhahang_web"}` rồi nhấn nút **Run query** (hoặc Shift + Enter).
- **Nói:** *"Đây là luồng log trực tiếp của Node.js Express. Từng request đều ghi rõ thời gian ISO, cấp độ INFO, đường dẫn API và thời gian phản hồi miligiây."*
- Đổi sang câu lệnh: `{service="nhahang_nginx"}` rồi nhấn **Run query**.
- **Nói:** *"Đây là log truy cập của Nginx Reverse Proxy được Promtail thu thập trực tiếp từ file log."*

#### Bước 3: Tạo lỗi an toàn trên Website và bắt log tức thì
- Mở một tab PowerShell và chạy lệnh gửi một request vào đường dẫn không tồn tại:
  ```powershell
  curl.exe -k -s https://localhost:8443/api/demo-giang-vien-kiem-tra-404
  ```
- Quay lại Grafana Explore, nhập câu lệnh lọc lỗi:
  ```logql
  {service="nhahang_web"} |= "404"
  ```
  Nhấn **Run query**.
- **Nói:** *"Dòng log cảnh báo 404 với đường dẫn `demo-giang-vien-kiem-tra-404` vừa xuất hiện ngay lập tức trong Loki, chứng minh hệ thống bắt log thời gian thực và lọc lỗi chính xác."*

---

### 6. Các Câu Hỏi Vấn Đáp Thường Gặp Của Thầy Cô

**Câu hỏi 1: Tại sao em dùng Loki thay vì Elasticsearch (ELK Stack)?**
> *Trả lời:* "Dạ thưa thầy/cô, ELK Stack (Elasticsearch, Logstash, Kibana) rất mạnh nhưng tiêu tốn rất nhiều RAM (thường cần tối thiểu 4GB–8GB RAM) vì Elasticsearch phải lập chỉ mục toàn văn (full-text index) cho mọi từ trong log. Trong khi đó, Grafana Loki được thiết kế lấy cảm hứng từ Prometheus: chỉ đánh chỉ mục theo nhãn (metadata labels) và nén nội dung log thành các khối (chunks). Nhờ đó, Loki chạy rất nhẹ (chỉ tốn vài chục MB RAM), hoàn toàn phù hợp để đóng gói và vận hành trong đồ án môn học lẫn môi trường doanh nghiệp vừa và nhỏ."

**Câu hỏi 2: Sự khác nhau giữa Prometheus và Loki là gì?**
> *Trả lời:*
> - **Prometheus** thu thập **Metrics** (số liệu chuỗi thời gian dạng số, ví dụ: 20 request/giây, 150MB RAM).
> - **Loki** thu thập **Logs** (nhật ký sự kiện dạng văn bản, ví dụ: *"User gọi món Toboki lúc 10:15"*).
> Cả hai bổ trợ cho nhau: Khi Prometheus cảnh báo có đột biến lỗi, quản trị viên mở Loki để đọc nội dung chi tiết của lỗi đó.

**Câu hỏi 3: Cấu trúc nhãn (Labels) trong Promtail được thiết lập như thế nào?**
> *Trả lời:* "Trong file cấu hình Promtail, em sử dụng `docker_sd_configs` kết hợp `relabel_configs` để tự động đọc tên container từ Docker socket và trích xuất thành nhãn `service` (ví dụ: `nhahang_web`, `nhahang_nginx`, `nhahang_postgres`) và nhãn `stream` (`stdout`/`stderr`). Đối với Nginx, Promtail đọc trực tiếp file log từ volume dùng nhãn `job=nhahang_nginx`. Nhờ đó, khi truy vấn LogQL chỉ cần lọc theo `{service="..."}` là có thể tách biệt log của từng dịch vụ dễ dàng."
