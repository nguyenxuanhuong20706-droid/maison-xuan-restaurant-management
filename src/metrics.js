const client = require('prom-client');
const { pool } = require('./db');

// Khởi tạo Prometheus Registry riêng biệt
const register = new client.Registry();

// Bật các metrics mặc định của Node.js runtime (CPU, RAM, Event Loop, GC)
client.collectDefaultMetrics({
  register,
  prefix: 'nhahang_nodejs_',
});

// 1. Metric: Tổng số lượt request HTTP (Counter)
const httpRequestsTotal = new client.Counter({
  name: 'nhahang_http_requests_total',
  help: 'Tong so luong request HTTP da xu ly',
  labelNames: ['method', 'route', 'status_code'],
});
register.registerMetric(httpRequestsTotal);

// 2. Metric: Thời gian xử lý request HTTP (Histogram)
const httpRequestDurationSeconds = new client.Histogram({
  name: 'nhahang_http_request_duration_seconds',
  help: 'Thoi gian phan hoi request HTTP tinh bang giay',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});
register.registerMetric(httpRequestDurationSeconds);

// 3. Metric: Số lượng request đang xử lý đồng thời (Gauge)
const httpRequestsActive = new client.Gauge({
  name: 'nhahang_http_requests_active',
  help: 'So luong request HTTP dang duoc xu ly dong thoi',
});
register.registerMetric(httpRequestsActive);

// 4. Metric nghiệp vụ: Đơn hàng theo trạng thái (Gauge)
const restaurantOrdersGauge = new client.Gauge({
  name: 'nhahang_orders_count',
  help: 'So luong don hang hien tai theo trang thai',
  labelNames: ['status'],
});
register.registerMetric(restaurantOrdersGauge);

// 5. Metric nghiệp vụ: Bàn ăn theo trạng thái (Gauge)
const restaurantTablesGauge = new client.Gauge({
  name: 'nhahang_tables_count',
  help: 'So luong ban an theo trang thai (available, occupied, reserved)',
  labelNames: ['status'],
});
register.registerMetric(restaurantTablesGauge);

// 6. Metric nghiệp vụ: Tổng số món ăn trong thực đơn (Gauge)
const restaurantDishesGauge = new client.Gauge({
  name: 'nhahang_dishes_total',
  help: 'Tong so mon an dang co trong thuc don',
});
register.registerMetric(restaurantDishesGauge);

// Middleware chuẩn hóa route và đo lường request
function metricsMiddleware(req, res, next) {
  // Bỏ qua endpoint /metrics để không làm sai lệch số liệu
  if (req.path === '/metrics') {
    return next();
  }

  httpRequestsActive.inc();
  const start = process.hrtime();

  res.on('finish', () => {
    httpRequestsActive.dec();

    const duration = process.hrtime(start);
    const durationInSeconds = duration[0] + duration[1] / 1e9;

    // Chuẩn hóa route để tránh bùng nổ cardinality với query parameters hoặc ID
    let route = req.baseUrl || '';
    if (req.route && req.route.path) {
      route += req.route.path;
    } else {
      route += (req.path || '/').replace(/\/\d+/g, '/:id');
    }

    const statusCode = res.statusCode ? res.statusCode.toString() : '500';

    httpRequestsTotal.inc({
      method: req.method,
      route: route || '/',
      status_code: statusCode,
    });

    httpRequestDurationSeconds.observe(
      {
        method: req.method,
        route: route || '/',
        status_code: statusCode,
      },
      durationInSeconds
    );
  });

  next();
}

// Cập nhật các chỉ số nghiệp vụ thực tế từ PostgreSQL
async function updateBusinessMetrics() {
  try {
    // 1. Thống kê món ăn
    const dishesRes = await pool.query('SELECT COUNT(*) as total FROM dishes');
    if (dishesRes.rows.length > 0) {
      restaurantDishesGauge.set(parseInt(dishesRes.rows[0].total, 10));
    }

    // 2. Thống kê bàn ăn theo trạng thái
    const tablesRes = await pool.query('SELECT status, COUNT(*) as count FROM tables GROUP BY status');
    restaurantTablesGauge.set({ status: 'available' }, 0);
    restaurantTablesGauge.set({ status: 'occupied' }, 0);
    restaurantTablesGauge.set({ status: 'reserved' }, 0);
    for (const row of tablesRes.rows) {
      restaurantTablesGauge.set({ status: row.status }, parseInt(row.count, 10));
    }

    // 3. Thống kê đơn hàng theo trạng thái
    const ordersRes = await pool.query('SELECT status, COUNT(*) as count FROM orders GROUP BY status');
    restaurantOrdersGauge.set({ status: 'pending' }, 0);
    restaurantOrdersGauge.set({ status: 'served' }, 0);
    restaurantOrdersGauge.set({ status: 'completed' }, 0);
    restaurantOrdersGauge.set({ status: 'cancelled' }, 0);
    for (const row of ordersRes.rows) {
      restaurantOrdersGauge.set({ status: row.status }, parseInt(row.count, 10));
    }
  } catch (err) {
    console.warn('Lỗi cập nhật business metrics từ DB:', err.message);
  }
}

module.exports = {
  register,
  metricsMiddleware,
  updateBusinessMetrics,
};
