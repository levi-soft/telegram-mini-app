# 🚀 Setup Guide - Telegram Mini App Xuất Nhập Hàng

Hướng dẫn setup nhanh với n8n Data Tables.

## 📋 Yêu Cầu

- ✅ n8n Instance (Cloud hoặc Self-hosted)
- ✅ Telegram Account

---

## 🎯 Architecture

```
Telegram Mini App
    ↓
┌─────────────────────────────────┐
│  n8n Workflow                   │
│                                 │
│  Webhook "app"  → HTML → Respond│  (Frontend)
│                                 │
│  Webhook "api"  → Router        │  (Backend API)
│                ↓                │
│         Data Tables             │
│         ├─ products             │
│         └─ transactions         │
└─────────────────────────────────┘
```

---

## 🚀 Setup Trong 4 Bước

### BƯỚC 1: Tạo Data Tables

Trong n8n, vào **Settings** → **Data Tables**

#### 1.1. Tạo Table "products"

Click **"Create Table"**, đặt tên: `products`

**Columns:**
```
name          | Text     | Required
unit          | Text     | Required
description   | Text     | Optional
page          | Text     | Required
created_at    | Date     | Auto (NOW)
```

**Sample data:**
```
name: Bàn phím cơ, unit: Cái, page: RR88
name: Chuột máy tính, unit: Cái, page: RR88
name: Tai nghe, unit: Cái, page: XX88
name: USB 32GB, unit: Cái, page: XX88
name: Balo laptop, unit: Cái, page: MM88
```

#### 1.2. Tạo Table "transactions"

Click **"Create Table"**, đặt tên: `transactions`

**Columns:**
```
type          | Text     | Required (nhap/xuat)
product_id    | Number   | Required
quantity      | Number   | Required
note          | Text     | Optional
page          | Text     | Required
user          | Text     | Required (first_name từ Telegram)
timestamp     | Date     | Auto (NOW)
```

**Notes:**
- `product_id` liên kết với ID trong table products
- `user` sẽ tự động lấy first_name từ Telegram
- `type`: "nhap" = nhập về, "xuat" = cấp phát

---

### BƯỚC 2: Tạo Workflow Frontend

**Workflow Name:** `XuatNhapHang-Frontend`

#### 2.1. Add Webhook Node

```
HTTP Method: GET
Path: app
Respond: Immediately
Response Mode: Last Node
```

**Production URL sẽ là:**
```
https://your-n8n.app/webhook/app
```

#### 2.2. Add HTML Node

- Copy toàn bộ nội dung từ [`XuatNhapHang.html`](XuatNhapHang.html:1)
- Paste vào **HTML Content**

#### 2.3. Add Respond Node

```
Respond With: Text
Response Body: {{ $json.html }}

Options → Response Headers:
  Content-Type: text/html; charset=utf-8
```

#### 2.4. Update Config trong HTML

Trong HTML Node, tìm và cập nhật:
```javascript
const CONFIG = {
    N8N_WEBHOOK_URL: 'https://your-n8n.app/webhook',
    API_PATH: 'api',
};
```

**Example:**
```javascript
const CONFIG = {
    N8N_WEBHOOK_URL: 'https://n8n-demo.app.n8n.cloud/webhook',
    API_PATH: 'api',
};
```

#### 2.5. Save & Activate

- Click **Save**
- Toggle **Active** ON
- **Copy Frontend URL:** `https://your-n8n.app/webhook/app`

---

### BƯỚC 3: Tạo Workflow API Backend

**Workflow Name:** `XuatNhapHang-API`

#### 3.1. Add Webhook Node

```
HTTP Method: GET, POST
Path: api
Respond: Using 'Respond to Webhook' Node
```

#### 3.2. Add Router (Switch) Node

Add **Switch** node với 5 routes dựa trên query parameter `endpoint`:

**Route 1: GET Products**
```
Condition: {{ $json.query.endpoint }} == "products" && {{ $json.method }} == "GET"
```

**Route 2: POST Product**
```
Condition: {{ $json.query.endpoint }} == "products" && {{ $json.method }} == "POST"
```

**Route 3: GET Transactions**
```
Condition: {{ $json.query.endpoint }} == "transactions" && {{ $json.method }} == "GET"
```

**Route 4: POST Transaction**
```
Condition: {{ $json.query.endpoint }} == "transactions" && {{ $json.method }} == "POST"
```

**Route 5: GET Inventory**
```
Condition: {{ $json.query.endpoint }} == "inventory" && {{ $json.method }} == "GET"
```

#### 3.3. Implement Endpoints

**GET Products (Route 1):**
```
Switch → Get Products from Data Table → Format → Respond
```

Get from Data Table:
```
Table: products
Operation: Get Many
Filter: page = {{ $json.query.page }}
Sort: name ASC
```

