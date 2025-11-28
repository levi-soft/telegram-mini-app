# 🚀 Migration Guide: n8n Data Tables → Supabase PostgreSQL

**Version:** 1.0.0
**Date:** 2025-11-28
**Estimated Time:** 60-90 phút

---

## 📊 Tổng Quan

### Lý Do Migration:
- ✅ **Scalability**: Supabase PostgreSQL mạnh hơn Data Tables
- ✅ **Performance**: Query nhanh hơn, hỗ trợ indexing
- ✅ **Features**: Full-text search, triggers, functions
- ✅ **Backup**: Auto backup, point-in-time recovery
- ✅ **Real-time**: Supabase Realtime subscriptions (optional)

### Database Schema:
- `products` (4 columns → 5 columns với index)
- `transactions` (7 columns → 8 columns với index)
- `allowed_users` (3 columns → 4 columns)
- `locations` (4 columns → 5 columns với index)
- `bandwidth_logs` (8 columns → 9 columns với index)

---

## BƯỚC 1: Setup Supabase Project

### 1.1. Tạo Supabase Account & Project

1. Truy cập: https://supabase.com
2. Sign up (miễn phí tier: 500MB database, 50k monthly active users)
3. Tạo project mới:
   - **Name**: `xuatnhaphang-rr88` (hoặc tên bạn thích)
   - **Database Password**: Lưu lại password này (rất quan trọng!)
   - **Region**: Singapore (gần VN nhất)
4. Đợi ~2 phút để Supabase provision database

### 1.2. Lấy Connection String

Sau khi project ready:

1. Vào **Project Settings** (icon ⚙️)
2. Chọn **Database**
3. Scroll xuống **Connection string**
4. Copy **Connection pooling** (dành cho n8n):
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```
5. Copy **Direct connection** (dành cho migrations):
   ```
   postgresql://postgres.[project-ref]:[password]@db.[project-ref].supabase.co:5432/postgres
   ```

**⚠️ LƯU Ý:** Thay `[password]` bằng database password bạn đã tạo ở bước 1.1

---

## BƯỚC 2: Tạo Database Schema

### 2.1. Mở SQL Editor

1. Vào Supabase Dashboard
2. Chọn **SQL Editor** (icon 📝)
3. Click **New Query**

### 2.2. Chạy Migration Script

Copy và paste script sau vào SQL Editor, sau đó click **RUN**:

```sql
-- ============================================
-- XUẤT NHẬP HÀNG - SUPABASE SCHEMA
-- ============================================

-- Enable UUID extension (nếu chưa có)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE 1: products
-- ============================================
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    page TEXT NOT NULL CHECK (page IN ('RR88', 'XX88', 'MM88')),
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for products
CREATE INDEX idx_products_page ON products(page);
CREATE INDEX idx_products_name ON products(name);
CREATE UNIQUE INDEX idx_products_page_name ON products(page, name);

-- ============================================
-- TABLE 2: transactions
-- ============================================
CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    page TEXT NOT NULL CHECK (page IN ('RR88', 'XX88', 'MM88')),
    type TEXT NOT NULL CHECK (type IN ('nhap', 'xuat')),
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    note TEXT,
    "user" TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for transactions
CREATE INDEX idx_transactions_page ON transactions(page);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_product_id ON transactions(product_id);
CREATE INDEX idx_transactions_timestamp ON transactions(timestamp DESC);
CREATE INDEX idx_transactions_page_timestamp ON transactions(page, timestamp DESC);

