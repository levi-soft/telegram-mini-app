# 🚀 Hướng Dẫn Setup - Telegram Mini App Quản Lý Xuất Nhập Hàng

Hướng dẫn chi tiết setup Telegram Mini App với n8n backend đơn giản và hiệu quả.

---

## 📋 Yêu Cầu

- **n8n instance** (n8n.cloud hoặc self-hosted)
- **Telegram Bot** (tạo qua @BotFather)

---

## 🤖 Bước 1: Tạo Telegram Bot

### 1.1. Mở Telegram và tìm @BotFather
```
/newbot
```

- Nhập tên bot: "Quản Lý Xuất Nhập Hàng"
- Nhập username: "XuatNhapHangBot"  
- **Lưu Bot Token** (format: `123456789:ABC...`)

### 1.2. Cấu hình Bot
```
/setdescription
```
Nhập: "📦 Quản lý xuất nhập hàng RR88, XX88, MM88"

```
/setabouttext  
```
Nhập: "Ứng dụng quản lý tồn kho chuyên nghiệp"

---

## ⚙️ Bước 2: Setup n8n Data Tables

### 2.1. Tạo Data Table "products"

Vào **Settings** → **Data Tables** → **Create Data Table**

**Tên:** `products`

**Columns:**

| Column | Type | Required | Ghi Chú |
|--------|------|----------|---------|
| product_name | String | ✅ | Tên sản phẩm |
| product_code | String | ✅ | Mã sản phẩm |
| category | String | ❌ | Danh mục |
| price | Number | ❌ | Giá (VND) |
| description | String | ❌ | Mô tả |
| created_at | String | ✅ | Thời gian tạo |
| created_by_user_id | String | ❌ | User ID (Telegram) |
| created_by_username | String | ❌ | Username (Telegram) |

**Lưu ý:** Data Table tự động có cột `id` (auto-increment). Username tự động lấy từ Telegram WebApp API.

### 2.2. Tạo Data Table "transactions"

**Tên:** `transactions`

**Columns:**

| Column | Type | Required | Ghi Chú |
|--------|------|----------|---------|
| type | String | ✅ | "import" hoặc "export" |
| page | String | ✅ | RR88/XX88/MM88 |
| product_id | Number | ✅ | ID sản phẩm (từ products table) |
| quantity | Number | ✅ | Số lượng |
| supplier | String | ❌ | Nhà cung cấp (cho import) |
| customer | String | ❌ | Khách hàng (cho export) |
| note | String | ❌ | Ghi chú |
| timestamp | String | ✅ | Thời gian giao dịch |
| user_id | String | ❌ | Telegram user ID |
| username | String | ❌ | Telegram username |

**Lưu ý:** Cột `id` tự động, cột `product_id` là số (ID từ products table).

### 2.3. Tạo Data Table "inventory"

**Tên:** `inventory`

**Columns:**

| Column | Type | Required | Ghi Chú |
|--------|------|----------|---------|
| product_id | Number | ✅ | ID sản phẩm |
| page | String | ✅ | RR88/XX88/MM88 |
| quantity | Number | ✅ | Số lượng tồn |
| last_updated | String | ✅ | Cập nhật cuối |

**Lưu ý:** `product_id` là Number (ID từ products table, do Data Table tự sinh).

---

## 🔧 Bước 3: Tạo n8n Workflows

### Workflow 1: Serve HTML App

**Mục đích:** Phục vụ HTML cho Telegram Web App

#### Node 1: Webhook
- HTTP Method: `GET`
- Path: `app`
- Response Mode: `Using 'Respond to Webhook' Node`

#### Node 2: HTML
- Node type: **HTML**
- HTML Template: Paste toàn bộ nội dung từ [`XuatNhapHang.html`](XuatNhapHang.html)
- Mode: `HTML5`

#### Node 3: Respond to Webhook
- Respond With: `Text`
- Response Body: `{{ $json.html }}`
- Response Code: `200`
- Response Headers:
  - `Content-Type`: `text/html; charset=utf-8`
  - `Access-Control-Allow-Origin`: `*`

**✅ Workflow 1 hoàn thành!**

**URL:** `https://your-n8n.com/webhook/app`

---

### Workflow 2: API Handler

**Mục đích:** Xử lý các API actions từ app

#### Node 1: Webhook
- HTTP Method: `POST`
- Path: `api`
- Response Mode: `Using 'Respond to Webhook' Node`
- Options → Allowed Origins: `*`

