// State quản lý trong ứng dụng
let currentDishes = [];
let currentTables = [];
let currentOrders = [];

// Format tiền tệ VNĐ
function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// Hiển thị thông báo Toast
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Chuyển Tab Navigation
function setupNavigation() {
  const tabButtons = document.querySelectorAll('.nav-tab');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');

      // Tự động load dữ liệu cho tab tương ứng
      if (targetId === 'orders-tab') loadOrders();
      if (targetId === 'tables-tab') loadTables();
      if (targetId === 'dishes-tab') loadDishes();
    });
  });
}

// ==========================================
// 1. QUẢN LÝ MÓN ĂN (DISHES)
// ==========================================
async function loadDishes() {
  try {
    const search = document.getElementById('dish-search-input').value.trim();
    const category = document.getElementById('dish-category-filter').value;

    let url = '/api/dishes?';
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (category) url += `category=${encodeURIComponent(category)}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Không thể tải danh sách món ăn');
    currentDishes = await res.json();
    renderDishesTable(currentDishes);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function renderDishesTable(dishes) {
  const tbody = document.getElementById('dishes-table-body');
  if (!dishes.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 30px;">Chưa có món ăn nào</td></tr>`;
    return;
  }

  tbody.innerHTML = dishes.map(dish => `
    <tr>
      <td><strong>#${dish.id}</strong></td>
      <td><strong>${dish.name}</strong></td>
      <td><span class="badge" style="background:#e0f2fe; color:#0369a1;">${dish.category}</span></td>
      <td><strong>${formatCurrency(dish.price)}</strong></td>
      <td>
        <span class="badge ${dish.is_available ? 'badge-completed' : 'badge-cancelled'}">
          ${dish.is_available ? 'Đang phục vụ' : 'Hết món'}
        </span>
      </td>
      <td style="text-align: right;">
        <button class="btn btn-secondary btn-sm" onclick="openEditDish(${dish.id})">✏️ Sửa</button>
        <button class="btn btn-danger btn-sm" onclick="deleteDish(${dish.id})">🗑️ Xóa</button>
      </td>
    </tr>
  `).join('');
}

function openEditDish(dishId) {
  const dish = currentDishes.find(d => d.id === dishId);
  if (!dish) return;

  document.getElementById('modal-dish-title').textContent = 'Chỉnh Sửa Món Ăn';
  document.getElementById('dish-id-input').value = dish.id;
  document.getElementById('dish-name-input').value = dish.name;
  document.getElementById('dish-category-input').value = dish.category;
  document.getElementById('dish-price-input').value = dish.price;
  document.getElementById('dish-available-input').value = dish.is_available ? 'true' : 'false';

  document.getElementById('modal-dish').classList.add('active');
}

