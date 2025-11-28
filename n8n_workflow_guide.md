# Hướng Dẫn Tạo n8n Workflow Tối Ưu

## Tổng Quan

Workflow mới sẽ giảm từ ~40-50 nodes xuống ~15-20 nodes bằng cách:
1. Gộp GET và POST thành 1 workflow
2. Dùng Code node thay vì nhiều nodes riêng lẻ
3. Sử dụng PostgreSQL node kết nối Supabase

---

## Bước 1: Cấu Hình PostgreSQL Credentials

### 1.1 Lấy Connection String từ Supabase
1. Vào Supabase Dashboard → Project Settings → Database
2. Copy connection string (Transaction pooler - Port 6543)
3. Thay `[YOUR-PASSWORD]` bằng database password

### 1.2 Tạo Credentials trong n8n
1. Vào n8n → Credentials → New Credential
2. Chọn **PostgreSQL**
3. Điền thông tin:
   - **Host:** `aws-0-ap-southeast-1.pooler.supabase.com` (hoặc host của bạn)
   - **Database:** `postgres`
   - **User:** `postgres.xxxxx` (project ref)
   - **Password:** Database password
   - **Port:** `6543` (Transaction pooler)
   - **SSL:** Enable (Verify-Full hoặc Require)

---

## Bước 2: Workflow Frontend (Giữ nguyên)

Workflow serve HTML - không cần thay đổi.

```
[Webhook GET /app] → [HTML Node] → [Respond to Webhook]
```

---

## Bước 3: Workflow API Mới (Gộp GET + POST)

### 3.1 Cấu Trúc Workflow

```
[Webhook] → [Code: Parse Request] → [PostgreSQL: Auth] → [IF: Authorized?]
                                                              ↓
                    ┌─────────────────────────────────────────┴─────────────────────────────────────────┐
                    ↓                                                                                   ↓
            [Code: Build Query]                                                              [Respond: Unauthorized]
                    ↓
            [PostgreSQL: Execute]
                    ↓
            [Code: Format Response]
                    ↓
            [Respond to Webhook]
```

### 3.2 Chi Tiết Từng Node

---

#### NODE 1: Webhook
- **Name:** `Webhook API`
- **HTTP Method:** `All` (để nhận cả GET và POST)
- **Path:** `api`
- **Response Mode:** `Last Node`

---

#### NODE 2: Code - Parse Request
- **Name:** `Parse Request`
- **Mode:** `Run Once for All Items`

```javascript
// Lấy thông tin request từ Webhook
const request = $input.first().json;

// ========== QUAN TRỌNG: Lấy HTTP Method đúng cách ==========
// Trong n8n Webhook, method nằm trong headers hoặc $request
// Cách 1: Từ headers (nếu Webhook trả về)
// Cách 2: Từ body nếu có
// Cách 3: Kiểm tra có body hay không để xác định POST/GET

let method = 'GET';

// Kiểm tra các cách lấy method
if (request.headers && request.headers[':method']) {
    // HTTP/2 header
    method = request.headers[':method'].toUpperCase();
} else if (request.headers && request.headers['x-http-method']) {
    // Custom header
    method = request.headers['x-http-method'].toUpperCase();
} else if (request.method) {
    // Trực tiếp từ request object
    method = request.method.toUpperCase();
} else if (request.body && Object.keys(request.body).length > 0) {
    // Nếu có body với data → là POST
    method = 'POST';
}

// Debug log (có thể xóa sau khi test xong)
console.log('Detected method:', method);
console.log('Request body:', JSON.stringify(request.body));

// Lấy query parameters
const query = request.query || {};
const endpoint = query.endpoint || '';
const page = query.page || '';
const userId = query.user_id || '';

// Lấy body (cho POST)
const body = request.body || {};

// Validate
if (!endpoint) {
    return [{
        json: { error: 'Missing endpoint parameter', success: false }
    }];
}

if (!userId) {
    return [{
        json: { error: 'Missing user_id parameter', success: false }
    }];
}

return [{
    json: {
        method,
        endpoint,
        page: page || body.page || '',
        userId,
        body,
        // Query để check auth
        authQuery: `SELECT telegram_id, pages, role, active FROM allowed_users WHERE telegram_id = ${userId} AND active = true`
    }
}];
```