-- ============================================
-- TABLE 3: allowed_users
-- ============================================
CREATE TABLE allowed_users (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    pages TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for allowed_users
CREATE INDEX idx_allowed_users_user_id ON allowed_users(user_id);

-- ============================================
-- TABLE 4: locations
-- ============================================
CREATE TABLE locations (
    id BIGSERIAL PRIMARY KEY,
    page TEXT NOT NULL CHECK (page IN ('RR88', 'XX88', 'MM88')),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for locations
CREATE INDEX idx_locations_page ON locations(page);
CREATE UNIQUE INDEX idx_locations_page_name ON locations(page, name);

-- ============================================
-- TABLE 5: bandwidth_logs
-- ============================================
CREATE TABLE bandwidth_logs (
    id BIGSERIAL PRIMARY KEY,
    page TEXT NOT NULL CHECK (page IN ('RR88', 'XX88', 'MM88')),
    location TEXT NOT NULL,
    network_type TEXT NOT NULL CHECK (network_type IN ('doanh_nghiep', 'gia_dinh')),
    provider TEXT NOT NULL CHECK (provider IN ('viettel', 'vnpt', 'fpt', 'mobifone', 'cmcti', 'spt', 'other')),
    event_type TEXT NOT NULL CHECK (event_type IN ('moi', 'tang', 'giam', 'chuyen')),
    bandwidth_change NUMERIC(10,2) NOT NULL,
    bandwidth_after NUMERIC(10,2) NOT NULL CHECK (bandwidth_after >= 0),
    note TEXT,
    "user" TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for bandwidth_logs
CREATE INDEX idx_bandwidth_logs_page ON bandwidth_logs(page);
CREATE INDEX idx_bandwidth_logs_location ON bandwidth_logs(location);
CREATE INDEX idx_bandwidth_logs_network_type ON bandwidth_logs(network_type);
CREATE INDEX idx_bandwidth_logs_provider ON bandwidth_logs(provider);
CREATE INDEX idx_bandwidth_logs_timestamp ON bandwidth_logs(timestamp DESC);
CREATE INDEX idx_bandwidth_logs_page_timestamp ON bandwidth_logs(page, timestamp DESC);

-- ============================================
-- MATERIALIZED VIEW: Current Inventory
-- (Tối ưu performance cho query tồn kho)
-- ============================================
CREATE MATERIALIZED VIEW inventory_current AS
SELECT
    p.id as product_id,
    p.page,
    p.name,
    p.unit,
    COALESCE(
        SUM(CASE WHEN t.type = 'nhap' THEN t.quantity ELSE 0 END) -
        SUM(CASE WHEN t.type = 'xuat' THEN t.quantity ELSE 0 END),
        0
    ) as quantity
FROM products p
LEFT JOIN transactions t ON p.id = t.product_id
GROUP BY p.id, p.page, p.name, p.unit;

-- Index for materialized view
CREATE INDEX idx_inventory_current_page ON inventory_current(page);
CREATE INDEX idx_inventory_current_product_id ON inventory_current(product_id);

-- Function to refresh inventory (gọi sau mỗi transaction)
CREATE OR REPLACE FUNCTION refresh_inventory()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY inventory_current;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (RLS) - Optional
-- Bật nếu muốn security cao hơn
-- ============================================
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bandwidth_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================
-- Thêm sample user
INSERT INTO allowed_users (user_id, pages) VALUES
(123456789, 'RR88,XX88,MM88');

-- Thêm sample products
INSERT INTO products (page, name, unit, description) VALUES
('RR88', 'Sản phẩm A', 'Thùng', 'Mô tả sản phẩm A'),
('RR88', 'Sản phẩm B', 'Cái', 'Mô tả sản phẩm B'),
('XX88', 'Sản phẩm C', 'Kg', 'Mô tả sản phẩm C');

-- Thêm sample locations
INSERT INTO locations (page, name, description) VALUES
('RR88', 'Văn phòng tầng 8', 'Văn phòng chính'),
('RR88', 'KTX tầng 7', 'Ký túc xá sinh viên');

-- Refresh inventory view
SELECT refresh_inventory();

-- ============================================
-- VERIFY SCHEMA
-- ============================================
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

### 2.3. Verify Schema

Sau khi chạy script, bạn sẽ thấy output:

```
table_name       | column_count
-----------------+--------------
allowed_users    | 4
bandwidth_logs   | 9
locations        | 5
products         | 6
transactions     | 8
```

✅ Nếu thấy output như trên → Schema tạo thành công!

---

## BƯỚC 3: Setup n8n Postgres Credentials

### 3.1. Thêm Credentials vào n8n

1. Vào n8n → **Credentials** (menu bên trái)
2. Click **Add Credential**
3. Tìm và chọn **Postgres**
4. Điền thông tin:

**Credential Name:** `Supabase - XuatNhapHang`

**Connection:**
- Host: `aws-0-ap-southeast-1.pooler.supabase.com` (lấy từ connection string)
- Database: `postgres`
- User: `postgres.[project-ref]` (lấy từ connection string)
- Password: `[your-database-password]`
- Port: `6543` (pooler port)
- SSL: **Allow** (bật SSL)

5. Click **Test** để kiểm tra connection
6. Click **Save**

### 3.2. Test Connection

Tạo workflow test:

1. **Manual Trigger**
2. **Postgres Node**
   - Credential: `Supabase - XuatNhapHang`
   - Operation: **Execute Query**
   - Query: `SELECT COUNT(*) as total FROM products;`
3. Execute workflow

✅ Nếu thấy kết quả → Connection thành công!

---

## BƯỚC 4: Update n8n Workflows

### 4.1. Workflow: API GET

**Cũ:** Data Tables → Get Many
**Mới:** Postgres → Execute Query

#### Example: GET Products

**Node cũ (Data Tables):**
```
Get Many
- Table: products
- Filter: page Equal {{ $json.query.page }}
- Return All: Yes
```

**Node mới (Postgres):**
```
Postgres Node
- Credential: Supabase - XuatNhapHang
- Operation: Execute Query
- Query:
  SELECT id, page, name, unit, description, created_at
  FROM products
  WHERE page = $1
  ORDER BY name ASC
- Query Parameters: {{ $json.query.page }}
```

**Code Node (Format Response):**
```javascript
const rows = $input.first().json;

return [{
  json: {
    success: true,
    data: rows
  }
}];
```

#### Example: GET Transactions

**Postgres Query:**
```sql
SELECT
    id, page, type, product_id, quantity,
    note, "user", timestamp
FROM transactions
WHERE page = $1
ORDER BY timestamp DESC
LIMIT 1000
```

**Query Parameters:** `{{ $json.query.page }}`

#### Example: GET Inventory

**Postgres Query (sử dụng Materialized View):**
```sql
SELECT product_id, page, name, unit, quantity
FROM inventory_current
WHERE page = $1
ORDER BY name ASC
```

**Query Parameters:** `{{ $json.query.page }}`

### 4.2. Workflow: API POST

**Cũ:** Data Tables → Insert
**Mới:** Postgres → Insert + Refresh Inventory

#### Example: POST Transaction (Nhập/Xuất)

**Postgres Node - Insert:**
```
Operation: Insert
Table: transactions
Columns:
  - page: {{ $json.page }}
  - type: {{ $json.type }}
  - product_id: {{ $json.product_id }}
  - quantity: {{ $json.quantity }}
  - note: {{ $json.note }}
  - user: {{ $json.user }}
  - timestamp: {{ $json.timestamp }}
Return Fields: id
```

**Postgres Node - Refresh Inventory:**
```
Operation: Execute Query
Query: SELECT refresh_inventory();
```

**Code Node - Success Response:**
```javascript
return [{
  json: {
    success: true,
    message: 'Giao dịch thành công',
    data: $input.first().json
  }
}];
```

#### Example: POST Product (Add/Update)

**Code Node - Prepare Upsert:**
```javascript
const body = $input.first().json.body;

if (!body.name || !body.unit || !body.page) {
  return [{
    json: {
      success: false,
      message: 'Thiếu thông tin bắt buộc'
    }
  }];
}

return [{
  json: {
    id: body.id || null,
    page: body.page,
    name: body.name,
    unit: body.unit,
    description: body.description || ''
  }
}];
```

**Postgres Node - Upsert:**
```
Operation: Execute Query
Query:
  INSERT INTO products (page, name, unit, description)
  VALUES ($1, $2, $3, $4)
  ON CONFLICT (page, name)
  DO UPDATE SET
    unit = EXCLUDED.unit,
    description = EXCLUDED.description
  RETURNING id, page, name, unit, description;
Query Parameters:
  - {{ $json.page }}
  - {{ $json.name }}
  - {{ $json.unit }}
  - {{ $json.description }}
```

---

## BƯỚC 5: Detailed Workflow Updates

### 5.1. GET Products Endpoint

**Flow:** Switch → Postgres (SELECT) → Code (Format) → Respond

**Postgres Query:**
```sql
SELECT id, page, name, unit, description, created_at
FROM products
WHERE page = $1
ORDER BY name ASC
```

**Parameters:** `{{ $json.query.page }}`

**Code (Format):**
```javascript
const rows = $input.first().json;

return [{
  json: {
    success: true,
    data: rows
  }
}];
```

---

### 5.2. GET Transactions Endpoint

**Postgres Query:**
```sql
SELECT
    id, page, type, product_id, quantity,
    note, "user", timestamp
FROM transactions
WHERE page = $1
ORDER BY timestamp DESC
LIMIT 1000
```

**Parameters:** `{{ $json.query.page }}`

---

### 5.3. GET Inventory Endpoint

**Postgres Query (Fast - sử dụng Materialized View):**
```sql
SELECT product_id, quantity
FROM inventory_current
WHERE page = $1
```

**Parameters:** `{{ $json.query.page }}`

**Code (Format to match frontend):**
```javascript
const rows = $input.first().json;

return [{
  json: {
    success: true,
    data: rows
  }
}];
```

---

### 5.4. POST Transaction Endpoint

**Flow:** Switch → Code (Validate) → Postgres (INSERT) → Postgres (Refresh View) → Code (Response) → Respond

**Code (Validate):**
```javascript
const body = $input.first().json.body;

if (!body.type || !body.product_id || !body.quantity) {
  return [{
    json: {
      success: false,
      message: 'Thiếu thông tin bắt buộc'
    }
  }];
}

// Check type
if (!['nhap', 'xuat'].includes(body.type)) {
  return [{
    json: {
      success: false,
      message: 'Loại giao dịch không hợp lệ'
    }
  }];
}

return [{
  json: {
    page: body.page,
    type: body.type,
    product_id: parseInt(body.product_id),
    quantity: parseInt(body.quantity),
    note: body.note || '',
    user: body.user,
    timestamp: new Date().toISOString()
  }
}];
```

**Postgres (INSERT):**
```sql
INSERT INTO transactions (page, type, product_id, quantity, note, "user", timestamp)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, page, type, product_id, quantity, note, "user", timestamp
```

**Parameters:**
- `{{ $json.page }}`
- `{{ $json.type }}`
- `{{ $json.product_id }}`
- `{{ $json.quantity }}`
- `{{ $json.note }}`
- `{{ $json.user }}`
- `{{ $json.timestamp }}`

**Postgres (Refresh Inventory):**
```sql
SELECT refresh_inventory();
```

**Code (Success Response):**
```javascript
const result = $input.first().json;

return [{
  json: {
    success: true,
    message: 'Giao dịch thành công',
    data: result[0]
  }
}];
```

---

### 5.5. POST Product Endpoint (Upsert)

**Code (Validate):**
```javascript
const body = $input.first().json.body;

if (!body.name || !body.unit || !body.page) {
  return [{
    json: {
      success: false,
      message: 'Thiếu thông tin bắt buộc'
    }
  }];
}

return [{
  json: {
    id: body.id || null,
    page: body.page,
    name: body.name.trim(),
    unit: body.unit.trim(),
    description: body.description?.trim() || ''
  }
}];
```

**IF Node:** Check if `{{ $json.id }}` exists

**IF TRUE (Update):**
```sql
UPDATE products
SET name = $2, unit = $3, description = $4
WHERE id = $1
RETURNING id, page, name, unit, description
```

**Parameters:** `{{ $json.id }}, {{ $json.name }}, {{ $json.unit }}, {{ $json.description }}`

**IF FALSE (Insert):**
```sql
INSERT INTO products (page, name, unit, description)
VALUES ($1, $2, $3, $4)
RETURNING id, page, name, unit, description
```

**Parameters:** `{{ $json.page }}, {{ $json.name }}, {{ $json.unit }}, {{ $json.description }}`

---

### 5.6. GET Locations Endpoint

**Postgres Query:**
```sql
SELECT id, page, name, description, created_at
FROM locations
WHERE page = $1
ORDER BY name ASC
```

**Parameters:** `{{ $json.query.page }}`

---

### 5.7. POST Location Endpoint

**Code (Validate & Check Action):**
```javascript
const body = $input.first().json.body;

// Delete action
if (body.action === 'delete') {
  if (!body.id) {
    return [{
      json: {
        success: false,
        message: 'Thiếu ID để xóa'
      }
    }];
  }

  return [{
    json: {
      action: 'delete',
      id: parseInt(body.id)
    }
  }];
}

// Add/Update action
if (!body.name || !body.page) {
  return [{
    json: {
      success: false,
      message: 'Thiếu thông tin bắt buộc'
    }
  }];
}

return [{
  json: {
    action: body.id ? 'update' : 'insert',
    id: body.id ? parseInt(body.id) : null,
    page: body.page,
    name: body.name.trim(),
    description: body.description?.trim() || ''
  }
}];
```

**IF Node:** Check action

**IF delete:**
```sql
DELETE FROM locations WHERE id = $1
```

**IF update:**
```sql
UPDATE locations
SET name = $2, description = $3
WHERE id = $1
RETURNING id, page, name, description
```

**IF insert:**
```sql
INSERT INTO locations (page, name, description)
VALUES ($1, $2, $3)
RETURNING id, page, name, description
```

---

### 5.8. GET Bandwidth Logs Endpoint

**Postgres Query:**
```sql
SELECT
    id, page, location, event_type,
    bandwidth_change, bandwidth_after,
    note, "user", timestamp
FROM bandwidth_logs
WHERE page = $1
ORDER BY timestamp DESC
LIMIT 1000
```

**Parameters:** `{{ $json.query.page }}`

---

### 5.9. POST Bandwidth Log Endpoint

**Code (Validate):**
```javascript
const body = $input.first().json.body;

if (!body.location || !body.network_type || !body.provider || !body.event_type || !body.bandwidth_change || !body.bandwidth_after) {
  return [{
    json: {
      success: false,
      message: 'Thiếu thông tin bắt buộc'
    }
  }];
}

const validTypes = ['moi', 'tang', 'giam', 'chuyen'];
if (!validTypes.includes(body.event_type)) {
  return [{
    json: {
      success: false,
      message: 'Loại sự kiện không hợp lệ (phải là: moi, tang, giam, hoặc chuyen)'
    }
  }];
}

const validNetworkTypes = ['doanh_nghiep', 'gia_dinh'];
if (!validNetworkTypes.includes(body.network_type)) {
  return [{
    json: {
      success: false,
      message: 'Loại mạng không hợp lệ (phải là: doanh_nghiep hoặc gia_dinh)'
    }
  }];
}

const validProviders = ['viettel', 'vnpt', 'fpt', 'mobifone', 'cmcti', 'spt', 'other'];
if (!validProviders.includes(body.provider)) {
  return [{
    json: {
      success: false,
      message: 'Nhà cung cấp không hợp lệ'
    }
  }];
}

return [{
  json: {
    page: body.page,
    location: body.location.trim(),
    network_type: body.network_type,
    provider: body.provider,
    event_type: body.event_type,
    bandwidth_change: parseFloat(body.bandwidth_change),
    bandwidth_after: parseFloat(body.bandwidth_after),
    note: body.note?.trim() || '',
    user: body.user,
    timestamp: new Date().toISOString()
  }
}];
```

**Postgres (INSERT):**
```sql
INSERT INTO bandwidth_logs
    (page, location, network_type, provider, event_type, bandwidth_change, bandwidth_after, note, "user", timestamp)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING id, page, location, network_type, provider, event_type, bandwidth_change, bandwidth_after, note, "user", timestamp
```

**Parameters:**
- `{{ $json.page }}`
- `{{ $json.location }}`
- `{{ $json.network_type }}`
- `{{ $json.provider }}`
- `{{ $json.event_type }}`
- `{{ $json.bandwidth_change }}`
- `{{ $json.bandwidth_after }}`
- `{{ $json.note }}`
- `{{ $json.user }}`
- `{{ $json.timestamp }}`

---

## BƯỚC 6: Data Migration (Chuyển Data Hiện Tại)

### Option 1: Manual Export/Import (Recommended cho ít data)

#### 6.1. Export từ n8n Data Tables

Tạo workflow:

**Manual Trigger → Get Many (products) → Code (Format CSV) → Write to File**

**Code (Format CSV):**
```javascript
const items = $input.all();

let csv = 'id,page,name,unit,description\n';

items.forEach(item => {
  const data = item.json;
  csv += `${data.id},"${data.page}","${data.name}","${data.unit}","${data.description || '"}"\n`;
});

