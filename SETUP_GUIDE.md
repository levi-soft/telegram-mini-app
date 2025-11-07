# 🚀 Setup Guide - Telegram Mini App Xuất Nhập Hàng

Hướng dẫn setup với n8n phiên bản mới nhất.

## 📋 Yêu Cầu

- ✅ n8n Instance (Cloud hoặc Self-hosted)
- ✅ Telegram Account

---

## 🎯 Architecture Đơn Giản

```
Telegram Mini App
    ↓
┌─────────────────────────────────────┐
│ n8n Workflows                       │
│                                     │
│ Webhook "app" → HTML → Respond      │ (Frontend)
│                                     │
│ Webhook "api-get" → Switch → Query  │ (API GET)
│                                     │
│ Webhook "api-post" → Switch → Insert│ (API POST)
└─────────────────────────────────────┘
         ↓
   Data Tables
```

**Lý do tách riêng:** n8n webhook chỉ chọn được 1 HTTP method

---

## 🚀 Setup Trong 4 Bước

### BƯỚC 1: Tạo Data Tables

Vào n8n → **Settings** → **Data Tables**

#### 1.1. Table "products"

Click **Create Table** → Tên: `products`

**Columns:**
- `name` - Text - Required
- `unit` - Text - Required  
- `description` - Text - Optional
- `page` - Text - Required
- `created_at` - Date - Auto

**Sample data:**
```
Bàn phím cơ | Cái | Gaming keyboard | RR88
Chuột máy tính | Cái | Wired mouse | RR88
Tai nghe | Cái | Bluetooth | XX88
USB 32GB | Cái | Kingston | XX88
Balo laptop | Cái | 15 inch | MM88
```

#### 1.2. Table "transactions"

Click **Create Table** → Tên: `transactions`

**Columns:**
- `type` - Text - Required (nhap/xuat)
- `product_id` - Number - Required
- `quantity` - Number - Required
- `note` - Text - Optional
- `page` - Text - Required
- `user` - Text - Required (first_name từ Telegram)
- `timestamp` - Date - Auto

---

### BƯỚC 2: Workflow Frontend

#### 2.1. Tạo Workflow

**Name:** `XuatNhapHang-Frontend`

#### 2.2. Add Webhook Node

- HTTP Method: **GET**
- Path: **app**
- Respond: **Immediately**
- Response Mode: **Last Node**

#### 2.3. Add HTML Node

- Copy [`XuatNhapHang.html`](XuatNhapHang.html:1)
- Paste vào **HTML Content**

#### 2.4. Update Config trong HTML

Tìm và sửa:
```javascript
const CONFIG = {
    N8N_WEBHOOK_URL: 'https://n8n.tayninh.cloud/webhook',
    API_PATH: 'api',
};
```

Thay `n8n.tayninh.cloud` bằng domain n8n của bạn.

#### 2.5. Add Respond Node

- Respond With: **Text**
- Response Body: `{{ $json.html }}`
- Headers: `Content-Type: text/html; charset=utf-8`

#### 2.6. Save & Activate

**Frontend URL:** `https://your-n8n.app/webhook/app`

---

### BƯỚC 3: Workflow API - GET Requests

#### 3.1. Tạo Workflow

**Name:** `XuatNhapHang-API-GET`

#### 3.2. Add Webhook Node

- HTTP Method: **GET**
- Path: **api**
- Respond: **Using 'Respond to Webhook' Node**

#### 3.3. Add Switch Node

Click **+** → **Switch**

**Mode:** Rules

**Add 3 Rules:**

**Rule 1 - Products:**
- Value 1: `{{ $json.query.endpoint }}`
- Operation: **Equal**
- Value 2: `products`

**Rule 2 - Transactions:**
- Value 1: `{{ $json.query.endpoint }}`
- Operation: **Equal**
- Value 2: `transactions`

**Rule 3 - Inventory:**
- Value 1: `{{ $json.query.endpoint }}`
- Operation: **Equal**
- Value 2: `inventory`

#### 3.4. Output 0 - GET Products

