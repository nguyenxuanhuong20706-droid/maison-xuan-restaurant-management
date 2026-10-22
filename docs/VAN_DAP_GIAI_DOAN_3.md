# NHÀ HÀNG MAISON XUAN
## Ghi chú vấn đáp — Giai đoạn 3: Giám sát Hệ thống với Prometheus và Grafana

---

### 1. Giai đoạn 3 em đã làm gì?

Ở Giai đoạn 3, em triển khai giải pháp giám sát toàn diện (*monitoring*) cho hệ thống Nhà Hàng Maison Xuan bằng cách tích hợp **Prometheus** và **Grafana** vào Docker Compose.

Cụ thể:
1. **Phía ứng dụng Express (`nhahang_web`):** Cài đặt thư viện `prom-client`, tạo middleware ghi nhận lưu lượng HTTP, thời gian phản hồi (latency), mã trạng thái (status code), tài nguyên Node.js runtime (CPU, RAM, Event Loop) và trích xuất chỉ số nghiệp vụ nhà hàng (số món ăn, số bàn theo trạng thái, số đơn hàng). Toàn bộ dữ liệu được công khai chuẩn hóa tại endpoint `/metrics`.
2. **Phía cơ sở dữ liệu (`nhahang_postgres`):** Triển khai container `nhahang_postgres_exporter` thu thập số kết nối active, tỷ lệ commit/rollback giao dịch và cache hit ratio.
3. **Phía cổng vào (`nhahang_nginx`):** Kích hoạt `stub_status` nội bộ và triển khai `nhahang_nginx_exporter` để đo lường kết nối active và tổng số request đi qua Nginx.
4. **Phía Prometheus (`nhahang_prometheus` - cổng 9091):** Cấu hình tự động thu thập định kỳ (chu kỳ 5 giây) từ 4 targets (`nhahang_web`, `nhahang_postgres`, `nhahang_nginx`, `prometheus`), cả 4 target đều ở trạng thái `UP`.
5. **Phía Grafana (`nhahang_grafana` - cổng 3001):** Tự động liên kết datasource Prometheus và nạp Dashboard trực quan hóa toàn bộ số liệu thời gian thực.

**Câu trả lời ngắn gọn khi bắt đầu thuyết trình:**
> *"Ở Giai đoạn 3, em xây dựng hệ thống giám sát thời gian thực bằng bộ công cụ tiêu chuẩn công nghiệp Prometheus và Grafana. Hệ thống tự động thu thập số liệu thực tế từ mã nguồn Express, cơ sở dữ liệu PostgreSQL và máy chủ Nginx qua các exporter, sau đó hiển thị trực quan lên Grafana Dashboard mà không dùng dữ liệu giả lập."*

---

### 2. Prometheus là gì? Hoạt động theo cơ chế nào?

**Prometheus** là hệ thống mã nguồn mở chuyên về thu thập, lưu trữ và cảnh báo số liệu hiệu năng hệ thống (*time-series metrics*).

Prometheus hoạt động chủ yếu theo cơ chế **Kéo (Pull Model)**:
- Định kỳ theo chu kỳ cấu hình (trong dự án là mỗi 5 giây), Prometheus chủ động gửi HTTP request đến endpoint `/metrics` của các dịch vụ để lấy dữ liệu về.
- Dữ liệu thu thập được lưu trữ vào cơ sở dữ liệu chuỗi thời gian (TSDB) của Prometheus kèm mốc thời gian (*timestamp*).

**Khác biệt giữa cơ chế Pull (Prometheus) và Push:**
- **Pull:** Prometheus chủ động kiểm soát tần suất lấy tin, dịch vụ gặp sự cố không bị nghẽn gửi gói tin ra ngoài, Prometheus dễ dàng phát hiện khi một target bị chết (`up == 0`).
- **Push:** Ứng dụng phải tự chủ động gửi dữ liệu lên máy chủ giám sát.

---

### 3. Grafana là gì? Tại sao cần cả Prometheus và Grafana?

