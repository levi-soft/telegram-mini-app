# 🚀 Hướng Dẫn Setup - Telegram Mini App Quản Lý Xuất Nhập Hàng

Hướng dẫn chi tiết setup Telegram Mini App với n8n Data Table backend.

---

## 📋 Yêu Cầu

- **n8n instance** (n8n.cloud hoặc self-hosted)
- **Telegram Bot** (tạo qua @BotFather)

---

## 🤖 Bước 1: Tạo Telegram Bot

### 1.1. Tạo Bot
```
/newbot
```
- Tên: "Quản Lý Xuất Nhập Hàng"
- Username: "XuatNhapHangBot"
- **Lưu Bot Token**

### 1.2. Cấu hình
```
/setdescription
📦 Quản lý xuất nhập hàng RR88, XX88, MM88

/setabouttext
Ứng dụng quản lý tồn kho chuyên nghiệp
```

---

## ⚙️ Bước 2: Setup Data Tables

### 2.1. Table: products

**Settings** → **Data Tables** → **Create**

| Column | Type | Required |
|--------|------|----------|
| **products_id** | String | ✅ |
| product_name | String | ✅ |
| product_code | String | ✅ |
| category | String | ❌ |
| price | Number | ❌ |
| description | String | ❌ |
| created_at | String | ✅ |
| created_by_user_id | String | ❌ |
| created_by_username | String | ❌ |

**Primary Key:** `products_id` (format: `prod_timestamp`)

### 2.2. Table: transactions

| Column | Type | Required |
|--------|------|----------|
| **transactions_id** | String | ✅ |
| type | String | ✅ |
| page | String | ✅ |
| **products_id** | String | ✅ |
| quantity | Number | ✅ |
| supplier | String | ❌ |
| customer | String | ❌ |
| note | String | ❌ |
| timestamp | String | ✅ |
| user_id | String | ❌ |
| username | String | ❌ |

**Primary Key:** `transactions_id`  
**Foreign Key:** `products_id` → products.products_id

### 2.3. Table: inventory

| Column | Type | Required |
|--------|------|----------|
| **inventory_id** | String | ✅ |
| **products_id** | String | ✅ |
| page | String | ✅ |
| quantity | Number | ✅ |
| last_updated | String | ✅ |

**Primary Key:** `inventory_id`  
**Composite Unique:** products_id + page

---

## 🔧 Bước 3: Workflows

### Workflow 1: HTML (3 nodes)

**Node 1: Webhook**
- Method: GET
- Path: `app`
- Response Mode: `Using 'Respond to Webhook' Node`

**Node 2: HTML**
- Paste [`XuatNhapHang.html`](XuatNhapHang.html)
- Mode: HTML5

**Node 3: Respond to Webhook**
- Respond With: Text
- Body: `{{ $json.html }}`
- Headers:
  - Content-Type: `text/html; charset=utf-8`
  - Access-Control-Allow-Origin: `*`

---

### Workflow 2: API

**Node 1: Webhook**
- Method: POST
- Path: `api`
- Response Mode: `Using 'Respond to Webhook' Node`

**Node 2: Switch**

Rules:
1. `{{ $json.body.action }}` = `addProduct` → 0
2. `{{ $json.body.action }}` = `getProducts` → 1
3. `{{ $json.body.action }}` = `updateProduct` → 2
4. `{{ $json.body.action }}` = `deleteProduct` → 3
5. `{{ $json.body.action }}` = `import` → 4
6. `{{ $json.body.action }}` = `export` → 5
7. `{{ $json.body.action }}` = `getInventory` → 6
8. `{{ $json.body.action }}` = `getTransactions` → 7

---

### Output 0: addProduct

**Code:**
```javascript
const data = $json.body.data;
const user = $json.body.user || {};

return [{
  json: {
    products_id: `prod_${Date.now()}`,
    product_name: data.product_name,
    product_code: data.product_code,
    category: data.category || '',
    price: data.price || 0,
    description: data.description || '',
    created_at: new Date().toISOString(),
    created_by_user_id: user.id || 'unknown',
    created_by_username: user.username || user.first_name || 'unknown'
  }
}];
```