#### Node 2: Switch - Route Actions
- Mode: `Rules`

**Rules:**
1. `{{ $json.body.action }}` equals `addProduct` → Output 0
2. `{{ $json.body.action }}` equals `getProducts` → Output 1
3. `{{ $json.body.action }}` equals `updateProduct` → Output 2
4. `{{ $json.body.action }}` equals `deleteProduct` → Output 3
5. `{{ $json.body.action }}` equals `import` → Output 4
6. `{{ $json.body.action }}` equals `export` → Output 5
7. `{{ $json.body.action }}` equals `getInventory` → Output 6
8. `{{ $json.body.action }}` equals `getTransactions` → Output 7

**Fallback Output:** unknown

---

#### Output 0: Add Product

**Node: Code - Prepare Product**
```javascript
const data = $json.body.data;
const user = $json.body.user || {};
const timestamp = $json.body.timestamp || new Date().toISOString();

return [{
  json: {
    product_name: data.product_name,
    product_code: data.product_code,
    category: data.category || '',
    price: data.price || 0,
    description: data.description || '',
    created_at: timestamp,
    created_by_user_id: user.id || 'unknown',
    created_by_username: user.username || user.first_name || 'unknown'
  }
}];
```

**Lưu ý:**
- Không cần tạo `id`, Data Table tự động sinh
- `created_by_username` tự động lấy từ Telegram user object (username hoặc first_name)

**Node: Data Table - Create**
- Table: `products`
- Operation: `Create`
- Data Mode: `Auto-map Input Data`

---

#### Output 1: Get Products

**Node: Data Table - Read All**
- Table: `products`
- Operation: `Read All`
- Return All: `true`

---

#### Output 2: Update Product

**Node: Code - Prepare Update**
```javascript
const data = $json.body.data;

return [{
  json: {
    id: data.id,
    product_name: data.product_name,
    product_code: data.product_code,
    category: data.category || '',
    price: data.price || 0,
    description: data.description || ''
  }
}];
```

**Node: Data Table - Update**
- Table: `products`
- Operation: `Update`
- Filter Type: `Manual`
- Matching Columns:
  - Column: `id`
  - Value: `{{ $json.id }}`
- Update Fields: Map from $json

---

#### Output 3: Delete Product

**Node: Data Table - Delete**
- Table: `products`
- Operation: `Delete`
- Filter Type: `Manual`
- Matching Columns:
  - Column: `id`
  - Value: `{{ $json.body.data.id }}`

---

#### Output 4: Import (Nhập Hàng)

**Node 1: Code - Prepare Transaction**
```javascript
const data = $json.body.data;
const user = $json.body.user || {};
const timestamp = $json.body.timestamp || new Date().toISOString();

return [{
  json: {
    transaction: {
      id: `tx_${Date.now()}`,
      type: 'import',
      page: data.page,
      product_id: data.product_id,
      quantity: data.quantity,
      supplier: data.supplier || '',
      customer: '',
      note: data.note || '',
      timestamp: timestamp,
      user_id: user.id || 'unknown',
      username: user.username || user.first_name || 'unknown'
    },
    inventory_update: {
      product_id: data.product_id,
      page: data.page,
      quantity: data.quantity
    }
  }
}];
```

**Node 2: Data Table - Create Transaction**
- Table: `transactions`
- Operation: `Create`
- Data Mode: `Manual`
- Map fields từ `$json.transaction.*`

**Node 3: Data Table - Read Inventory**
- Table: `inventory`
- Operation: `Read All`
- Filter Type: `Manual`
- Matching Columns:
  - `product_id` = `{{ $json.inventory_update.product_id }}`
  - `page` = `{{ $json.inventory_update.page }}`

**Node 4: Code - Calculate Inventory**
```javascript
const items = $input.all();
const updateData = items[0].json.inventory_update;
const existingInventory = items[1].json;

let newQuantity = updateData.quantity;
let operation = 'create';

if (existingInventory && existingInventory.length > 0) {
  operation = 'update';
  newQuantity = existingInventory[0].quantity + updateData.quantity;
}

return [{
  json: {
    operation,
    product_id: updateData.product_id,
    page: updateData.page,
    quantity: newQuantity,
    last_updated: new Date().toISOString()
  }
}];
```

**Node 5: IF - Check Operation**
- Condition: `{{ $json.operation }}` equals `create`