**LƯU Ý QUAN TRỌNG:** Nếu vẫn không nhận đúng method, hãy kiểm tra output của Webhook node để xem structure thực tế. Trong n8n, bạn có thể:
1. Thêm một **Set node** sau Webhook để debug
2. Hoặc dùng **Expression Editor** xem `{{ $json }}` chứa gì

---

#### NODE 3: PostgreSQL - Auth Check
- **Name:** `Check Auth`
- **Credential:** Supabase PostgreSQL
- **Operation:** `Execute Query`
- **Query:** `{{ $json.authQuery }}`

---

#### NODE 4: IF - Authorized Check
- **Name:** `Authorized?`
- **Conditions:**
  - `{{ $json.telegram_id }}` exists (is not empty)

**True branch** → tiếp tục xử lý
**False branch** → respond unauthorized

---

#### NODE 5 (False): Code - Unauthorized Response
- **Name:** `Unauthorized Response`
- **Mode:** `Run Once for All Items`

```javascript
return [{
    json: {
        success: false,
        error: "Unauthorized",
        message: "Bạn không có quyền truy cập"
    }
}];
```

Sau đó nối đến **Respond to Webhook** với Response Code `403`.

---

#### NODE 6 (True): Code - Build Query
- **Name:** `Build Query`
- **Mode:** `Run Once for All Items`