Switch output 0 → **Get Many** node:
- Table: **products**
- Return All: **ON**
- Filter:
  - Field: `page`
  - Operator: **Equal**
  - Value: `{{ $json.query.page }}`
- Sort: `name` **ASC**

→ **Code** node (Format):
```javascript
return [{
  json: {
    success: true,
    data: $input.all().map(i => i.json)
  }
}];
```

→ **Respond to Webhook**

#### 3.5. Output 1 - GET Transactions

Switch output 1 → **Get Many** node:
- Table: **transactions**
- Return All: **ON**
- Filter: `page` **Equal** `{{ $json.query.page }}`
- Sort: `timestamp` **DESC**
- Limit: **100**

→ **Code** node (Format response):
```javascript
// Format và ensure tất cả fields được include
const transactions = $input.all().map(item => {
  const t = item.json;
  return {
    id: t.id,
    type: t.type,
    product_id: t.product_id,
    quantity: t.quantity,
    note: t.note || '',
    page: t.page,
    user: t.user || 'Unknown',  // ← Quan trọng!
    timestamp: t.timestamp
  };
});

return [{
  json: {
    success: true,
    data: transactions
  }
}];
```

→ **Respond to Webhook**

#### 3.6. Output 2 - GET Inventory

Switch output 2 → **Get Many** node:
- Table: **transactions**
- Filter: `page` **Equal** `{{ $json.query.page }}`

→ **Code** (Calculate):
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

→ **Respond to Webhook**

#### 3.7. Save & Activate

---

### BƯỚC 4: Workflow API - POST Requests

#### 4.1. Tạo Workflow

**Name:** `XuatNhapHang-API-POST`

#### 4.2. Add Webhook Node

- HTTP Method: **POST**
- Path: **api** (same path as GET)
- Respond: **Using 'Respond to Webhook' Node**

#### 4.3. Add Switch Node

Same as GET workflow:
- 3 rules theo `endpoint` parameter

#### 4.4. Output 0 - POST Product (Create/Update by Name)

**Flow:**
```
Switch output 0 → Code (Validate) → Get Many (Find by name) → IF (Exists?)
                                                               ├─ Yes → Update
                                                               └─ No → Insert
```

**Node 1: Code - Validate & Prepare**

Add **Code** node:
```javascript
const body = $json.body;

// Validate required fields
if (!body.name || !body.unit || !body.page) {
  throw new Error('Thiếu thông tin bắt buộc');
}

// Prepare product data
return [{
  json: {
    name: body.name,
    unit: body.unit,
    description: body.description || '',
    page: body.page
  }
}];
```

**Node 2: Get Many - Check Existing**

Add **Get Many** node:
- Table: **products**
- Return All: **ON**
- Filters:
  - Field: `name` **Equal** `{{ $json.name }}`
  - **AND** Field: `page` **Equal** `{{ $json.page }}`

**Node 3: Code - Merge Data**

Add **Code** node:
```javascript
const newData = $('Code').item.json; // Data mới từ form
const existing = $input.all(); // Kết quả query

// Nếu tìm thấy existing product
if (existing.length > 0) {
  const existingProduct = existing[0].json;
  return [{
    json: {
      ...newData,
      id: existingProduct.id,  // Giữ ID cũ
      isUpdate: true
    }
  }];
}

// Nếu không tìm thấy - product mới
return [{
  json: {
    ...newData,
    isUpdate: false
  }
}];
```

**Node 4: IF - Check Is Update**

Add **IF** node:
- Condition: `{{ $json.isUpdate }}` **Equal** `true`

---

**TRUE BRANCH (Update existing):**

**Node 5a: Update**

Add **Update** node:
- Table: **products**
- Update Mode: **Update One**
- Filter to Find Row:
  - Field: `id` **Equal** `{{ $json.id }}`
- Fields to Update:
  - `name`: `{{ $json.name }}`
  - `unit`: `{{ $json.unit }}`
  - `description`: `{{ $json.description }}`

**FALSE BRANCH (Insert new):**

**Node 5b: Insert**