**Node 6a: Data Table - Create Inventory** (IF true)
- Table: `inventory`
- Operation: `Create`
- Map fields từ $json

**Node 6b: Data Table - Update Inventory** (IF false)
- Table: `inventory`
- Operation: `Update`
- Matching:
  - `product_id` = `{{ $json.product_id }}`
  - `page` = `{{ $json.page }}`
- Set Fields:
  - `quantity` = `{{ $json.quantity }}`
  - `last_updated` = `{{ $json.last_updated }}`

---

#### Output 5: Export (Xuất Hàng)

**Tương tự Import, nhưng:**

**Code - Calculate Inventory:**
```javascript
const items = $input.all();
const updateData = items[0].json.inventory_update;
const existingInventory = items[1].json;

if (!existingInventory || existingInventory.length === 0) {
  throw new Error('Sản phẩm không có trong kho');
}

const currentQty = existingInventory[0].quantity;

if (currentQty < updateData.quantity) {
  throw new Error(`Không đủ hàng. Tồn kho: ${currentQty}`);
}

return [{
  json: {
    operation: 'update',
    product_id: updateData.product_id,
    page: updateData.page,
    quantity: currentQty - updateData.quantity, // Trừ đi
    last_updated: new Date().toISOString()
  }
}];
```

---

#### Output 6: Get Inventory

**Node: Data Table - Read All**
- Table: `inventory`
- Operation: `Read All`
- Return All: `true`

---

#### Output 7: Get Transactions

**Node: Data Table - Read All**
- Table: `transactions`
- Operation: `Read All`
- Return All: `true`
- Sort: `timestamp DESC` (optional)

---

### Final Nodes - Format & Respond

**Khuyến nghị:** Tất cả 8 outputs từ Switch → kết nối đến **1 Code node** → **1 Respond node**

#### Node: Code - Format Response

**Kết nối:** Tất cả 8 outputs từ Switch → node này

```javascript
// Mỗi execution chỉ chạy 1 path, nên $input.all() chỉ có data từ path đó
const items = $input.all();
const data = items.map(item => item.json);

return [{
  json: {
    success: true,
    data: data.length === 1 ? data[0] : data,
    timestamp: new Date().toISOString(),
    message: 'Thao tác thành công'
  }
}];
```

#### Node: Respond to Webhook
- Respond With: `JSON`
- Response Body: `{{ $json }}`
- Response Code: `200`
- Response Headers:
  - `Content-Type`: `application/json`
  - `Access-Control-Allow-Origin`: `*`

**✅ Workflow 2 hoàn thành!**

---

**💡 Note about Concurrent Users:**

Khi nhiều người dùng cùng lúc, n8n tự động tạo **execution riêng biệt** cho mỗi request:
- User A: Request → Execution 1 → Chạy path addProduct
- User B: Request → Execution 2 → Chạy path import
- User C: Request → Execution 3 → Chạy path export

**Mỗi execution độc lập**, không ảnh hưởng lẫn nhau. Merge All hoàn toàn an toàn và hiệu quả.

---

## 🔗 Bước 4: Cập Nhật HTML

Mở file [`XuatNhapHang.html`](XuatNhapHang.html), tìm dòng 970:

```javascript
const CONFIG = {
    N8N_WEBHOOK_URL: window.location.origin + '/webhook/api',
};
```

✅ **Không cần sửa gì!** API URL tự động được set.

---

## 🤖 Bước 5: Configure Telegram Bot

### 5.1. Setup Web App

Trong Telegram chat với @BotFather:

```
/newapp
```

1. Chọn bot của bạn
2. Title: "Quản Lý Xuất Nhập Hàng"
3. Description: "Quản lý tồn kho RR88, XX88, MM88"
4. Photo: Upload icon (640x640px - optional)
5. **Web App URL:** `https://your-n8n.com/webhook/app`
6. Short name: `xuatnhaphang`

✅ Done!

---

## ✅ Bước 6: Testing

### 6.1. Test HTML Rendering

1. Mở browser
2. Truy cập: `https://your-n8n.com/webhook/app`
3. ✅ Verify: Hiển thị app HTML

### 6.2. Test API

```bash
curl -X POST https://your-n8n.com/webhook/api \
  -H "Content-Type: application/json" \
  -d '{
    "action": "getProducts",
    "data": {},
    "timestamp": "2025-11-06T15:00:00.000Z",
    "user": {"id": "test"}
  }'
```

