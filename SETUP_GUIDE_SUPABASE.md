# 🚀 Setup Guide: Xuất Nhập Hàng with Supabase (Optimized)

**Version:** 3.0.0 (Supabase với Stored Functions)
**Date:** 2025-11-28
**Estimated Time:** 30-40 phút

---

## 📋 Tổng Quan

Hướng dẫn này sử dụng **Supabase PostgreSQL với stored functions** để tối ưu workflow:

### ✨ Điểm Khác Biệt So Với Setup Cũ:

**Setup Cũ (n8n Data Tables):**
- ❌ 1 workflow = 5-10 nodes (Switch → Get/Insert → Code → Response)
- ❌ Validation logic rải rác trong nhiều Code nodes
- ❌ Khó maintain khi số endpoint tăng

**Setup Mới (Supabase + Stored Functions):**
- ✅ 1 workflow = 2-3 nodes (Webhook → Postgres Function → Response)
- ✅ Validation logic tập trung trong database functions
- ✅ Dễ maintain, scale tốt hơn
- ✅ Performance cao hơn (ít network roundtrips)

---

## ⚙️ Điều Kiện Tiên Quyết

- ✅ Supabase account (free tier OK)
- ✅ n8n instance (self-hosted hoặc cloud)
- ✅ File [supabase-schema.sql](supabase-schema.sql)

---

## BƯỚC 1: Setup Supabase (10 phút)

### 1.1. Tạo Supabase Project

1. Truy cập https://supabase.com → Sign up
2. Click **New Project**
3. Điền thông tin:
   - **Name**: `xuatnhaphang`
   - **Database Password**: [tạo password mạnh và LƯU LẠI]
   - **Region**: **Singapore** (gần VN)
4. Click **Create new project**
5. Đợi ~2 phút

### 1.2. Chạy Schema Setup

1. Vào Supabase Dashboard
2. Click **SQL Editor** (📝 icon bên trái)
3. Click **New Query**
4. Mở file `supabase-schema.sql`
5. Copy toàn bộ nội dung
6. Paste vào SQL Editor
7. Click **RUN** ▶️
8. Đợi ~10 giây

**✅ Verify Success:**

Bạn sẽ thấy message cuối cùng:
```
✅ Supabase schema installed successfully!
📊 Tables: 5
🔧 Functions: 6
⚡ Triggers: 1
```

### 1.3. Lấy Connection String

1. **Project Settings** ⚙️ → **Database**
2. Scroll xuống **Connection string**
3. Copy **Connection pooling**:
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```
4. Thay `[PASSWORD]` bằng database password của bạn
5. **LƯU LẠI** connection string này!

---

## BƯỚC 2: Setup n8n Credentials (5 phút)

### 2.1. Add Postgres Credential

1. n8n → **Credentials** (menu bên trái)
2. Click **Add Credential**
3. Search "**Postgres**" → Select
4. Điền thông tin:

**Credential Name:**
```
Supabase - XuatNhapHang
```

**Connection Details:**
- **Host**: `aws-0-ap-southeast-1.pooler.supabase.com`
- **Database**: `postgres`
- **User**: `postgres.[PROJECT-REF]` (lấy từ connection string)
- **Password**: `[your-database-password]`
- **Port**: `6543`
- **SSL**: ✅ **Allow**

5. Click **Test** → Phải thấy ✅ "Connection successful"
6. Click **Save**

---

## BƯỚC 3: Create Workflows (20-30 phút)

### 3.1. Workflow 1: API GET (Universal)

**Tên workflow:** `Supabase-API-GET`

**Mô tả:** Single workflow xử lý TẤT CẢ GET endpoints

#### Nodes:

**1. Webhook Node**
- **HTTP Method**: GET
- **Path**: `api`
- **Response Mode**: Wait for Execution

**2. Code Node (Parse Parameters)**
```javascript
const endpoint = $json.query.endpoint;
const page = $json.query.page || null;
const search = $json.query.search || null;
const userId = $json.query.user_id;

// Check auth (optional - can skip for now)
if (!userId) {
  return [{
    json: {
      success: false,
      message: 'Missing user_id'
    }
  }];
}

