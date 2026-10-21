const express = require('express');
const router = express.Router();
const db = require('../db');

// 1. Lấy danh sách tất cả món ăn
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = 'SELECT * FROM dishes WHERE 1=1';
    const params = [];

    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND name ILIKE $${params.length}`;
    }

    query += ' ORDER BY id ASC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Lỗi lấy danh sách món ăn:', error);
    res.status(500).json({ error: 'Không thể lấy danh sách món ăn' });
  }
});

// 2. Thêm món ăn mới
router.post('/', async (req, res) => {
  try {
    const { name, category, price, is_available } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Tên món và giá món là bắt buộc' });
    }

    const query = `
      INSERT INTO dishes (name, category, price, is_available)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [
      name.trim(),
      category || 'Món chính',
      parseFloat(price),
      is_available !== undefined ? is_available : true,
    ];

    const result = await db.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Lỗi thêm món ăn:', error);
    res.status(500).json({ error: 'Không thể thêm món ăn' });
  }
});

// 3. Cập nhật món ăn
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, price, is_available } = req.body;

    const query = `
      UPDATE dishes
      SET name = COALESCE($1, name),
          category = COALESCE($2, category),
          price = COALESCE($3, price),
          is_available = COALESCE($4, is_available)
      WHERE id = $5
      RETURNING *
    `;
    const values = [
      name ? name.trim() : null,
      category || null,
      price !== undefined ? parseFloat(price) : null,
      is_available !== undefined ? is_available : null,
      id,
    ];

    const result = await db.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy món ăn' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Lỗi cập nhật món ăn:', error);
    res.status(500).json({ error: 'Không thể cập nhật món ăn' });
  }
});

// 4. Xóa món ăn
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Kiểm tra xem món đã nằm trong đơn hàng nào chưa
    const checkOrder = await db.query('SELECT id FROM order_items WHERE dish_id = $1 LIMIT 1', [id]);
    if (checkOrder.rows.length > 0) {
      // Nếu đã có trong đơn hàng, chỉ đánh dấu ngừng bán thay vì xóa cứng để không hỏng dữ liệu đơn
      await db.query('UPDATE dishes SET is_available = false WHERE id = $1', [id]);
      return res.json({ message: 'Món ăn đã từng được đặt trong đơn hàng nên đã chuyển trạng thái sang Tạm hết/Ngừng phục vụ.', softDeleted: true });
    }

    const result = await db.query('DELETE FROM dishes WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy món ăn' });
    }
    res.json({ message: 'Xóa món ăn thành công', deleted: result.rows[0] });
  } catch (error) {
    console.error('Lỗi xóa món ăn:', error);
    res.status(500).json({ error: 'Không thể xóa món ăn' });
  }
});

module.exports = router;