Format Response (Code node):
```javascript
return [{
  json: {
    success: true,
    data: $input.all().map(i => i.json)
  }
}];
```

**POST Product (Route 2):**
```
Switch → Validate → Insert to Data Table → Respond
```

Validate (Code node):
```javascript
const body = $json.body;

if (!body.name || !body.unit || !body.page) {
  throw new Error('Missing required fields');
}

return [{
  json: {
    name: body.name,
    unit: body.unit,
    description: body.description || '',
    page: body.page
  }
}];
```

Insert to Data Table:
```
Table: products
Operation: Insert
Data: {{ $json }}
```

**GET Transactions (Route 3):**
```
Switch → Get from Data Table → Join with Products → Format → Respond
```

Get Transactions:
```
Table: transactions
Operation: Get Many
Filter: page = {{ $json.query.page }}
Sort: timestamp DESC
Limit: 100
```

**POST Transaction (Route 4):**
```
Switch → Validate → Check Inventory → Insert → Respond
```

Validate & Check (Code node):
```javascript
const body = $json.body;

// Validate
if (!body.type || !body.product_id || !body.quantity || !body.page || !body.user) {
  throw new Error('Missing required fields');
}

if (!['nhap', 'xuat'].includes(body.type)) {
  throw new Error('Invalid type');
}

// For xuat (cấp phát), check inventory
if (body.type === 'xuat') {
  // Will check inventory in next node
  return [{
    json: {
      ...body,
      needInventoryCheck: true
    }
  }];
}

return [{
  json: {
    type: body.type,
    product_id: parseInt(body.product_id),
    quantity: parseInt(body.quantity),
    note: body.note || '',
    page: body.page,
    user: body.user  // first_name từ Telegram
  }
}];
```

If need check → Get all transactions → Calculate → Compare → Insert or Error

**GET Inventory (Route 5):**
```
Switch → Get All Transactions → Calculate → Format → Respond
```

Calculate Inventory (Code node):
```javascript
const transactions = $input.all();
const page = $('Webhook').item.json.query.page;

const inventory = {};

transactions.forEach(item => {
  const t = item.json;
  if (t.page !== page) return;
  
  const productId = t.product_id;
  if (!inventory[productId]) {
    inventory[productId] = 0;
  }
  
  if (t.type === 'nhap') {
    inventory[productId] += parseInt(t.quantity);
  } else if (t.type === 'xuat') {
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

#### 3.4. Add Respond Node

Cuối mỗi route, add **Respond to Webhook** node:
```
Response Body: {{ $json }}
```

#### 3.5. Save & Activate

- Click **Save**
- Toggle **Active** ON

---

### BƯỚC 4: Setup Telegram Bot

#### 4.1. Tạo Bot

Mở Telegram, tìm **@BotFather**

```
/newbot

Bot name: Xuất Nhập Hàng Bot
Username: xuatnhaphang_bot

→ Copy Bot Token (giữ bí mật)
```

#### 4.2. Setup Description

```
/setdescription

📦 Hệ thống quản lý xuất nhập hàng
Nhập về kho → Cấp phát cho nhân viên
Hỗ trợ 3 trang: RR88, XX88, MM88
```

#### 4.3. Setup Mini App

```
/newapp

Chọn bot: @xuatnhaphang_bot

Title: Xuất Nhập Hàng
Description: Quản lý nhập về và cấp phát cho nhân viên
Web App URL: https://your-n8n.app/webhook/app
```

**Lưu ý:** URL phải là production URL từ **BƯỚC 2** (path "app")

#### 4.4. Set Menu Button

```
/setmenubutton

Chọn bot: @xuatnhaphang_bot

Button text: 📦 Mở App
Web App URL: https://your-n8n.app/webhook/app
```

#### 4.5. Test

1. Mở bot trên Telegram
2. Click Menu button (📦 Mở App)
3. App sẽ mở với first_name của bạn tự động

---

## ✅ Testing

### Test Flow

1. **Mở App:**
   - Vào bot trên Telegram
   - Click Menu button
   - App load thành công

2. **Thêm Sản Phẩm:**
   - Tab Danh Mục → Thêm Sản Phẩm
   - Name: Test Product
   - Unit: Cái
   - Page: RR88
   - Save → Check Data Table

3. **Nhập Về:**
   - Tab Nhập Hàng
   - Chọn sản phẩm
   - Số lượng: 100
   - Note: "Nhập batch 001"
   - Submit
   - Check: Tồn kho = 100
   - **User tự động = First name của bạn**

4. **Cấp Phát:**
   - Tab Cấp Phát  
   - Chọn sản phẩm
   - Số lượng: 20
   - Note: "Cấp cho Nguyễn Văn A"
   - Submit
   - Check: Tồn kho = 80
   - **User tự động = First name của bạn**

5. **Xem Lịch Sử:**
   - Tab Lịch Sử
   - Verify có 2 records
   - **Cả 2 đều hiển thị first_name của bạn**

6. **Multi-Page:**
   - Switch RR88 → XX88
   - Data riêng biệt
   - Switch XX88 → MM88
   - Data riêng biệt

### Test API với curl

**GET Products:**
```bash
curl "https://your-n8n.app/webhook/api?endpoint=products&page=RR88"
```

**POST Transaction:**
```bash
curl -X POST "https://your-n8n.app/webhook/api?endpoint=transactions" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "nhap",
    "product_id": 1,
    "quantity": 50,
    "note": "Test nhập",
    "page": "RR88",
    "user": "Test User"
  }'