return [{
  json: {
    endpoint,
    page,
    search
  }
}];
```

**3. Postgres Node (Call Function)**
- **Credential**: `Supabase - XuatNhapHang`
- **Operation**: **Execute Query**
- **Query**:
```sql
SELECT api_get($1, $2, $3) as result
```
- **Query Parameters**:
  - `{{ $json.endpoint }}`
  - `{{ $json.page }}`
  - `{{ $json.search }}`

**4. Code Node (Format Response)**
```javascript
const result = $input.first().json.result;
return [{ json: result }];
```

**5. Respond to Webhook**

**Save & Activate workflow!**

---

### 3.2. Workflow 2: API POST (Universal)

**Tên workflow:** `Supabase-API-POST`

**Mô tả:** Single workflow xử lý TẤT CẢ POST endpoints

#### Nodes:

**1. Webhook Node**
- **HTTP Method**: POST
- **Path**: `api`
- **Response Mode**: Wait for Execution

**2. Code Node (Route & Validate)**
```javascript
const endpoint = $json.query.endpoint;
const page = $json.query.page;
const userId = $json.query.user_id;
const body = $json.body;

// Check auth
if (!userId) {
  return [{
    json: {
      success: false,
      message: 'Missing user_id'
    }
  }];
}

// Route to appropriate function
let functionName, params;

switch (endpoint) {
  case 'products':
    functionName = 'api_post_product';
    params = [
      body.id || null,
      page,
      body.name,
      body.unit,
      body.description || ''
    ];
    break;

  case 'transactions':
    functionName = 'api_post_transaction';
    params = [
      page,
      body.type,
      parseInt(body.product_id),
      parseFloat(body.quantity),
      body.note || '',
      body.user || 'Unknown'
    ];
    break;

  case 'locations':
    functionName = 'api_post_location';
    params = [
      body.action || 'upsert',
      body.id || null,
      page,
      body.name,
      body.description || ''
    ];
    break;

  case 'bandwidth_logs':
    functionName = 'api_post_bandwidth';
    params = [
      page,
      body.location,
      body.network_type,
      body.provider,
      body.event_type,
      parseFloat(body.bandwidth_change),
      parseFloat(body.bandwidth_after),
      body.note || '',
      body.user || 'Unknown'
    ];
    break;

  default:
    return [{
      json: {
        success: false,
        message: 'Unknown endpoint: ' + endpoint
      }
    }];
}

return [{
  json: {
    functionName,
    params
  }
}];
```

**3. Postgres Node (Call Function)**
- **Credential**: `Supabase - XuatNhapHang`
- **Operation**: **Execute Query**
- **Query**:
```sql
SELECT {{ $json.functionName }}(
  {{ $json.params[0] !== undefined ? '$1' : 'NULL' }},
  {{ $json.params[1] !== undefined ? '$2' : 'NULL' }},
  {{ $json.params[2] !== undefined ? '$3' : 'NULL' }},
  {{ $json.params[3] !== undefined ? '$4' : 'NULL' }},
  {{ $json.params[4] !== undefined ? '$5' : 'NULL' }},
  {{ $json.params[5] !== undefined ? '$6' : 'NULL' }},
  {{ $json.params[6] !== undefined ? '$7' : 'NULL' }},
  {{ $json.params[7] !== undefined ? '$8' : 'NULL' }},
  {{ $json.params[8] !== undefined ? '$9' : 'NULL' }}
) as result
```

**⚠️ LƯU Ý:** Query này phức tạp. Cách đơn giản hơn là tạo riêng 4 Postgres nodes cho 4 endpoints và dùng Switch node để route. Xem phần **Alternative Approach** bên dưới.

**4. Code Node (Format Response)**
```javascript
const result = $input.first().json.result;
return [{ json: result }];
```

**5. Respond to Webhook**

**Save & Activate workflow!**

---

### 3.3. Alternative Approach: Separate POST Workflows

Nếu query động ở trên quá phức tạp, bạn có thể tạo 4 workflows riêng:

#### Workflow: POST Products

**Webhook** → **Code (Parse)** → **Postgres**
```sql
SELECT api_post_product($1, $2, $3, $4, $5) as result
```
Parameters:
- `{{ $json.body.id }}`
- `{{ $json.query.page }}`
- `{{ $json.body.name }}`
- `{{ $json.body.unit }}`
- `{{ $json.body.description }}`

#### Workflow: POST Transactions

**Webhook** → **Code (Parse)** → **Postgres**
```sql
SELECT api_post_transaction($1, $2, $3, $4, $5, $6) as result
```
Parameters:
- `{{ $json.query.page }}`
- `{{ $json.body.type }}`
- `{{ parseInt($json.body.product_id) }}`
- `{{ parseFloat($json.body.quantity) }}`
- `{{ $json.body.note }}`
- `{{ $json.body.user }}`

#### Workflow: POST Locations

**Webhook** → **Code (Parse)** → **Postgres**
```sql
SELECT api_post_location($1, $2, $3, $4, $5) as result
```
Parameters:
- `{{ $json.body.action || 'upsert' }}`
- `{{ $json.body.id }}`
- `{{ $json.query.page }}`
- `{{ $json.body.name }}`
- `{{ $json.body.description }}`

#### Workflow: POST Bandwidth

**Webhook** → **Code (Parse)** → **Postgres**
```sql
SELECT api_post_bandwidth($1, $2, $3, $4, $5, $6, $7, $8, $9) as result
```
Parameters:
- `{{ $json.query.page }}`
- `{{ $json.body.location }}`
- `{{ $json.body.network_type }}`
- `{{ $json.body.provider }}`
- `{{ $json.body.event_type }}`
- `{{ parseFloat($json.body.bandwidth_change) }}`
- `{{ parseFloat($json.body.bandwidth_after) }}`
- `{{ $json.body.note }}`
- `{{ $json.body.user }}`

**👉 Khuyến nghị:** Dùng approach này cho đơn giản. Mỗi workflow chỉ 3-4 nodes.

---

## BƯỚC 4: Test API (10 phút)

### 4.1. Test GET Endpoints

```bash
# Get webhook URL from n8n
WEBHOOK_URL="https://your-n8n.app/webhook/api"