return [{
  json: { csv },
  binary: {
    data: {
      data: Buffer.from(csv).toString('base64'),
      mimeType: 'text/csv',
      fileName: 'products.csv'
    }
  }
}];
```

Lặp lại cho tất cả 5 tables.

#### 6.2. Import vào Supabase

1. Vào Supabase → **Table Editor**
2. Chọn table (vd: `products`)
3. Click **Insert** → **Import data from CSV**
4. Upload CSV file
5. Map columns
6. Click **Import**

### Option 2: Direct Migration Workflow (Recommended cho nhiều data)

Tạo workflow trong n8n:

**Manual Trigger → Get Many (Data Tables) → Postgres Insert (Batch)**

**Postgres Node:**
```
Operation: Insert
Table: products
Mode: Multiple
Columns to Match On: id
Data: {{ $json }}
```

Lặp lại cho từng table.

---

## BƯỚC 7: Testing & Verification

### 7.1. Test GET Endpoints

```bash
# Test GET products
curl "https://your-n8n.app/webhook/api?endpoint=products&page=RR88&user_id=123456789"

# Test GET transactions
curl "https://your-n8n.app/webhook/api?endpoint=transactions&page=RR88&user_id=123456789"

# Test GET inventory
curl "https://your-n8n.app/webhook/api?endpoint=inventory&page=RR88&user_id=123456789"
```

### 7.2. Test POST Endpoints

```bash
# Test POST transaction
curl -X POST "https://your-n8n.app/webhook/api?endpoint=transactions&page=RR88&user_id=123456789" \
  -H "Content-Type: application/json" \
  -d '{
    "page": "RR88",
    "type": "nhap",
    "product_id": 1,
    "quantity": 10,
    "note": "Test nhập hàng",
    "user": "Admin"
  }'