async function deleteDish(dishId) {
  if (!confirm('Bạn có chắc chắn muốn xóa món ăn này không?')) return;
  try {
    const res = await fetch(`/api/dishes/${dishId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Xóa món ăn thất bại');
    showToast(data.message || 'Xóa món thành công');
    loadDishes();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ==========================================
// 2. QUẢN LÝ BÀN ĂN (TABLES)
// ==========================================
async function loadTables() {
  try {
    const res = await fetch('/api/tables');
    if (!res.ok) throw new Error('Không thể tải danh sách bàn ăn');
    currentTables = await res.json();
    renderTablesSummary(currentTables);
    renderTablesGrid(currentTables);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function renderTablesSummary(tables) {
  const availableCount = tables.filter(t => t.status === 'available').length;
  const occupiedCount = tables.filter(t => t.status === 'occupied').length;
  const reservedCount = tables.filter(t => t.status === 'reserved').length;

  const container = document.getElementById('tables-summary');
  container.innerHTML = `
    <div class="summary-card">
      <div class="summary-icon">🟢</div>
      <div>
        <div class="summary-num" style="color:#059669;">${availableCount}</div>
        <div class="summary-title">Bàn trống</div>
      </div>
    </div>
    <div class="summary-card">
      <div class="summary-icon">🔵</div>
      <div>
        <div class="summary-num" style="color:#2563eb;">${occupiedCount}</div>
        <div class="summary-title">Đang có khách</div>
      </div>
    </div>
    <div class="summary-card">
      <div class="summary-icon">🟡</div>
      <div>
        <div class="summary-num" style="color:#d97706;">${reservedCount}</div>
        <div class="summary-title">Đã đặt trước</div>
      </div>
    </div>
    <div class="summary-card">
      <div class="summary-icon">📊</div>
      <div>
        <div class="summary-num">${tables.length}</div>
        <div class="summary-title">Tổng số bàn</div>
      </div>
    </div>
  `;
}

function renderTablesGrid(tables) {
  const grid = document.getElementById('tables-list');
  if (!tables.length) {
    grid.innerHTML = '<p style="color:#94a3b8;">Chưa có bàn ăn nào trong hệ thống.</p>';
    return;
  }

  const statusTextMap = {
    available: 'Bàn Trống',
    occupied: 'Có Khách',
    reserved: 'Đã Đặt',
  };

  const statusBadgeMap = {
    available: 'badge-completed',
    occupied: 'badge-serving',
    reserved: 'badge-pending',
  };

  grid.innerHTML = tables.map(table => `
    <div class="table-card status-${table.status}">
      <div class="table-header">
        <span class="table-title">${table.table_number}</span>
        <span class="badge ${statusBadgeMap[table.status]}">${statusTextMap[table.status]}</span>
      </div>
      <div class="table-capacity">
        👥 Sức chứa: <strong>${table.capacity} khách</strong>
        ${table.active_orders_count > 0 ? `<br>🔥 Đang có <strong>${table.active_orders_count} đơn hàng</strong>` : ''}
      </div>

      <div class="table-actions">
        <select class="form-control" onchange="updateTableStatus(${table.id}, this.value)">
          <option value="available" ${table.status === 'available' ? 'selected' : ''}>Chuyển sang: Bàn Trống</option>
          <option value="occupied" ${table.status === 'occupied' ? 'selected' : ''}>Chuyển sang: Có Khách</option>
          <option value="reserved" ${table.status === 'reserved' ? 'selected' : ''}>Chuyển sang: Đã Đặt</option>
        </select>
        <button class="btn btn-secondary btn-sm" onclick="deleteTable(${table.id})" style="color:var(--danger);">
          🗑️ Xóa bàn
        </button>
      </div>
    </div>
  `).join('');
}

async function updateTableStatus(tableId, newStatus) {
  try {
    const res = await fetch(`/api/tables/${tableId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Cập nhật trạng thái bàn thất bại');
    }
    showToast('Cập nhật trạng thái bàn thành công');
    loadTables();
  } catch (error) {
    showToast(error.message, 'error');
    loadTables();
  }
}

async function deleteTable(tableId) {
  if (!confirm('Bạn có chắc chắn muốn xóa bàn ăn này?')) return;
  try {
    const res = await fetch(`/api/tables/${tableId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Không thể xóa bàn ăn');
    showToast(data.message || 'Xóa bàn ăn thành công');
    loadTables();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ==========================================
// 3. QUẢN LÝ ĐƠN HÀNG (ORDERS)
// ==========================================
async function loadOrders() {
  try {
    const statusFilter = document.getElementById('order-status-filter').value;
    let url = '/api/orders';
    if (statusFilter) url += `?status=${encodeURIComponent(statusFilter)}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Không thể tải danh sách đơn hàng');
    currentOrders = await res.json();
    renderOrdersGrid(currentOrders);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function renderOrdersGrid(orders) {
  const container = document.getElementById('orders-list');
  if (!orders.length) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 40px; background: #fff; border-radius: 12px; border: 1px dashed #cbd5e1;">Hiện không có đơn hàng nào phù hợp bộ lọc.</div>`;
    return;
  }

  const statusLabel = {
    pending: 'Chờ Xử Lý',
    serving: 'Đang Phục Vụ',
    completed: 'Đã Hoàn Thành',
    cancelled: 'Đã Hủy',
  };

  container.innerHTML = orders.map(order => `
    <div class="order-card">
      <div class="order-card-header">
        <div>
          <div class="order-number">Đơn Hàng #${order.id}</div>
          <span class="order-table-badge">📍 ${order.table_number}</span>
        </div>
        <span class="badge badge-${order.status}">${statusLabel[order.status] || order.status}</span>
      </div>

      <ul class="order-items-list">
        ${order.items.map(item => `
          <li class="order-item-row">
            <span class="order-item-name"><span class="order-item-qty">${item.quantity}x</span> ${item.dish_name}</span>
            <span class="order-item-price">${formatCurrency(item.subtotal)}</span>
          </li>
        `).join('')}
      </ul>

      ${order.note ? `<div style="font-size:12px; color:#64748b; margin-bottom:8px;">📝 <em>Ghi chú: ${order.note}</em></div>` : ''}

      <div class="order-footer">
        <div>
          <span class="order-total-lbl">Tổng thanh toán:</span>
          <div class="order-total-val">${formatCurrency(order.total_price)}</div>
        </div>
        <div style="font-size:11px; color:#94a3b8; text-align:right;">
          ${new Date(order.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <div class="order-actions">
        ${order.status === 'pending' ? `
          <button class="btn btn-primary btn-sm" style="flex:1;" onclick="updateOrderStatus(${order.id}, 'serving')">
            🍽️ Phục Vụ
          </button>
        ` : ''}
        ${['pending', 'serving'].includes(order.status) ? `
          <button class="btn btn-success btn-sm" style="flex:1;" onclick="updateOrderStatus(${order.id}, 'completed')">
            💵 Thanh Toán
          </button>
          <button class="btn btn-danger btn-sm" onclick="updateOrderStatus(${order.id}, 'cancelled')">
            ❌ Hủy
          </button>
        ` : `
          <span style="font-size:12px; color:#94a3b8; padding: 6px 0;">Đơn đã kết thúc</span>
        `}
      </div>
    </div>
  `).join('');
}

async function updateOrderStatus(orderId, status) {
  try {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Cập nhật trạng thái đơn thất bại');
    }
    showToast('Cập nhật trạng thái đơn thành công');
    loadOrders();
    loadTables(); // Reload tables để đồng bộ trạng thái bàn
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ==========================================
// 4. LOGIC TẠO ĐƠN HÀNG MỚI (MODAL)
// ==========================================
function openCreateOrderModal() {
  // Chuẩn bị danh sách bàn
  const tableSelect = document.getElementById('order-select-table');
  tableSelect.innerHTML = '<option value="">-- Vui lòng chọn bàn --</option>' +
    currentTables.map(t => `<option value="${t.id}">${t.table_number} (${t.status === 'available' ? 'Bàn trống' : t.status === 'occupied' ? 'Đang có khách' : 'Đã đặt'})</option>`).join('');

  // Làm sạch rows món
  const builder = document.getElementById('order-items-builder');
  builder.innerHTML = '';
  addDishRowToOrder();

  document.getElementById('order-note').value = '';
  updateOrderPreviewTotal();
  document.getElementById('modal-order').classList.add('active');
}

function addDishRowToOrder() {
  const builder = document.getElementById('order-items-builder');
  const availableDishes = currentDishes.filter(d => d.is_available);

  const row = document.createElement('div');
  row.className = 'item-row';
  row.innerHTML = `
    <select class="form-control select-order-dish" required>
      <option value="">-- Chọn món --</option>
      ${availableDishes.map(d => `<option value="${d.id}" data-price="${d.price}">${d.name} (${formatCurrency(d.price)})</option>`).join('')}
    </select>
    <input type="number" class="form-control input-order-qty" value="1" min="1" max="99" required>
    <span class="item-row-price">0 ₫</span>
    <button type="button" class="btn-remove-row">&times;</button>
  `;

  const dishSelect = row.querySelector('.select-order-dish');
  const qtyInput = row.querySelector('.input-order-qty');
  const priceDisplay = row.querySelector('.item-row-price');
  const btnRemove = row.querySelector('.btn-remove-row');

  function updateRowPrice() {
    const opt = dishSelect.selectedOptions[0];
    const price = opt && opt.getAttribute('data-price') ? parseFloat(opt.getAttribute('data-price')) : 0;
    const qty = parseInt(qtyInput.value, 10) || 1;
    priceDisplay.textContent = formatCurrency(price * qty);
    updateOrderPreviewTotal();
  }

  dishSelect.addEventListener('change', updateRowPrice);
  qtyInput.addEventListener('input', updateRowPrice);

  btnRemove.addEventListener('click', () => {
    if (builder.children.length > 1) {
      row.remove();
      updateOrderPreviewTotal();
    } else {
      showToast('Đơn hàng cần có ít nhất một món ăn', 'error');
    }
  });

  builder.appendChild(row);
}

function updateOrderPreviewTotal() {
  const rows = document.querySelectorAll('#order-items-builder .item-row');
  let grandTotal = 0;

  rows.forEach(r => {
    const sel = r.querySelector('.select-order-dish');
    const qty = parseInt(r.querySelector('.input-order-qty').value, 10) || 0;
    const opt = sel.selectedOptions[0];
    const price = opt && opt.getAttribute('data-price') ? parseFloat(opt.getAttribute('data-price')) : 0;
    grandTotal += price * qty;
  });

  document.getElementById('order-preview-total').textContent = formatCurrency(grandTotal);
}

// ==========================================
// 5. EVENT LISTENERS & KHỞI TẠO
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();

  // Load ban đầu tất cả dữ liệu
  await Promise.all([loadDishes(), loadTables(), loadOrders()]);

  // Bộ lọc đơn hàng
  document.getElementById('order-status-filter').addEventListener('change', loadOrders);
  document.getElementById('btn-refresh-orders').addEventListener('click', loadOrders);

  // Bộ lọc món ăn
  document.getElementById('dish-search-input').addEventListener('input', debounce(loadDishes, 300));
  document.getElementById('dish-category-filter').addEventListener('change', loadDishes);
  document.getElementById('btn-refresh-dishes').addEventListener('click', loadDishes);

  // Mở modal tạo đơn hàng
  document.getElementById('btn-open-create-order').addEventListener('click', openCreateOrderModal);
  document.getElementById('btn-add-item-row').addEventListener('click', addDishRowToOrder);
  document.getElementById('btn-close-modal-order').addEventListener('click', () => document.getElementById('modal-order').classList.remove('active'));
  document.getElementById('btn-cancel-modal-order').addEventListener('click', () => document.getElementById('modal-order').classList.remove('active'));

  // Submit tạo đơn hàng
  document.getElementById('form-create-order').addEventListener('submit', async (e) => {
    e.preventDefault();
    const table_id = document.getElementById('order-select-table').value;
    const note = document.getElementById('order-note').value;

    const rows = document.querySelectorAll('#order-items-builder .item-row');
    const items = [];

    for (const r of rows) {
      const dish_id = r.querySelector('.select-order-dish').value;
      const quantity = parseInt(r.querySelector('.input-order-qty').value, 10);
      if (!dish_id) {
        showToast('Vui lòng chọn món ăn cho từng dòng', 'error');
        return;
      }
      items.push({ dish_id, quantity });
    }

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_id, items, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Tạo đơn hàng thất bại');

      showToast(`Tạo đơn hàng #${data.id} thành công!`);
      document.getElementById('modal-order').classList.remove('active');
      loadOrders();
      loadTables();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  // Modal Bàn ăn
  document.getElementById('btn-open-create-table').addEventListener('click', () => {
    document.getElementById('form-create-table').reset();
    document.getElementById('modal-table').classList.add('active');
  });
  document.getElementById('btn-close-modal-table').addEventListener('click', () => document.getElementById('modal-table').classList.remove('active'));
  document.getElementById('btn-cancel-modal-table').addEventListener('click', () => document.getElementById('modal-table').classList.remove('active'));

  document.getElementById('form-create-table').addEventListener('submit', async (e) => {
    e.preventDefault();
    const table_number = document.getElementById('table-number-input').value;
    const capacity = document.getElementById('table-capacity-input').value;
    const status = document.getElementById('table-status-input').value;

    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_number, capacity, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Thêm bàn thất bại');

      showToast(`Thêm "${data.table_number}" thành công!`);
      document.getElementById('modal-table').classList.remove('active');
      loadTables();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  // Modal Món ăn
  document.getElementById('btn-open-create-dish').addEventListener('click', () => {
    document.getElementById('modal-dish-title').textContent = 'Thêm Món Ăn Mới';
    document.getElementById('dish-id-input').value = '';
    document.getElementById('form-dish').reset();
    document.getElementById('modal-dish').classList.add('active');
  });
  document.getElementById('btn-close-modal-dish').addEventListener('click', () => document.getElementById('modal-dish').classList.remove('active'));
  document.getElementById('btn-cancel-modal-dish').addEventListener('click', () => document.getElementById('modal-dish').classList.remove('active'));

  document.getElementById('form-dish').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('dish-id-input').value;
    const name = document.getElementById('dish-name-input').value;
    const category = document.getElementById('dish-category-input').value;
    const price = document.getElementById('dish-price-input').value;
    const is_available = document.getElementById('dish-available-input').value === 'true';

    const payload = { name, category, price, is_available };
    const url = id ? `/api/dishes/${id}` : '/api/dishes';
    const method = id ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lưu món ăn thất bại');

      showToast(id ? 'Cập nhật món thành công' : 'Thêm món thành công');
      document.getElementById('modal-dish').classList.remove('active');
      loadDishes();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
});

// Helper debounce cho tìm kiếm
function debounce(fn, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}
