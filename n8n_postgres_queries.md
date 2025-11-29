# N8N Postgres Queries - Xuất Nhập Hàng

Copy các queries này vào n8n Postgres nodes tương ứng.

---

## 1. CHECK_AUTH (GET)

```sql
SELECT telegram_id, pages, role, active
FROM allowed_users
WHERE telegram_id = {{ $json.query.user_id }} AND active = true;
```

---

## 2. PRODUCTS

### GET products
```sql
SELECT * FROM products
WHERE page = '{{ $json.query.page }}'
ORDER BY name;
```

### POST products (Create - không có id)
```sql
INSERT INTO products (name, unit, description, page)
VALUES (
  '{{ $json.body.name }}',
  '{{ $json.body.unit }}',
  '{{ $json.body.description }}',
  '{{ $json.body.page }}'
)
RETURNING *;
```

### POST products (Update - có id)
```sql
UPDATE products
SET
  name = '{{ $json.body.name }}',
  unit = '{{ $json.body.unit }}',
  description = '{{ $json.body.description }}'
WHERE id = {{ $json.body.id }}
RETURNING *;
```

---

## 3. TRANSACTIONS

### GET transactions
```sql
SELECT
  t.*,
  p.name as product_name,
  p.unit as product_unit
FROM transactions t
LEFT JOIN products p ON t.product_id = p.id
WHERE t.page = '{{ $json.query.page }}'
ORDER BY t.timestamp DESC;
```

### POST transactions (Nhập/Xuất hàng)

**Flow:** Webhook → Code (chuẩn bị data) → Postgres (lấy transactions) → Code (kiểm tra tồn kho) → Postgres (insert)

#### Bước 1: Code node - Chuẩn bị data từ request
```javascript
const body = $json.body;
return [{
  json: {
    type: body.type,
    product_id: body.product_id,
    quantity: parseInt(body.quantity),
    note: body.note || '',
    page: body.page,
    user: body.user
  }
}];
```

#### Bước 2: Postgres node - Lấy transactions của product (chỉ khi type = 'xuat')
```sql
SELECT product_id, type, quantity
FROM transactions
WHERE page = '{{ $json.page }}' AND product_id = {{ $json.product_id }};
```

#### Bước 3: Code node - Kiểm tra tồn kho (chỉ khi type = 'xuat')
```javascript
const newTransaction = $('Bước 1').item.json; // Lấy data từ bước 1
const existingTrans = $input.all().map(i => i.json);

// Tính tồn kho hiện tại
let currentInventory = 0;

existingTrans.forEach(t => {
  if (t.type === 'nhap') {
    currentInventory += parseInt(t.quantity);
  } else if (t.type === 'xuat') {
    currentInventory -= parseInt(t.quantity);
  }
});

// Check đủ hàng không
const requestedQty = newTransaction.quantity;

if (currentInventory < requestedQty) {
  throw new Error(`Không đủ hàng! Tồn kho: ${currentInventory}, Yêu cầu: ${requestedQty}`);
}

// OK → Trả về transaction để insert
return [{
  json: newTransaction
}];
```

#### Bước 4: Postgres node - Insert transaction
```sql
INSERT INTO transactions (type, product_id, quantity, note, page, "user", timestamp)
VALUES (
  '{{ $json.type }}',
  {{ $json.product_id }},
  {{ $json.quantity }},
  '{{ $json.note || "" }}',
  '{{ $json.page }}',
  '{{ $json.user }}',
  NOW()
)
RETURNING *;
```

**Hoặc dùng parameterized query:**
- Query: `INSERT INTO transactions (type, product_id, quantity, note, page, "user", timestamp) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *;`
- Parameters: `{{ $json.type }},{{ $json.product_id }},{{ $json.quantity }},{{ $json.note || "" }},{{ $json.page }},{{ $json.user }}`

