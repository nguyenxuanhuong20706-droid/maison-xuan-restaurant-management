const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDatabase } = require('./initDb');
const { register, metricsMiddleware, updateBusinessMetrics } = require('./metrics');
const dishesRouter = require('./routes/dishes');
const tablesRouter = require('./routes/tables');
const ordersRouter = require('./routes/orders');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Metrics middleware (ghi nhận số lượng request, thời gian xử lý, mã phản hồi)
app.use(metricsMiddleware);

// Phục vụ giao diện tĩnh
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint (rất hữu ích cho Docker & monitoring)
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'NhaHang Management System',
  });
});

// Endpoint phục vụ Prometheus scrape metrics
app.get('/metrics', async (req, res) => {
  try {
    await updateBusinessMetrics();
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    console.error('Lỗi khi xuất metrics:', error);
    res.status(500).end(error.message);
  }
});

// API Routes
app.use('/api/dishes', dishesRouter);
app.use('/api/tables', tablesRouter);
app.use('/api/orders', ordersRouter);

// Fallback route cho Single Page UI
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Khởi chạy server sau khi khởi tạo DB
async function startServer() {
  try {
    console.log('🚀 Đang khởi động hệ thống quản lý nhà hàng...');
    await initDatabase();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`===============================================`);
      console.log(`🍽️  Hệ Thống Quản Lý Nhà Hàng (NhaHang)`);
      console.log(`📡 Máy chủ đang lắng nghe tại port: ${PORT}`);
      console.log(`🌐 Local URL: http://localhost:${PORT}`);
      console.log(`🩺 Health check: http://localhost:${PORT}/health`);
      console.log(`===============================================`);
    });
  } catch (error) {
    console.error('❌ Khởi động hệ thống thất bại:', error);
    process.exit(1);
  }
}

startServer();