```

### 7.3. Test Frontend

1. Mở Telegram Mini App
2. Thử các chức năng:
   - ✅ Xem Dashboard
   - ✅ Nhập hàng (đơn & bulk)
   - ✅ Xuất hàng (đơn & bulk)
   - ✅ Xem tồn kho
   - ✅ Xem lịch sử
   - ✅ Quản lý sản phẩm (thêm/sửa)
   - ✅ Quản lý khu vực (thêm/sửa/xóa)
   - ✅ Cập nhật băng thông

---

## BƯỚC 8: Performance Optimization

### 8.1. Refresh Materialized View (Inventory)

Có 3 cách:

**Option 1: Manual Refresh (sau mỗi transaction)**
```sql
SELECT refresh_inventory();
```

**Option 2: Auto Refresh với Trigger**
```sql
CREATE OR REPLACE FUNCTION auto_refresh_inventory()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM refresh_inventory();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_refresh_inventory
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH STATEMENT
EXECUTE FUNCTION auto_refresh_inventory();
```

**Option 3: Scheduled Refresh (mỗi 5 phút)**

Tạo n8n workflow:
- **Schedule Trigger** (Every 5 minutes)
- **Postgres Node**: `SELECT refresh_inventory();`

### 8.2. Add More Indexes (nếu cần)

```sql
-- Index cho full-text search (optional)
CREATE INDEX idx_products_name_gin ON products USING gin(to_tsvector('english', name));