**Lưu ý:** Dùng IF node hoặc Switch để phân biệt:
- `type = 'nhap'` → Bỏ qua bước 2, 3, đi thẳng insert
- `type = 'xuat'` → Chạy đủ 4 bước để kiểm tra tồn kho

---

## 4. INVENTORY (GET - Lấy tồn kho)

### Bước 1: Postgres node - Lấy transactions theo page
```sql
SELECT product_id, type, quantity FROM transactions WHERE page = '{{ $json.query.page }}';
```

### Bước 2: Code node - Tính tồn kho
```javascript
const transactions = $input.all();
const inventory = {};

transactions.forEach(item => {
  const t = item.json;
  const productId = t.product_id;

  if (!inventory[productId]) {
    inventory[productId] = 0;
  }

  if (t.type === 'nhap') {
    inventory[productId] += parseInt(t.quantity);
  } else {
    inventory[productId] -= parseInt(t.quantity);
  }
});

const result = Object.entries(inventory).map(([id, qty]) => ({
  product_id: parseInt(id),
  quantity: qty
}));

return [{
  json: {
    success: true,
    data: result
  }
}];
```

---

## 5. LOCATIONS

### GET locations
```sql
SELECT * FROM locations
WHERE page = '{{ $json.query.page }}'
ORDER BY name;
```

### POST locations (Create/Update - UPSERT)
```sql
INSERT INTO locations (id, name, description, page)
VALUES (
  COALESCE({{ $json.body.id ? $json.body.id : 'NULL' }}::BIGINT, nextval(pg_get_serial_sequence('locations', 'id'))),
  '{{ $json.body.name }}',
  '{{ $json.body.description || "" }}',
  '{{ $json.body.page }}'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description
RETURNING *;
```

**Hoặc tách thành 2 query riêng (đơn giản hơn):**

**Create (khi id trống/null):**
```sql
INSERT INTO locations (name, description, page)
VALUES (
  '{{ $json.body.name }}',
  '{{ $json.body.description || "" }}',
  '{{ $json.body.page }}'
)
RETURNING *;
```

**Update (khi có id):**
```sql
UPDATE locations
SET name = '{{ $json.body.name }}', description = '{{ $json.body.description || "" }}'
WHERE id = {{ $json.body.id }}
RETURNING *;
```

Dùng IF node kiểm tra `{{ $json.body.id }}` có giá trị không để route.

### POST locations (Delete - action='delete')
```sql
DELETE FROM locations
WHERE id = {{ $json.body.id }};
```

---

## 6. BANDWIDTH_LOGS

### GET bandwidth_logs
```sql
SELECT * FROM bandwidth_logs
WHERE page = '{{ $json.query.page }}'
ORDER BY timestamp DESC;
```

### POST bandwidth_logs
```sql
INSERT INTO bandwidth_logs (
  page, location, network_type, provider,
  event_type, bandwidth_change, bandwidth_after,
  note, "user", timestamp
)
VALUES (
  '{{ $json.body.page }}',
  '{{ $json.body.location }}',
  '{{ $json.body.network_type }}',
  '{{ $json.body.provider }}',
  '{{ $json.body.event_type }}',
  {{ $json.body.bandwidth_change }},
  {{ $json.body.bandwidth_after }},
  '{{ $json.body.note }}',
  '{{ $json.body.user }}',
  NOW()
)
RETURNING *;
```

---

## Lưu ý quan trọng

1. **Column "user"**: Luôn đặt trong dấu ngoặc kép vì là reserved keyword

2. **Escape strings**: Nếu input có dấu `'`, cần escape. Có thể dùng Function node:
   ```javascript
   $json.body.name = $json.body.name.replace(/'/g, "''");
   ```

3. **NULL values**: Nếu field có thể null, dùng COALESCE hoặc kiểm tra trong n8n trước

4. **Routing trong n8n**: Dùng Switch node để route theo:
   - `endpoint` (products, transactions, inventory, ...)
   - `method` (GET, POST)
   - `action` (delete, update, create)
   - `id` có hay không (create vs update)
