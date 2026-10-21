const { pool } = require('./db');

async function waitForDb(maxRetries = 15, delay = 2000) {
  for (let i = 1; i <= maxRetries; i++) {
    try {
      const client = await pool.connect();
      client.release();
      console.log('✅ Kết nối cơ sở dữ liệu PostgreSQL thành công!');
      return;
    } catch (err) {
      console.log(`[Đang thử kết nối DB lần ${i}/${maxRetries}...] ${err.message}`);
      if (i === maxRetries) {
        throw new Error('Không thể kết nối đến cơ sở dữ liệu PostgreSQL sau nhiều lần thử.');
      }
      await new Promise((res) => setTimeout(res, delay));
    }
  }
}

async function initDatabase() {
  await waitForDb();

  const createTablesQuery = `
    -- Bảng danh sách bàn ăn
    CREATE TABLE IF NOT EXISTS tables (
      id SERIAL PRIMARY KEY,
      table_number VARCHAR(50) NOT NULL UNIQUE,
      capacity INT NOT NULL DEFAULT 4,
      status VARCHAR(20) NOT NULL DEFAULT 'available' -- available, occupied, reserved
    );

    -- Bảng danh sách món ăn
    CREATE TABLE IF NOT EXISTS dishes (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      category VARCHAR(50) NOT NULL DEFAULT 'Món chính',
      price NUMERIC(12, 2) NOT NULL,
      is_available BOOLEAN NOT NULL DEFAULT TRUE
    );

    -- Bảng đơn hàng
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      table_id INT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, serving, completed, cancelled
      total_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
      note TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Bảng chi tiết món trong đơn hàng
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      dish_id INT NOT NULL REFERENCES dishes(id) ON DELETE RESTRICT,
      quantity INT NOT NULL DEFAULT 1,
      price NUMERIC(12, 2) NOT NULL
    );
  `;

  await pool.query(createTablesQuery);
  console.log('✅ Khởi tạo cấu trúc bảng (schema) thành công.');

  // Kiểm tra và chèn dữ liệu mẫu nếu bảng tables chưa có dữ liệu
  const tableCountRes = await pool.query('SELECT COUNT(*) FROM tables');
  if (parseInt(tableCountRes.rows[0].count, 10) === 0) {
    console.log('🌱 Đang chèn dữ liệu mẫu cho hệ thống nhà hàng...');

    // 1. Thêm bàn ăn mẫu
    const insertTables = `
      INSERT INTO tables (table_number, capacity, status) VALUES
      ('Bàn 01', 2, 'available'),
      ('Bàn 02', 4, 'occupied'),
      ('Bàn 03', 4, 'available'),
      ('Bàn 04', 6, 'available'),
      ('Bàn 05', 8, 'reserved'),
      ('Phòng VIP 1', 12, 'available');
    `;
    await pool.query(insertTables);

    // 2. Thêm món ăn mẫu
    const insertDishes = `
      INSERT INTO dishes (name, category, price, is_available) VALUES
      ('Phở Bò Tái Lăn', 'Món chính', 65000, true),
      ('Bún Chả Hà Nội Đặc Biệt', 'Món chính', 60000, true),
      ('Cơm Rang Dưa Bò', 'Món chính', 55000, true),
      ('Gà Nướng Mật Ong (Nửa con)', 'Món chính', 120000, true),
      ('Nem Rán Hà Nội (Đĩa 10 chiếc)', 'Khai vị', 70000, true),
      ('Gỏi Cuốn Tôm Thịt (4 cuốn)', 'Khai vị', 50000, true),
      ('Nộm Bò Bóp Thấu', 'Khai vị', 85000, true),
      ('Trà Đào Cam Sả', 'Đồ uống', 35000, true),
      ('Nước Ép Dưa Hấu', 'Đồ uống', 40000, true),
      ('Bia Trúc Bạch', 'Đồ uống', 30000, true),
      ('Chè Hạt Sen Long Nhãn', 'Tráng miệng', 35000, true);
    `;
    await pool.query(insertDishes);

    // 3. Thêm đơn hàng mẫu cho Bàn 02
    const table2 = await pool.query("SELECT id FROM tables WHERE table_number = 'Bàn 02'");
    if (table2.rows.length > 0) {
      const tableId = table2.rows[0].id;
      const orderInsert = await pool.query(
        `INSERT INTO orders (table_id, status, total_price, note) 
         VALUES ($1, 'serving', 255000, 'Khách ăn ít cay, phục vụ nhanh') RETURNING id`,
        [tableId]
      );
      const orderId = orderInsert.rows[0].id;

      // Lấy id một số món
      const phoRes = await pool.query("SELECT id, price FROM dishes WHERE name = 'Phở Bò Tái Lăn'");
      const nemRes = await pool.query("SELECT id, price FROM dishes WHERE name = 'Nem Rán Hà Nội (Đĩa 10 chiếc)'");
      const traRes = await pool.query("SELECT id, price FROM dishes WHERE name = 'Trà Đào Cam Sả'");

      if (phoRes.rows.length && nemRes.rows.length && traRes.rows.length) {
        const phoPrice = parseFloat(phoRes.rows[0].price);
        const nemPrice = parseFloat(nemRes.rows[0].price);
        const traPrice = parseFloat(traRes.rows[0].price);
        const totalSample = 2 * phoPrice + 1 * nemPrice + 1 * traPrice;

        await pool.query(
          `INSERT INTO order_items (order_id, dish_id, quantity, price) VALUES
           ($1, $2, 2, $3),
           ($1, $4, 1, $5),
           ($1, $6, 1, $7)`,
          [orderId, phoRes.rows[0].id, phoPrice, nemRes.rows[0].id, nemPrice, traRes.rows[0].id, traPrice]
        );
        
        await pool.query(
          `UPDATE orders SET total_price = $1 WHERE id = $2`,
          [totalSample, orderId]
        );
      }
    }

    console.log('✅ Đã nạp thành công dữ liệu mẫu khởi tạo.');
  }
}

module.exports = { initDatabase };
