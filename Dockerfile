# Sử dụng hình ảnh Node.js phiên bản LTS Alpine gọn nhẹ và bảo mật
FROM node:20-alpine

# Thiết lập thư mục làm việc trong container
WORKDIR /usr/src/app

# Sao chép các tệp định nghĩa phụ thuộc trước để tận dụng Docker layer cache
COPY package*.json ./

# Cài đặt các thư viện sản xuất
RUN npm install --omit=dev

# Sao chép toàn bộ mã nguồn vào container và phân quyền cho người dùng node
COPY --chown=node:node . .

# Chuyển sang người dùng non-root 'node' (UID 1000) nhằm giảm thiểu đặc quyền bảo mật
USER node

# Khai báo cổng ứng dụng lắng nghe
EXPOSE 5000

# Lệnh khởi chạy ứng dụng
CMD ["node", "src/index.js"]