```javascript
// Lấy auth result
const authResult = $input.first().json;
const parseRequest = $('Parse Request').first().json;
const { method, endpoint, page, userId, body } = parseRequest;

// Kiểm tra page được phép
const allowedPages = (authResult.pages || '').split(',').map(p => p.trim());
if (page && !allowedPages.includes(page)) {
    return [{
        json: {
            success: false,
            error: 'Page not allowed',
            skipQuery: true
        }
    }];
}

// Build SQL query
let sql = '';
let returnDirectly = null;

// ========== GET REQUESTS ==========
if (method === 'GET') {
    switch (endpoint) {
        case 'check_auth':
            returnDirectly = {
                success: true,
                authorized: true,
                pages: authResult.pages,
                role: authResult.role
            };
            break;

        case 'products':
            sql = `SELECT id, name, unit, description, page, created_at
                   FROM products
                   WHERE page = '${page}'
                   ORDER BY name ASC`;
            break;

        case 'transactions':
            sql = `SELECT t.id, t.type, t.product_id, t.quantity, t.note,
                          t.page, t.user_name, t.timestamp,
                          p.name as product_name, p.unit
                   FROM transactions t
                   LEFT JOIN products p ON t.product_id = p.id
                   WHERE t.page = '${page}'
                   ORDER BY t.timestamp DESC
                   LIMIT 500`;
            break;

        case 'inventory':
            sql = `SELECT product_id, product_name, unit, page, quantity
                   FROM inventory
                   WHERE page = '${page}'
                   ORDER BY product_name ASC`;
            break;

        case 'locations':
            sql = `SELECT id, page, name, description, created_at
                   FROM locations
                   WHERE page = '${page}'
                   ORDER BY name ASC`;
            break;

        case 'bandwidth_logs':
            sql = `SELECT id, page, location, network_type, provider,
                          event_type, bandwidth_change, bandwidth_after,
                          note, user_name, timestamp
                   FROM bandwidth_logs
                   WHERE page = '${page}'
                   ORDER BY timestamp DESC
                   LIMIT 500`;
            break;

        case 'current_bandwidth':
            sql = `SELECT page, location, network_type, provider, bandwidth, timestamp
                   FROM current_bandwidth
                   WHERE page = '${page}'`;
            break;

        default:
            returnDirectly = { success: false, error: 'Unknown endpoint' };
    }
}

// ========== POST REQUESTS ==========
else if (method === 'POST') {
    switch (endpoint) {
        case 'products':
            // Escape single quotes
            const prodName = (body.name || '').replace(/'/g, "''");
            const prodUnit = (body.unit || '').replace(/'/g, "''");
            const prodDesc = (body.description || '').replace(/'/g, "''");

            if (body.id) {
                // Update existing
                sql = `UPDATE products
                       SET name = '${prodName}',
                           unit = '${prodUnit}',
                           description = '${prodDesc}',
                           updated_at = NOW()
                       WHERE id = ${body.id} AND page = '${page}'
                       RETURNING *`;
            } else {
                // Insert new
                sql = `INSERT INTO products (name, unit, description, page)
                       VALUES ('${prodName}', '${prodUnit}', '${prodDesc}', '${page}')
                       ON CONFLICT (name, page)
                       DO UPDATE SET unit = EXCLUDED.unit,
                                     description = EXCLUDED.description,
                                     updated_at = NOW()
                       RETURNING *`;
            }
            break;

        case 'transactions':
            const txNote = (body.note || '').replace(/'/g, "''");
            const txUser = (body.user || 'Unknown').replace(/'/g, "''");
            const txType = body.type || 'nhap';
            const txProductId = parseInt(body.product_id) || 0;
            const txQuantity = parseInt(body.quantity) || 0;

            // Validate
            if (!txProductId || !txQuantity) {
                returnDirectly = { success: false, error: 'Missing product_id or quantity' };
                break;
            }

            // Nếu là xuất, cần check tồn kho trước
            if (txType === 'xuat') {
                sql = `WITH inventory_check AS (
                         SELECT quantity FROM inventory
                         WHERE product_id = ${txProductId} AND page = '${page}'
                       ),
                       insert_result AS (
                         INSERT INTO transactions (type, product_id, quantity, note, page, user_name, telegram_user_id)
                         SELECT '${txType}', ${txProductId}, ${txQuantity}, '${txNote}', '${page}', '${txUser}', ${userId}
                         WHERE (SELECT quantity FROM inventory_check) >= ${txQuantity}
                         RETURNING *
                       )
                       SELECT
                         CASE WHEN (SELECT COUNT(*) FROM insert_result) > 0
                              THEN 'success'
                              ELSE 'insufficient_stock'
                         END as status,
                         (SELECT quantity FROM inventory_check) as current_stock,
                         (SELECT * FROM insert_result) as result`;
            } else {
                // Nhập hàng - không cần check
                sql = `INSERT INTO transactions (type, product_id, quantity, note, page, user_name, telegram_user_id)
                       VALUES ('${txType}', ${txProductId}, ${txQuantity}, '${txNote}', '${page}', '${txUser}', ${userId})
                       RETURNING *`;
            }
            break;

        case 'locations':
            const locName = (body.name || '').replace(/'/g, "''");
            const locDesc = (body.description || '').replace(/'/g, "''");

            if (body.action === 'delete' && body.id) {
                sql = `DELETE FROM locations WHERE id = ${body.id} AND page = '${page}' RETURNING id`;
            } else if (body.id) {
                // Update
                sql = `UPDATE locations
                       SET name = '${locName}', description = '${locDesc}'
                       WHERE id = ${body.id} AND page = '${page}'
                       RETURNING *`;
            } else {
                // Insert
                sql = `INSERT INTO locations (page, name, description)
                       VALUES ('${page}', '${locName}', '${locDesc}')
                       ON CONFLICT (name, page) DO UPDATE SET description = EXCLUDED.description
                       RETURNING *`;
            }
            break;

        case 'bandwidth_logs':
            const bwLocation = (body.location || '').replace(/'/g, "''");
            const bwNote = (body.note || '').replace(/'/g, "''");
            const bwUser = (body.user || 'Unknown').replace(/'/g, "''");

            sql = `INSERT INTO bandwidth_logs
                   (page, location, network_type, provider, event_type,
                    bandwidth_change, bandwidth_after, note, user_name, telegram_user_id)
                   VALUES
                   ('${page}', '${bwLocation}', '${body.network_type}', '${body.provider}',
                    '${body.event_type}', ${body.bandwidth_change || 0}, ${body.bandwidth_after || 0},
                    '${bwNote}', '${bwUser}', ${userId})
                   RETURNING *`;
            break;

        case 'delete_product':
            if (body.id) {
                sql = `DELETE FROM products WHERE id = ${body.id} AND page = '${page}' RETURNING id`;
            } else {
                returnDirectly = { success: false, error: 'Missing product id' };
            }
            break;

        default:
            returnDirectly = { success: false, error: 'Unknown endpoint' };
    }
}

// Return
if (returnDirectly) {
    return [{
        json: { ...returnDirectly, skipQuery: true }
    }];
}

return [{
    json: { sql, skipQuery: false }
}];
```