-- Index cho range queries
CREATE INDEX idx_transactions_timestamp_range ON transactions(page, timestamp) WHERE timestamp > NOW() - INTERVAL '30 days';
```

---

## BƯỚC 9: Backup & Rollback Plan

### 9.1. Backup Strategy

**Supabase Auto Backup:**
- Daily automatic backups (Free tier: 7 days retention)
- Point-in-time recovery (Paid tier)

**Manual Backup:**
```bash
# Backup toàn bộ database
pg_dump "postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres" > backup_$(date +%Y%m%d).sql

# Restore từ backup
psql "postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres" < backup_20251128.sql
```

### 9.2. Rollback Plan

Nếu có vấn đề:

1. **Keep old n8n workflows** (đừng xóa Data Tables workflows)
2. **Switch back API_PATH** trong frontend config
3. **Restore from Supabase backup** nếu cần

---

## BƯỚC 10: Monitoring & Maintenance

### 10.1. Supabase Dashboard

Theo dõi:
- **Database Size**: Settings → Database → Database size
- **Connections**: Settings → Database → Active connections
- **Query Performance**: Logs → Postgres Logs

### 10.2. n8n Error Handling

Thêm **Error Trigger** node vào workflows:
- Catch lỗi Postgres
- Log vào table `error_logs` (tùy chọn)
- Gửi alert qua Telegram

---

## 📊 Comparison: Data Tables vs Supabase

| Feature | n8n Data Tables | Supabase Postgres |
|---------|----------------|-------------------|
| **Setup** | Rất dễ (1-click) | Trung bình (cần config) |
| **Performance** | Tốt (< 10k rows) | Rất tốt (millions rows) |
| **Query** | Limited (Get/Insert/Update/Delete) | Full SQL (JOIN, subquery, etc) |
| **Indexing** | ❌ Không có | ✅ Full support |
| **Triggers** | ❌ Không có | ✅ Full support |
| **Backup** | ❌ Manual export | ✅ Auto backup |
| **Real-time** | ❌ Không có | ✅ Có (Supabase Realtime) |
| **Cost** | Included với n8n | Free tier: 500MB |
| **Scalability** | Limited | Rất cao |

---

## 🎯 Final Checklist

- [ ] Tạo Supabase project
- [ ] Chạy migration script (tạo tables)
- [ ] Setup n8n Postgres credentials
- [ ] Update workflow: GET products
- [ ] Update workflow: GET transactions
- [ ] Update workflow: GET inventory
- [ ] Update workflow: POST transaction
- [ ] Update workflow: POST product
- [ ] Update workflow: GET locations
- [ ] Update workflow: POST location
- [ ] Update workflow: GET bandwidth_logs
- [ ] Update workflow: POST bandwidth_log
- [ ] Migrate data từ Data Tables → Supabase
- [ ] Test tất cả endpoints
- [ ] Test frontend Telegram Mini App
- [ ] Setup auto refresh inventory (trigger hoặc schedule)
- [ ] Setup backup strategy
- [ ] Monitor performance 1 tuần

---

## 🚀 Next Steps (Optional)

Sau khi migration thành công, bạn có thể:

1. **Add Supabase Auth** - Thay Telegram auth bằng Supabase Auth
2. **Add Supabase Storage** - Lưu ảnh sản phẩm
3. **Add Supabase Realtime** - Real-time updates cho multiple users
4. **Add Supabase Functions** - Edge functions cho complex logic
5. **Add Supabase Vector** - AI/ML embeddings (optional)

---

**Good luck với migration! 🎉**

**Contact:** https://t.me/PinusITRR88