- **Prometheus** mạnh về thu thập, lưu trữ số liệu chuỗi thời gian và xử lý ngôn ngữ truy vấn **PromQL**. Tuy nhiên, giao diện mặc định của Prometheus rất đơn sơ, không tối ưu cho việc quan sát trực quan bảng điều khiển.
- **Grafana** là nền tảng chuyên về trực quan hóa dữ liệu (Visualization) hàng đầu hiện nay. Grafana không tự lưu trữ số liệu hiệu năng mà đóng vai trò truy vấn dữ liệu từ Prometheus (Data Source) để vẽ thành các biểu đồ kim đồng hồ (Gauge), biểu đồ đường (Time Series), thẻ trạng thái (Stat panel) và bảng phân tích.

**Nếu bỏ Grafana:**
Hệ thống vẫn được giám sát và lưu trữ số liệu trong Prometheus, người quản trị vẫn có thể gõ câu lệnh PromQL thủ công để tra cứu, nhưng thiếu bảng điều khiển tập trung sinh động để vận hành hằng ngày.

---

### 4. Exporter là gì? Trong dự án có những Exporter nào?

**Exporter** là một dịch vụ phụ trợ (*agent*) có nhiệm vụ đọc các thông số nội bộ của một phần mềm (vốn không hỗ trợ sẵn chuẩn Prometheus), chuyển đổi các thông số đó thành định dạng văn bản chuẩn Prometheus và mở endpoint `/metrics` cho Prometheus kéo dữ liệu.

Trong dự án Maison Xuan, em sử dụng 3 nguồn cung cấp metrics:
1. **Ứng dụng Node.js Express:** Tích hợp trực tiếp thư viện `prom-client` vào mã nguồn, tự mở endpoint `/metrics` trên cổng 5000 (không cần exporter riêng).
2. **`nhahang_postgres_exporter` (cổng nội bộ 9187):** Kết nối vào PostgreSQL để lấy các chỉ số như số kết nối đang mở, số khối dữ liệu đọc từ cache/ổ đĩa, số giao dịch thành công.
3. **`nhahang_nginx_exporter` (cổng nội bộ 9113):** Kết nối vào endpoint `/stub_status` của Nginx để lấy số lượng kết nối client và tổng request Nginx đã tiếp nhận.

---

### 5. `prom-client` là gì? Endpoint `/metrics` hoạt động ra sao?

`prom-client` là thư viện chính thức và phổ biến nhất của Node.js để tạo số liệu chuẩn Prometheus.

