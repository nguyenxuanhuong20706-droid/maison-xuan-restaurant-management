const express = require('express');
const router = express.Router();
const db = require('../db');

// 1. Lấy danh sách tất cả các bàn ăn
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT t.*,
        (SELECT COUNT(*) FROM orders o WHERE o.table_id = t.id AND o.status IN ('pending', 'serving')) as active_orders_count
      FROM tables t
      ORDER BY t.id ASC
    `;
    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Lỗi lấy danh sách bàn:', error);
    res.status(500).json({ error: 'Không thể lấy danh sách bàn ăn' });
  }
});

// 2. Thêm bàn ăn mới
router.post('/', async (req, res) => {
  try {
    const { table_number, capacity, status } = req.body;
    if (!table_number) {
      return res.status(400).json({ error: 'Tên/số bàn là bắt buộc' });
    }

    const query = `
      INSERT INTO tables (table_number, capacity, status)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const values = [
      table_number.trim(),
      parseInt(capacity || '4', 10),
      status || 'available',
    ];

    const result = await db.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'Tên/số bàn này đã tồn tại' });
    }
    console.error('Lỗi thêm bàn ăn:', error);
    res.status(500).json({ error: 'Không thể thêm bàn ăn' });
  }
});

// 3. Cập nhật trạng thái bàn ăn
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['available', 'occupied', 'reserved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Trạng thái bàn không hợp lệ (hợp lệ: available, occupied, reserved)' });
    }

    const query = `
      UPDATE tables
      SET status = $1
      WHERE id = $2
      RETURNING *
    `;
    const result = await db.query(query, [status, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy bàn ăn' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Lỗi cập nhật trạng thái bàn:', error);
    res.status(500).json({ error: 'Không thể cập nhật trạng thái bàn ăn' });
  }
});

// 4. Xóa bàn ăn
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM tables WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy bàn ăn' });
    }
    res.json({ message: 'Xóa bàn thành công', deleted: result.rows[0] });
  } catch (error) {
    console.error('Lỗi xóa bàn ăn:', error);
    res.status(500).json({ error: 'Không thể xóa bàn ăn (có thể bàn đang gắn với đơn hàng)' });
  }
});

module.exports = router;