Add **Insert** node:
- Table: **products**
- Data to Insert: `{{ $json }}`

---

**Both Branches → Node 6: Format Response**

Add **Code** node:
```javascript
return [{
  json: {
    success: true,
    message: 'Lưu sản phẩm thành công',
    data: $json
  }
}];
```

**Node 7: Respond to Webhook**

**Tổng kết:**
```
Validate → Get Existing (by name+page) → Merge → IF (exists?)
                                                  ├─ Yes → Update → Respond
                                                  └─ No → Insert → Respond
```

**Lợi ích:**
- ✅ Tránh duplicate products với cùng tên
- ✅ Update tự động nếu sản phẩm đã tồn tại
- ✅ User chỉ cần sửa và save, không cần quan tâm create/update

#### 4.5. Output 1 - POST Transaction (Chi Tiết Từng Node)

**Flow overview:**
```
Switch output 1 → Code (Validate) → IF (Check type)
                                    ├─ True (xuat) → Get Trans → Calculate → IF (Check inventory) → Insert
                                    └─ False (nhap) → Insert directly
```

**Node 1: Code - Validate & Prepare**

Add **Code** node:
```javascript
const body = $json.body;

// Validate required fields
if (!body.type || !body.product_id || !body.quantity) {
  throw new Error('Thiếu thông tin bắt buộc');
}

if (!body.page || !body.user) {
  throw new Error('Thiếu page hoặc user');
}

if (!['nhap', 'xuat'].includes(body.type)) {
  throw new Error('Loại không hợp lệ');
}

// Prepare data để insert
return [{
  json: {
    type: body.type,
    product_id: parseInt(body.product_id),
    quantity: parseInt(body.quantity),
    note: body.note || '',
    page: body.page,
    user: body.user  // First name từ Telegram
  }
}];
```

**Node 2: IF - Check Type**

Add **IF** node:
- Condition: `{{ $json.type }}` **Equal** `xuat`

---

**TRUE BRANCH (xuat - cần check tồn kho):**

**Node 3a: Get Many - Query Transactions**

Add **Get Many** node:
- Table: **transactions**
- Return All: **ON**
- Filters:
  - Field: `page` Equal `{{ $json.page }}`
  - **AND** Field: `product_id` Equal `{{ $json.product_id }}`

**Node 4a: Code - Calculate Inventory**

```javascript
const newTransaction = $('Code').item.json; // Transaction mới
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

**Node 5a: Insert - Save Transaction**

Add **Insert** node:
- Table: **transactions**
- Data to Insert: `{{ $json }}`

→ Go to **Node 6: Format Response** (skip to end)

---

**FALSE BRANCH (nhap - không cần check):**

**Node 3b: Insert - Save Directly**

Add **Insert** node:
- Table: **transactions**
- Data to Insert: `{{ $json }}`

→ Go to **Node 6: Format Response**

---

**Node 6: Format Response (Merge point)**

Add **Code** node:
```javascript
return [{
  json: {
    success: true,
    message: 'Thành công',
    data: $json
  }
}];
```

**Node 7: Respond to Webhook**

Add **Respond to Webhook** node

---

**Tổng kết flow:**
```
Validate → IF (type = xuat?)
           ├─ Yes → Get Transactions → Calculate → Check → Insert → Format → Respond
           └─ No → Insert → Format → Respond
```

#### 4.6. Save & Activate

---

### BƯỚC 5: Setup Telegram Bot

#### 5.1. Tạo Bot

@BotFather:
```
/newbot
Bot name: Xuất Nhập Hàng Bot
Username: xuatnhaphang_bot
```

#### 5.2. Setup Mini App

```
/newapp