Khi người dùng thao tác trên website hoặc gọi API:
1. Middleware `metricsMiddleware` trong tệp [metrics.js](file:///C:/Users/HUONG/Documents/NhaHang/src/metrics.js) ghi nhận phương thức HTTP (`GET`, `POST`...), đường dẫn API (`/api/dishes`), mã trạng thái (`200`, `400`...) và đo chính xác thời gian xử lý bằng hàm `process.hrtime()`.
2. Khi Prometheus gọi vào `GET /metrics`, ứng dụng thực hiện truy vấn nhanh số lượng món, bàn và đơn hàng từ PostgreSQL, cập nhật vào các biến Gauge, sau đó trả về toàn bộ danh sách chỉ số theo định dạng chuẩn:
   ```text
   # HELP nhahang_http_requests_total Tong so luong request HTTP da xu ly
   # TYPE nhahang_http_requests_total counter
   nhahang_http_requests_total{method="GET",route="/api/dishes/",status_code="200"} 13
   ```

---

### 6. 4 loại Metric cơ bản trong Prometheus và ví dụ trong Maison Xuan

| Loại Metric | Định nghĩa | Hành vi giá trị | Ứng dụng thực tế trong dự án |
|---|---|---|---|
| **Counter** | Đại lượng đếm tích lũy | Chỉ tăng, chỉ về 0 khi ứng dụng khởi động lại | `nhahang_http_requests_total`: Đếm tổng số request đã xử lý từ lúc server bật. |
| **Gauge** | Đại lượng đo lường tức thời | Có thể tăng lên hoặc giảm xuống bất kỳ lúc nào | • `nhahang_tables_count{status="occupied"}`: Số bàn đang có khách.<br>• `nhahang_dishes_total`: Tổng số món trong thực đơn.<br>• `pg_stat_activity_count`: Số kết nối vào DB.<br>• `nhahang_nodejs_process_resident_memory_bytes`: Dung lượng RAM Node.js đang chiếm. |
| **Histogram** | Đo phân bố dữ liệu và gom vào các nhóm phạm vi (*buckets*) | Cho phép tính toán bách phân vị (Percentile) | `nhahang_http_request_duration_seconds`: Đo thời gian phản hồi của request để tính độ trễ P50, P95. |
| **Summary** | Tương tự Histogram nhưng tính toán percentile trực tiếp phía client | Ít dùng hơn khi có nhiều instances | Thường dùng cho các phép đo yêu cầu cố định percentile ngay tại client. |

---

### 7. Tại sao lại cần Giám sát (Monitoring)? Không có thì sao?

- **Khi không có Monitoring:** Quản trị viên chỉ biết hệ thống bị lỗi khi người dùng (nhân viên phục vụ, khách hàng) phàn nàn rằng website bị đơ, không tạo được đơn hàng. Ta không thể biết lúc đó máy chủ đang nghẽn CPU, hết RAM, nghẽn kết nối Database hay Nginx bị quá tải.
- **Khi có Monitoring:**
  - Phát hiện sớm hiện tượng bất thường (ví dụ: thời gian phản hồi tăng vọt từ 20ms lên 500ms, tỷ lệ mã lỗi 500 tăng đột biến).
  - Lập kế hoạch tài nguyên (biết khi nào cần nâng cấp phần cứng hoặc mở rộng thêm replica backend).
  - Đánh giá hoạt động kinh doanh (biết khung giờ cao điểm có bao nhiêu bàn đang phục vụ, lưu lượng truy cập cao nhất vào lúc nào).

---

### 8. Dữ liệu trên Dashboard có phải số liệu giả (fake/mock) không?

**Tuyệt đối không.** Toàn bộ dữ liệu hiển thị trên Dashboard là dữ liệu sống thực tế được đo lường tự động:
- Chỉ số món ăn (`13 món`) lấy trực tiếp từ bảng `dishes` trong PostgreSQL.
- Chỉ số bàn ăn (`2 bàn trống, 1 bàn có khách, 3 bàn đặt trước`) khớp chính xác 100% với trạng thái bảng `tables`.
- Lưu lượng HTTP chỉ tăng khi thực sự có người gửi request vào Nginx hoặc Express.
- RAM/CPU phản ánh tài nguyên thực tế của tiến trình container trên Docker.

---

### 9. Kịch bản từng bước Demo cho Giảng viên xem (Thời lượng 2-3 phút)

Khi thầy cô yêu cầu demo Giai đoạn 3, bạn thực hiện theo 4 bước sau:

#### Bước 1: Mở Prometheus Targets (Chứng minh hệ thống kết nối thông suốt)
- Mở trình duyệt truy cập: [http://localhost:9091/targets](http://localhost:9091/targets)
- **Nói:** *"Thưa thầy/cô, đây là danh sách 4 targets giám sát của hệ thống gồm Web App, Postgres Exporter, Nginx Exporter và bản thân Prometheus. Cả 4 dịch vụ đều đang hiển thị trạng thái `UP` (màu xanh), không có bất kỳ lỗi scrape nào."*

#### Bước 2: Mở Grafana Dashboard (Giới thiệu các thành phần)
- Mở trình duyệt truy cập: [http://localhost:3001/d/maison-xuan-overview](http://localhost:3001/d/maison-xuan-overview) (Tài khoản: `admin` / `Admin@NhaHang2026`)
- **Nói:** *"Em đã cấu hình tự động provisioning Data Source và Dashboard Maison Xuan gồm 3 phần:
  1. Hàng trên cùng: Trạng thái sống còn của 3 dịch vụ chính và các chỉ số nghiệp vụ nhà hàng (13 món ăn, 2 bàn trống, 1 bàn có khách, 1 đơn phục vụ).
  2. Hàng thứ hai: Đo lường hiệu năng Web App gồm lưu lượng Requests/giây theo mã HTTP, độ trễ P95/P50 tính bằng giây, biểu đồ cột phân bố theo API Endpoint và tiêu thụ RAM.
  3. Hàng thứ ba: Số kết nối active và giao dịch Commit của PostgreSQL, cùng với lưu lượng truy cập qua Nginx Reverse Proxy."*

#### Bước 3: Tạo thao tác thực tế trên Website để biểu đồ nhảy số
- Mở tab mới: [https://localhost:8443/](https://localhost:8443/)
- Thực hiện bấm gọi món, chuyển tab thực đơn vài lần hoặc mở PowerShell gõ một lệnh curl tạo tải:
  ```powershell
  1..20 | ForEach-Object { curl.exe -k -s https://localhost:8443/api/dishes > $null }
  ```
- Quay lại Grafana Dashboard: Chỉ số **"Lưu lượng yêu cầu HTTP"** và **"Nginx Requests / Giây"** lập tức nhảy vọt lên đồ thị.
- **Nói:** *"Biểu đồ lập tức phản ánh 20 request em vừa gửi qua cổng Nginx HTTPS, chứng minh dữ liệu hoàn toàn đo lường thực tế theo thời gian thực."*

---

### 10. Các câu hỏi vặn thường gặp của Thầy Cô & Gợi ý trả lời

**Câu hỏi 1: Tại sao em lại dùng cổng 9091 và 3001 thay vì cổng mặc định 9090 và 3000?**
> *Trả lời:* "Dạ thưa thầy/cô, máy tính phát triển của em từng chạy các bài thực hành trước đó sử dụng cổng 3000. Để đảm bảo tính độc lập tuyệt đối của dự án Nhà Hàng Maison Xuan, tránh xung đột cổng và không làm gián đoạn các dịch vụ khác, em đã cấu hình ánh xạ cổng Host riêng biệt: Prometheus dùng cổng 9091 và Grafana dùng cổng 3001, các biến cổng này được quản lý tập trung trong file `.env`."

**Câu hỏi 2: Độ trễ P95 (95th Percentile) có ý nghĩa gì hơn giá trị trung bình (Average Latency)?**
> *Trả lời:* "Dạ thưa thầy/cô, giá trị trung bình rất dễ bị bóp méo nếu phần lớn request nhanh nhưng có một vài request của khách hàng bị đơ rất lâu. Độ trễ P95 cho biết 95% số request của người dùng có thời gian xử lý nhanh hơn ngưỡng này, chỉ có 5% request chậm nhất nằm phía trên. Đây là chỉ số chuẩn trong SLA để đo lường trải nghiệm thực tế của phần lớn người dùng."

**Câu hỏi 3: Nếu container Prometheus bị tắt đi khởi động lại, dữ liệu biểu đồ có bị mất không?**
> *Trả lời:* "Dạ không bị mất, vì trong Docker Compose em đã cấu hình Docker Named Volume `nhahang_prometheus_data` gắn vào thư mục `/prometheus` và `nhahang_grafana_data` gắn vào `/var/lib/grafana`. Dữ liệu chuỗi thời gian TSDB được lưu trên ổ cứng bền vững độc lập với vòng đời của container."

**Câu hỏi 4: Khi tạo thêm món ăn mới trong website, Prometheus có cập nhật số món mới không?**
> *Trả lời:* "Dạ có. Cứ mỗi 5 giây khi Prometheus scrape endpoint `/metrics`, hàm `updateBusinessMetrics()` sẽ truy vấn lại bảng `dishes` và cập nhật giá trị vào biến Gauge `nhahang_dishes_total`. Do đó ngay khi thêm món mới, chỉ số trên Grafana sẽ tự động tăng lên sau vài giây."