# Test GET products
curl "${WEBHOOK_URL}?endpoint=products&page=RR88&user_id=123456789"

# Test GET transactions
curl "${WEBHOOK_URL}?endpoint=transactions&page=RR88&user_id=123456789"

# Test GET inventory
curl "${WEBHOOK_URL}?endpoint=inventory&page=RR88&user_id=123456789"

# Test GET locations
curl "${WEBHOOK_URL}?endpoint=locations&page=RR88&user_id=123456789"

# Test GET bandwidth_logs
curl "${WEBHOOK_URL}?endpoint=bandwidth_logs&page=RR88&user_id=123456789"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [ ... ]
}
```

### 4.2. Test POST Endpoints

```bash
# Test POST product
curl -X POST "${WEBHOOK_URL}?endpoint=products&page=RR88&user_id=123456789" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "unit": "Piece",
    "description": "Test description"
  }'

# Test POST transaction (nhap)
curl -X POST "${WEBHOOK_URL}?endpoint=transactions&page=RR88&user_id=123456789" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "nhap",
    "product_id": 1,
    "quantity": 10,
    "note": "Test import",
    "user": "Admin"
  }'

# Test POST location
curl -X POST "${WEBHOOK_URL}?endpoint=locations&page=RR88&user_id=123456789" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Location",
    "description": "Test area"
  }'

# Test POST bandwidth
curl -X POST "${WEBHOOK_URL}?endpoint=bandwidth_logs&page=RR88&user_id=123456789" \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Văn phòng tầng 8",
    "network_type": "doanh_nghiep",
    "provider": "ezecom",
    "event_type": "moi",
    "bandwidth_change": 100,
    "bandwidth_after": 100,
    "note": "Test",
    "user": "Admin"
  }'
```

---

## BƯỚC 5: Update Frontend (5 phút)

Frontend code (`XuatNhapHang.html`) **KHÔNG CẦN THAY ĐỔI** nếu bạn giữ nguyên API format!

### Verify API Endpoints

Check các constant trong HTML:

```javascript
const API_BASE = 'https://your-n8n.app/webhook/api';
const CURRENT_PAGE = 'RR88'; // hoặc XX88, MM88
```

**Endpoints phải match:**
- `${API_BASE}?endpoint=products&page=${CURRENT_PAGE}&user_id=${userId}`
- `${API_BASE}?endpoint=transactions&page=${CURRENT_PAGE}&user_id=${userId}`
- `${API_BASE}?endpoint=inventory&page=${CURRENT_PAGE}&user_id=${userId}`
- `${API_BASE}?endpoint=locations&page=${CURRENT_PAGE}&user_id=${userId}`
- `${API_BASE}?endpoint=bandwidth_logs&page=${CURRENT_PAGE}&user_id=${userId}`

---

## 📊 Workflow Comparison

### Old Setup (n8n Data Tables):

**API GET Workflow:**
```
Webhook
  → Switch (5 branches)
    → Branch 1: Get Many (products) → Code → Response
    → Branch 2: Get Many (transactions) → Code → Response
    → Branch 3: Get Many (inventory) → Code → Response
    → Branch 4: Get Many (locations) → Code → Response
    → Branch 5: Get Many (bandwidth_logs) → Code → Response