```

**GET Inventory:**
```bash
curl "https://your-n8n.app/webhook/api?endpoint=inventory&page=RR88"
```

---

## 📊 Data Tables Schema

### products

| Column | Type | Description |
|--------|------|-------------|
| id | Auto | Primary key |
| name | Text | Tên sản phẩm |
| unit | Text | Đơn vị (Cái, Thùng...) |
| description | Text | Mô tả |
| page | Text | RR88/XX88/MM88 |
| created_at | Date | Tự động |

### transactions

| Column | Type | Description |
|--------|------|-------------|
| id | Auto | Primary key |
| type | Text | nhap hoặc xuat |
| product_id | Number | ID sản phẩm |
| quantity | Number | Số lượng |
| note | Text | Ghi chú |
| page | Text | RR88/XX88/MM88 |
| user | Text | **First name từ Telegram** |
| timestamp | Date | Tự động |

---

## 🔍 Features

### Auto User Tracking

App tự động lấy first_name từ Telegram:
```javascript
const user = tg.initDataUnsafe?.user;
if (user) {
    currentUser = user.first_name || user.username || 'Unknown';
}
```

Khi nhập/cấp phát:
- User field tự động = First name của bạn
- Không cần điền thủ công
- Hiển thị trong lịch sử: "Nguyễn Văn A nhập 50 cái..."

### Multi-Page Support

3 pages riêng biệt:
- RR88: Data riêng
- XX88: Data riêng  
- MM88: Data riêng

Switch page → Data tự động filter

### Real-time Inventory

Tồn kho tính từ transactions:
```
Tồn kho = Σ(nhập về) - Σ(cấp phát)
```

Real-time update sau mỗi transaction

---

## 🐛 Troubleshooting

### Issue 1: App không load
**Check:**
- Frontend workflow active?
- Webhook path = "app"?
- URL đúng format?

### Issue 2: API không hoạt động
**Check:**
- API workflow active?
- Webhook path = "api"?
- Data Tables đã tạo?
- Router conditions đúng?

### Issue 3: User không hiển thị
**Check:**
- App mở từ Telegram (không phải browser)?
- Telegram WebApp SDK load?
- Console log để debug

### Issue 4: Data không save
**Check:**
- Data Tables exist?
- Column names match?
- Validation pass?
- Check workflow execution logs

---

## 🔐 Security Tips

1. **Restrict Access:**
   - Only Telegram users can access
   - n8n webhooks are private

2. **Add Auth (Optional):**
   ```javascript
   // In API workflow, add Function node
   const token = $json.headers.authorization;
   if (token !== 'Bearer YOUR_SECRET') {
     throw new Error('Unauthorized');
   }
   ```

3. **Rate Limiting:**
   - Use n8n's built-in features
   - Or add custom logic

---

## 📈 Tips

### View Data Tables

n8n UI → Settings → Data Tables → View/Edit

### Check Workflow Logs

Workflow → Executions tab → View history

### Debug

Add **Code** nodes with:
```javascript
console.log('Debug:', $json);
return $input.all();
```

### Backup Data

Export Data Tables regularly via n8n UI

---

## ✅ Checklist

Setup Complete:
- [ ] Data Tables created (products, transactions)
- [ ] Frontend workflow (path: app) active
- [ ] API workflow (path: api) active
- [ ] Config updated in HTML (webhook URL + API path)
- [ ] Telegram bot created
- [ ] Mini App configured with frontend URL
- [ ] Tested: Add product works
- [ ] Tested: Nhập về works, user auto-filled
- [ ] Tested: Cấp phát works with inventory check
- [ ] Tested: Multi-page switching works
- [ ] Verified: First name displays in history

---

## 🎯 Summary

**Webhooks:**
- Frontend: `https://your-n8n.app/webhook/app`
- API: `https://your-n8n.app/webhook/api`

**Data Storage:** n8n Data Tables

**User Tracking:** Auto first_name từ Telegram

**Setup Time:** 20-30 phút

**Maintenance:** Minimal, chỉ quản lý data trong n8n

---

**Version:** 2.1.0  
**Last Updated:** 2025-11-06  
**Changes:**
- Webhook paths: "app" & "api"
- Bỏ SQL, dùng Data Table UI
- Auto first_name tracking
- Simplified setup