**Expected:**
```json
{
  "success": true,
  "data": [],
  "timestamp": "...",
  "message": "Thao tác thành công"
}
```

### 6.3. Test Telegram Bot

1. Mở Telegram → Tìm bot
2. Click `/start`
3. Click **Menu button** hoặc **Open Web App**
4. ✅ App mở trong Telegram

### 6.4. Test Full Flow

**Test 1: Add Product**
1. Tab "Sản Phẩm" → Thêm sản phẩm
2. ✅ Success alert

**Test 2: Import**
1. Tab "Nhập Hàng" → RR88 → Số lượng: 10
2. ✅ Inventory updated

**Test 3: Check Inventory**
1. Tab "Tồn Kho"
2. ✅ Hiển thị đúng quantity

**Test 4: Export**
1. Tab "Xuất Hàng" → Xuất 5
2. ✅ Inventory giảm xuống 5

**Test 5: History**
1. Tab "Lịch Sử"
2. ✅ Hiển thị 2 transactions

---

## 🔍 Troubleshooting

### HTML không hiển thị
- Check Workflow 1 đã activate
- Verify HTML node có content
- Test URL trong browser: `https://your-n8n.com/webhook/app`

### API không response
- Check Workflow 2 đã activate
- Verify webhook path: `api`
- Check CORS headers
- Test với curl

### Telegram Web App không mở
- Đảm bảo URL có HTTPS
- Re-configure bot: `/newapp`
- Clear Telegram cache

### Demo Mode luôn active
- Open browser console (F12)
- Check Network tab
- Verify API URL
- Check CORS headers

---

## 📊 Workflow Structure

### Workflow 1: HTML App (Đơn giản)
```
Webhook (GET) → HTML Node → Respond to Webhook
```

### Workflow 2: API Handler
```
Webhook (POST)
    ↓
Switch (8 Actions)
    ├─ [0] addProduct → Code → Data Table Create
    ├─ [1] getProducts → Data Table Read All
    ├─ [2] updateProduct → Code → Data Table Update
    ├─ [3] deleteProduct → Data Table Delete
    ├─ [4] import → Code → Create TX → Read Inv → Calculate → Create/Update Inv
    ├─ [5] export → Code → Create TX → Read Inv → Validate → Update Inv
    ├─ [6] getInventory → Data Table Read All
    └─ [7] getTransactions → Data Table Read All
            ↓
        (Tất cả paths merge lại)
            ↓
    Code - Format Response
            ↓
    Respond to Webhook (JSON)
```

**Lưu ý:** Tất cả 8 outputs từ Switch kết nối đến cùng 1 Code - Format Response node

---

## 💡 Tips

### Development
- Enable execution log trong n8n
- Test từng node riêng lẻ
- Set timeout đủ lớn

### Data Tables
- Backup thường xuyên
- Monitor table size
- Create indexes nếu cần

### Performance
- Optimize Code nodes
- Limit transaction lookups
- Cache khi cần

### Security
- Validate input
- Rate limiting
- Check authentication (optional)

---

## 📚 URLs Summary

| Purpose | URL |
|---------|-----|
| HTML | `https://your-n8n.com/webhook/app` |
| API | `https://your-n8n.com/webhook/api` |
| Bot Web App | Same as HTML URL |

---

## 🎯 Checklist

- [ ] Bot created (@BotFather)
- [ ] 3 Data Tables created
- [ ] Workflow 1 created & activated (HTML)
- [ ] Workflow 2 created & activated (API)
- [ ] Bot Web App configured
- [ ] HTML tested
- [ ] API tested
- [ ] Telegram bot tested
- [ ] Full flow tested

---

## 📖 Resources

- [n8n Documentation](https://docs.n8n.io)
- [n8n Data Tables](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.n8ndatatable/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegram Web Apps](https://core.telegram.org/bots/webapps)

---

## 🎉 Done!

Ứng dụng đã sẵn sàng! 🚀

**Features:**
- ✅ 6 chức năng chính
- ✅ n8n backend với Data Tables
- ✅ HTML serve từ n8n (đơn giản)
- ✅ 2 workflows riêng biệt
- ✅ Production-ready

**Need help?** Check README.md hoặc n8n execution logs!

---

**Version:** 1.0.0  
**Last Updated:** 2025-11-06