```
**Total nodes: 16-20 nodes**

### New Setup (Supabase + Functions):

**API GET Workflow:**
```
Webhook
  → Code (parse params)
  → Postgres (call api_get function)
  → Code (format response)
  → Response
```
**Total nodes: 5 nodes** ✅ **70% reduction!**

---

## ✅ Verification Checklist

### Database
- [ ] All 5 tables created (products, transactions, allowed_users, locations, bandwidth_logs)
- [ ] Materialized view `inventory_current` created
- [ ] 6 stored functions created (api_get, api_post_*)
- [ ] Trigger `auto_refresh_inventory` active
- [ ] Sample data inserted

### n8n Workflows
- [ ] Postgres credential configured & tested
- [ ] `Supabase-API-GET` workflow created & active
- [ ] `Supabase-API-POST-*` workflows created & active
- [ ] Webhook URLs copied

### API Testing
- [ ] GET products returns data
- [ ] GET transactions returns data
- [ ] GET inventory calculates correctly
- [ ] GET locations returns data
- [ ] GET bandwidth_logs returns data
- [ ] POST product creates record
- [ ] POST transaction updates inventory
- [ ] POST location CRUD works
- [ ] POST bandwidth creates log

### Frontend
- [ ] Telegram Mini App loads
- [ ] Dashboard displays data
- [ ] Nhập hàng works
- [ ] Xuất hàng works
- [ ] Tồn kho accurate
- [ ] Lịch sử displays
- [ ] Băng thông tracking works

---

## 🚨 Troubleshooting

### Issue 1: Function Not Found

**Error:**
```
ERROR: function api_get(text, text, text) does not exist
```

**Fix:**
1. Verify schema was installed: `SELECT routine_name FROM information_schema.routines WHERE routine_name LIKE 'api_%';`
2. Re-run `supabase-schema.sql`
3. Check function signature matches query parameters

---

### Issue 2: Connection Timeout

**Error:**
```
Error: Connection timeout
```

**Fix:**
1. Use **pooler** connection (port 6543), NOT direct (port 5432)
2. Verify SSL = **Allow**
3. Check Supabase project is active (not paused)

---

### Issue 3: Invalid JSON Response

**Error:**
```
Unexpected token in JSON
```

**Fix:**
Database function returns JSON, but n8n might parse it. Update Code node:
```javascript
const result = $input.first().json.result;
// If result is string, parse it
const parsed = typeof result === 'string' ? JSON.parse(result) : result;
return [{ json: parsed }];
```

---

## 🎯 Next Steps

### 1. Add Authentication (Optional)

Update Code node to use `api_check_user()`:

```javascript
const userId = $json.query.user_id;
const page = $json.query.page;

// Check user permission
const checkResult = await $executeWorkflow('Check-User-Permission', {
  userId,
  page
});

if (!checkResult.allowed) {
  return [{
    json: {
      success: false,
      message: 'Access denied'
    }
  }];
}

// Continue with api call...
```

### 2. Add Rate Limiting

Install Supabase extension:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Add rate limit table
CREATE TABLE api_rate_limit (
  user_id TEXT PRIMARY KEY,
  requests INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Add Logging

```sql
CREATE TABLE api_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT,
  endpoint TEXT,
  method TEXT,
  status INTEGER,
  response_time_ms INTEGER,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

Update workflows to log all requests.

---

## 📚 Documentation

- **[README_SUPABASE.md](README_SUPABASE.md)** - Overview & architecture
- **[supabase-schema.sql](supabase-schema.sql)** - Database schema
- **[DATA_MIGRATION_GUIDE.md](DATA_MIGRATION_GUIDE.md)** - Migrate old data

---

## 📞 Support

**Documentation:**
- Supabase Docs: https://supabase.com/docs
- n8n Postgres Node: https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.postgres/

**Contact:**
- Telegram: https://t.me/PinusITRR88

---

**🎉 Setup Complete! Your API is now powered by Supabase!**

**Performance Benefits:**
- ⚡ 70% fewer nodes
- ⚡ Faster response time (fewer network hops)
- ⚡ Better error handling (database-level validation)
- ⚡ Easier maintenance (logic in one place)

---

**Last Updated:** 2025-11-28
**Version:** 3.0.0
