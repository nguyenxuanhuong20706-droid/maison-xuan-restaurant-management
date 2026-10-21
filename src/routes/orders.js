const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// 1. Lấy danh sách đơn hàng
router.get('/', async (req, res) => {
  try {
    const { status, table_id } = req.query;
    let query = `
      SELECT 
        o.id,
        o.table_id,
        t.table_number,
        o.status,
        o.total_price,
        o.note,
        o.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'item_id', oi.id,
              'dish_id', d.id,
              'dish_name', d.name,
              'quantity', oi.quantity,
              'price', oi.price,
              'subtotal', (oi.quantity * oi.price)
            )
          ) FILTER (WHERE oi.id IS NOT NULL), '[]'
        ) as items
      FROM orders o
      JOIN tables t ON o.table_id = t.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN dishes d ON oi.dish_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND o.status = $${params.length}`;
    }

    if (table_id) {
      params.push(table_id);
      query += ` AND o.table_id = $${params.length}`;
    }

    query += ` GROUP BY o.id, t.table_number ORDER BY o.id DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Lỗi lấy danh sách đơn hàng:', error);
    res.status(500).json({ error: 'Không thể lấy danh sách đơn hàng' });
  }
});

// 2. Lấy chi tiết một đơn hàng
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        o.id,
        o.table_id,
        t.table_number,
        o.status,
        o.total_price,
        o.note,
        o.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'item_id', oi.id,
              'dish_id', d.id,
              'dish_name', d.name,
              'quantity', oi.quantity,
              'price', oi.price,
              'subtotal', (oi.quantity * oi.price)
            )
          ) FILTER (WHERE oi.id IS NOT NULL), '[]'
        ) as items
      FROM orders o
      JOIN tables t ON o.table_id = t.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN dishes d ON oi.dish_id = d.id
      WHERE o.id = $1
      GROUP BY o.id, t.table_number
    `;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Lỗi lấy chi tiết đơn hàng:', error);
    res.status(500).json({ error: 'Không thể lấy thông tin đơn hàng' });
  }
});

// 3. Tạo đơn hàng mới (chọn bàn, chọn món, số lượng, tự động tính tổng tiền)
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const { table_id, items, note } = req.body;

    if (!table_id) {
      return res.status(400).json({ error: 'Vui lòng chọn bàn ăn' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Vui lòng chọn ít nhất một món ăn' });
    }

    await client.query('BEGIN');

    // Kiểm tra bàn có tồn tại không
    const tableRes = await client.query('SELECT * FROM tables WHERE id = $1', [table_id]);
    if (tableRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Bàn ăn không tồn tại' });
    }

    // Tính tổng tiền dựa trên giá thực tế trong cơ sở dữ liệu
    let calculatedTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const dishId = parseInt(item.dish_id, 10);
      const qty = parseInt(item.quantity, 10);

      if (!dishId || qty <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Món ăn hoặc số lượng không hợp lệ' });
      }

      const dishRes = await client.query('SELECT id, name, price, is_available FROM dishes WHERE id = $1', [dishId]);
      if (dishRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: `Không tìm thấy món có ID ${dishId}` });
      }

      const dish = dishRes.rows[0];
      const itemSubtotal = parseFloat(dish.price) * qty;
      calculatedTotal += itemSubtotal;

      validatedItems.push({
        dish_id: dish.id,
        dish_name: dish.name,
        price: parseFloat(dish.price),
        quantity: qty,
        subtotal: itemSubtotal,
      });
    }

    // Tạo đơn hàng
    const orderInsertQuery = `
      INSERT INTO orders (table_id, status, total_price, note)
      VALUES ($1, 'pending', $2, $3)
      RETURNING *
    `;
    const orderRes = await client.query(orderInsertQuery, [table_id, calculatedTotal, note || '']);
    const newOrder = orderRes.rows[0];

    // Chèn chi tiết các món vào order_items
    for (const vItem of validatedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, dish_id, quantity, price) VALUES ($1, $2, $3, $4)`,
        [newOrder.id, vItem.dish_id, vItem.quantity, vItem.price]
      );
    }

    // Cập nhật trạng thái bàn sang occupied (đang có khách)
    await client.query(`UPDATE tables SET status = 'occupied' WHERE id = $1`, [table_id]);

    await client.query('COMMIT');

    newOrder.items = validatedItems;
    res.status(201).json(newOrder);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Lỗi khi tạo đơn hàng:', error);
    res.status(500).json({ error: 'Không thể tạo đơn hàng' });
  } finally {
    client.release();
  }
});

// 4. Cập nhật trạng thái đơn hàng (pending, serving, completed, cancelled)
router.patch('/:id/status', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'serving', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Trạng thái đơn không hợp lệ' });
    }

    await client.query('BEGIN');

    const updateOrderRes = await client.query(
      `UPDATE orders SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (updateOrderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    }

    const updatedOrder = updateOrderRes.rows[0];

    // Nếu đơn hàng chuyển sang 'completed' (hoàn thành) hoặc 'cancelled' (đã hủy),
    // kiểm tra xem bàn này còn đơn nào đang hoạt động (pending/serving) không.
    if (['completed', 'cancelled'].includes(status)) {
      const activeOrders = await client.query(
        `SELECT COUNT(*) FROM orders WHERE table_id = $1 AND status IN ('pending', 'serving')`,
        [updatedOrder.table_id]
      );

      if (parseInt(activeOrders.rows[0].count, 10) === 0) {
        // Đặt lại bàn thành available (Trống)
        await client.query(`UPDATE tables SET status = 'available' WHERE id = $1`, [updatedOrder.table_id]);
      }
    } else if (['pending', 'serving'].includes(status)) {
      // Đảm bảo bàn là occupied
      await client.query(`UPDATE tables SET status = 'occupied' WHERE id = $1`, [updatedOrder.table_id]);
    }

    await client.query('COMMIT');
    res.json(updatedOrder);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Lỗi cập nhật trạng thái đơn:', error);
    res.status(500).json({ error: 'Không thể cập nhật trạng thái đơn' });
  } finally {
    client.release();
  }
});

module.exports = router;
