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

// Bảo mật: Tắt header X-Powered-By để tránh lộ thông tin công nghệ Express
app.disable('x-powered-by');

// Middleware
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Metrics middleware (ghi nhận số lượng request, thời gian xử lý, mã phản hồi)
app.use(metricsMiddleware);

// Request logging middleware cho Centralized Logging (Loki & Promtail)
app.use((req, res, next) => {
  if (req.path === '/health' || req.path === '/metrics') {
    return next();
  }
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 500 ? 'ERROR' : (res.statusCode >= 400 ? 'WARN' : 'INFO');
    console.log(`[${new Date().toISOString()}] [${level}] [nhahang_web] ${req.method} ${req.originalUrl || req.url} ${res.statusCode} ${duration}ms - IP: ${req.ip || req.socket.remoteAddress}`);
  });
  next();
});

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

// 404 Handler cho các API route không tồn tại (phục vụ kiểm thử và giám sát lỗi 4xx)
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint API khong ton tai',
    method: req.method,
    path: req.originalUrl,
  });
});

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