**Data Table:**
- Table: `products`
- Operation: Create
- Map: Auto

**Respond:**
```json
{
  "success": true,
  "data": "{{ $json }}",
  "timestamp": "{{ $now }}"
}
```

---

### Output 1: getProducts

**Data Table:**
- Table: `products`
- Operation: Read All
- Return All: true

**Respond:**
```json
{
  "success": true,
  "data": "{{ $json }}",
  "timestamp": "{{ $now }}"
}
```

---

### Output 2: updateProduct

**Data Table:**
- Table: `products`
- Operation: Update
- Filter: `products_id` = `{{ $json.body.data.id }}`
- Fields:
  - product_name
  - product_code
  - category
  - price
  - description

**Respond:** (same as above)

---

### Output 3: deleteProduct

**Data Table:**
- Table: `products`
- Operation: Delete
- Filter: `products_id` = `{{ $json.body.data.id }}`

**Respond:** (same)

---

### Output 4: import

**Code:**
```javascript
const data = $json.body.data;
const user = $json.body.user || {};

return [{
  json: {
    transactions_id: `tx_${Date.now()}`,
    type: 'import',
    page: data.page,
    products_id: data.product_id,
    quantity: data.quantity,
    supplier: data.supplier || '',
    customer: '',
    note: data.note || '',
    timestamp: new Date().toISOString(),
    user_id: user.id || 'unknown',
    username: user.username || user.first_name || 'unknown'
  }
}];
```

**Data Table - Create TX**

**Data Table - Read Inventory:**
- Filter: `products_id` = `{{ $json.products_id }}` AND `page` = `{{ $json.page }}`

**Code - Calculate:**
```javascript
const tx = $input.first().json;
const inv = $input.last().json;

if (inv && inv.length > 0) {
  return [{
    json: {
      update: true,
      inventory_id: inv[0].inventory_id,
      quantity: inv[0].quantity + tx.quantity,
      last_updated: new Date().toISOString()
    }
  }];
}

return [{
  json: {
    update: false,
    inventory_id: `inv_${Date.now()}`,
    products_id: tx.products_id,
    page: tx.page,
    quantity: tx.quantity,
    last_updated: new Date().toISOString()
  }
}];
```

**IF:** `{{ $json.update }}` = true

**True:** Update Inventory  
**False:** Create Inventory

**Respond:** (same)

---

### Output 5: export

Tương tự import, nhưng:
- type: 'export'
- quantity: Trừ đi
- customer thay vì supplier

---

### Output 6: getInventory

**Data Table - Read All**

**Respond:** (same)

---

### Output 7: getTransactions

**Data Table - Read All**

**Respond:** (same)

---

## 🔗 Bước 4: Configure Bot

```
/newapp
```
- Title: "Quản Lý Xuất Nhập Hàng"
- URL: `https://your-n8n.com/webhook/app`

---

## ✅ Testing

### Test API
```bash
curl -X POST https://your-n8n.com/webhook/api \
  -H "Content-Type: application/json" \
  -d '{
    "action": "getProducts",
    "data": {},
    "user": {"id": "test"}
  }'
```

### Expected
```json
{
  "success": true,
  "data": [],
  "timestamp": "..."
}
```

---

## 🔍 Troubleshooting

### Products không hiển thị
1. Check Data Table có data
2. Verify response format: `{ success: true, data: [...] }`
3. Check browser console

### Execution treo
- Đảm bảo mọi path có Respond node
- Response Mode: `Using 'Respond to Webhook' Node`

---

## 📊 Schema Final

**products:** products_id, product_name, product_code, ...  
**transactions:** transactions_id, products_id, username, ...  
**inventory:** inventory_id, products_id, page, ...

---

**Version:** 1.0.0  
**Backend:** n8n Data Table  
**IDs:** products_id (prod_timestamp)