Title: Xuất Nhập Hàng
Description: Quản lý nhập về và cấp phát
Web App URL: https://your-n8n.app/webhook/app
```

#### 5.3. Set Menu Button

```
/setmenubutton
Button: 📦 Mở App
URL: https://your-n8n.app/webhook/app
```

---

## ✅ Testing

### Test GET Products

```bash
curl "https://n8n.tayninh.cloud/webhook/api?endpoint=products&page=RR88"
```

Expected webhook data:
```json
{
  "query": {
    "endpoint": "products",
    "page": "RR88"
  },
  "body": {}
}
```

### Test POST Product

```bash
curl -X POST "https://n8n.tayninh.cloud/webhook/api?endpoint=products" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","unit":"Cái","page":"RR88"}'
```

Expected body:
```json
{
  "query": { "endpoint": "products" },
  "body": {
    "name": "Test",
    "unit": "Cái",
    "page": "RR88"
  }
}
```

### Test POST Transaction

```bash
curl -X POST "https://n8n.tayninh.cloud/webhook/api?endpoint=transactions" \
  -H "Content-Type: application/json" \
  -d '{
    "type":"nhap",
    "product_id":1,
    "quantity":50,
    "page":"RR88",
    "user":"Nguyễn Văn A"
  }'
```

---

## 🎯 Workflow Architecture (Correct)

### 3 Separate Workflows

**1. Frontend Workflow:**
```
Webhook GET (path: app) → HTML → Respond
```

**2. API GET Workflow:**
```
Webhook GET (path: api)
    ↓
Switch (endpoint parameter)
    ├─ Output 0: products → Get Many → Format → Respond
    ├─ Output 1: transactions → Get Many → Format → Respond
    └─ Output 2: inventory → Get Many → Calculate → Respond
```

**3. API POST Workflow:**
```
Webhook POST (path: api)
    ↓
Switch (endpoint parameter)
    ├─ Output 0: products → Validate → Insert → Respond
    └─ Output 1: transactions → Validate → Check → Insert → Respond
```

### Why This Way?

- ✅ Webhook chỉ chọn 1 method
- ✅ Không có `$json.method` field
- ✅ GET và POST tự nhiên phân biệt qua webhook nodes
- ✅ Switch chỉ cần route theo `endpoint`
- ✅ Không cần Merge, không cần IF check method

---

## 📊 Webhook Data Structure

### GET Request
```json
{
  "headers": {...},
  "query": {
    "endpoint": "products",
    "page": "RR88"
  },
  "body": {}
}
```

**Access data:**
- Endpoint: `{{ $json.query.endpoint }}`
- Page: `{{ $json.query.page }}`

### POST Request
```json
{
  "headers": {...},
  "query": {
    "endpoint": "products"
  },
  "body": {
    "name": "Test",
    "unit": "Cái",
    "page": "RR88"
  }
}
```

**Access data:**
- Endpoint: `{{ $json.query.endpoint }}`
- Body data: `{{ $json.body.name }}`

---

## 🐛 Troubleshooting

### Switch không route đúng
- Check: `{{ $json.query.endpoint }}` (không phải `$json.endpoint`)
- Check: Value chính xác (products, transactions, inventory)

### Không get được data
- Check: Dùng `{{ $json.query.page }}` (không phải `$json.page`)
- Check: Webhook GET active
- Check: Filter trong Get Many node đúng

### POST không save
- Check: Dùng `{{ $json.body.name }}` để access body data
- Check: Webhook POST active
- Check: Validation logic đúng

---

## ✅ Checklist

- [ ] Data Tables: products, transactions
- [ ] Frontend workflow (path: app, GET)
- [ ] API GET workflow (path: api, GET)
  - [ ] Switch with 3 outputs
  - [ ] Get Many nodes for each output
  - [ ] Respond nodes
- [ ] API POST workflow (path: api, POST)
  - [ ] Switch with 2 outputs
  - [ ] Validate → Insert logic
  - [ ] Respond nodes
- [ ] Config updated in HTML
- [ ] Telegram bot created
- [ ] Tested with curl
- [ ] Tested on Telegram app

---

**Version:** 2.1.3  
**Updated:** 2025-11-07  
**Fixed:**
- Removed Merge node (không cần)
- Removed IF nodes checking method (không có $json.method)
- Use 3 separate workflows (cleaner)
- Correct data access: $json.query.endpoint, $json.body.xxx