---

#### NODE 7: IF - Skip Query Check
- **Name:** `Need Query?`
- **Conditions:**
  - `{{ $json.skipQuery }}` equals `false`

**True branch** → Execute PostgreSQL
**False branch** → Go to Format Response (skip query)

---

#### NODE 8: PostgreSQL - Execute Query
- **Name:** `Execute Query`
- **Credential:** Supabase PostgreSQL
- **Operation:** `Execute Query`
- **Query:** `{{ $json.sql }}`
- **Options:** Return all results

---

#### NODE 9: Code - Format Response
- **Name:** `Format Response`
- **Mode:** `Run Once for All Items`

```javascript
// Check nếu đã có response từ Build Query (skipQuery = true)
const buildQueryResult = $('Build Query').first().json;

if (buildQueryResult.skipQuery) {
    // Trả về trực tiếp kết quả từ Build Query
    return [{
        json: buildQueryResult
    }];
}

// Lấy data từ PostgreSQL
const data = $input.all().map(i => i.json);

// Check lỗi xuất hàng (insufficient stock)
if (data.length > 0 && data[0].status === 'insufficient_stock') {
    return [{
        json: {
            success: false,
            error: 'Insufficient stock',
            message: `Không đủ hàng trong kho! Tồn kho hiện tại: ${data[0].current_stock || 0}`,
            current_stock: data[0].current_stock || 0
        }
    }];
}

// Response format chuẩn
return [{
    json: {
        success: true,
        data: data
    }
}];
```

---

#### NODE 10: Respond to Webhook
- **Name:** `Respond Success`
- **Response Code:** `200`
- **Response Body:** `{{ JSON.stringify($json) }}`
- **Headers:**
  - `Content-Type`: `application/json`

---

## Bước 4: Workflow Google Sheets (Tối ưu)

### Cấu trúc đơn giản:

```
[Webhook POST /sync_gsheet] → [Code: Prepare Data] → [Google Sheets: Update] → [Respond]
```

### Code Node - Prepare Data:

```javascript
const body = $input.first().json.body;

// Chuẩn bị data cho từng sheet
const inventory = body.inventory || {};
const transactions = body.transactions || [];

// Format cho Google Sheets
return [{
    json: {
        RR88: inventory.RR88 || [],
        XX88: inventory.XX88 || [],
        MM88: inventory.MM88 || [],
        history: transactions.slice(0, 100) // Giới hạn 100 dòng gần nhất
    }
}];
```

---

## Tổng Kết

### So sánh số nodes:

| Workflow | Trước | Sau |
|----------|-------|-----|
| Frontend | 3 | 3 |
| API GET | 15 | - |
| API POST | 20 | - |
| API (gộp) | - | 10 |
| Google Sheets | 10 | 4 |
| **Tổng** | **~48** | **~17** |

### Giảm: ~65% nodes

---

## Lưu Ý Quan Trọng

1. **SQL Injection:** Code đã escape single quotes, nhưng nên validate input kỹ hơn
2. **Error Handling:** Thêm try-catch trong Code nodes nếu cần
3. **Rate Limiting:** Supabase có giới hạn connections, dùng connection pooling
4. **Backup:** Workflow cũ nên disable thay vì xóa để có thể rollback

---

## Checklist Deploy

- [ ] Tạo Supabase project
- [ ] Chạy `supabase_schema.sql`
- [ ] Thêm test user vào `allowed_users`
- [ ] Tạo PostgreSQL credential trong n8n
- [ ] Tạo workflow mới theo hướng dẫn
- [ ] Test từng endpoint
- [ ] Migrate data (user tự làm)
- [ ] Disable workflow cũ
