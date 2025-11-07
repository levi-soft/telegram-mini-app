# 🚀 Setup Guide - Telegram Mini App Xuất Nhập Hàng

Hướng dẫn setup với n8n phiên bản mới nhất.

## 📋 Yêu Cầu

- ✅ n8n Instance (Cloud hoặc Self-hosted)
- ✅ Telegram Account

---

## 🎯 Architecture

```
Telegram Mini App
    ↓
n8n Workflows
    ├─ Webhook "app" (GET) → HTML → Respond (Frontend)
    ├─ Webhook "api" (GET) → Auth → Switch → Query (API GET)
    └─ Webhook "api" (POST) → Auth → Switch → Insert (API POST)
         ↓
   Data Tables (products, transactions, allowed_users)
```

---

## 🚀 Setup Trong 5 Bước

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
```

#### 1.2. Table "transactions"

Click **Create Table** → Tên: `transactions`

**Columns:**
- `type` - Text - Required (nhap/xuat)
- `product_id` - Number - Required
- `quantity` - Number - Required
- `note` - Text - Optional
- `page` - Text - Required
- `user` - Text - Required (first_name từ Telegram - real-time)
- `timestamp` - Date - Auto

#### 1.3. Table "allowed_users" (Whitelist)

Click **Create Table** → Tên: `allowed_users`

**Columns (Simplified):**
- `telegram_id` - Number - Required - Primary Key
- `pages` - Text - Required
- `role` - Text - Optional (for future use)
- `active` - Boolean - Default: true
- `created_at` - Date - Auto

**Lưu ý Quan Trọng:**
- ❌ **KHÔNG** lưu `first_name` hay `username` (user có thể đổi bất cứ lúc nào)
- ✅ **CHỈ** lưu `telegram_id` (immutable - không đổi)
- ✅ `first_name` lấy **real-time** từ Telegram WebApp khi người dùng app

---

### 📋 Phân Quyền Linh Hoạt

#### Field "pages" - Chi Tiết

**Format:** Comma-separated (không khoảng trắng)

**Các Trường Hợp:**

**1. Full Access - Cả 3 Pages:**
```
telegram_id: 123456789
pages: RR88,XX88,MM88
role: admin
active: true
```
→ User access được cả 3 pages, tự do switch

**2. Single Page - Chỉ 1 Page:**
```
telegram_id: 987654321
pages: RR88
role: user
active: true
```
→ Chỉ làm việc với RR88

**3. Two Pages - 2 Pages:**
```
telegram_id: 555666777
pages: XX88,MM88
role: user
active: true
```
→ Làm việc với XX88 và MM88, không thấy RR88

**4. Custom Combination:**
```
telegram_id: 111222333
pages: RR88,MM88
role: user
active: true
```
→ Access RR88 và MM88, skip XX88

#### Field "role" - Vai Trò (Future)

**Hiện tại:** Chỉ để note, chưa dùng logic

**Gợi ý values:**
- `admin` - Quản trị
- `user` - Người dùng
- `viewer` - Chỉ xem (future)

#### Field "active" - Bật/Tắt

- `true` → Cho phép access
- `false` → Block (nhân viên nghỉ, vi phạm, etc.)

---

### 💡 Ví Dụ Real-World

**Case 1: IT Manager**
```
telegram_id: 111111111
pages: RR88,XX88,MM88
role: admin
active: true
```
→ Quản lý toàn bộ, full access


#### 3.3a. Add Rule 0 - Check Auth (Thêm trước 3 rules cũ)

**Rule 0 - Check Auth:**
- Value 1: `{{ $json.query.endpoint }}`
- Operation: **Equal**
- Value 2: `check_auth`

**Output 0 - Check Auth Flow:**

Switch output 0 → **Get Many** node:
- Table: **allowed_users**
- Filter: `telegram_id` Equal `{{ $json.query.user_id }}`

→ **Code** node (Format auth response):
```javascript
const users = $input.all();

if (users.length === 0) {
  return [{
    json: {
      success: false,
      authorized: false,
      message: 'Không có quyền truy cập'
    }
  }];
}

const user = users[0].json;

if (!user.active) {
  return [{
    json: {
      success: false,
      authorized: false,
      message: 'Tài khoản đã bị khóa'
    }
  }];
}

return [{
  json: {
    success: true,
    authorized: true,
    pages: user.pages  // "RR88,XX88,MM88" hoặc "MM88"
  }
}];
```

→ **Respond to Webhook**

**Lưu ý:** Endpoint này KHÔNG cần check whitelist trước, vì chính nó là endpoint để check whitelist!

**Case 2: RR88 Warehouse Staff**
```
telegram_id: 222222222
pages: RR88
role: user
active: true
```
→ Chỉ quản lý kho RR88

**Case 3: Multi-Warehouse Staff**
```
telegram_id: 333333333
pages: RR88,XX88
role: user
active: true
```
→ Quản lý 2 kho: RR88 và XX88

**Case 4: Temporary Block**
```
telegram_id: 444444444
pages: RR88,XX88,MM88
role: user
active: false
```
→ Tạm khóa (đã nghỉ việc, suspend, etc.)

---

### 🆔 Lấy Telegram ID

**Cách 1: Unauthorized Screen**
- User mở app lần đầu
- App hiện: "Telegram ID của bạn: 123456789"
- User copy ID này

**Cách 2: @userinfobot**
- User chat với @userinfobot
- Bot reply với user info
- Copy ID

**Cách 3: n8n Logs**
- User mở app
- Admin check n8n webhook executions
- Xem user_id trong query params

---

### BƯỚC 2: Workflow Frontend

#### 2.1. Tạo Workflow

**Name:** `XuatNhapHang-Frontend`

#### 2.2. Add Webhook Node

- HTTP Method: **GET**
- Path: **app**
- Respond: **Immediately**

#### 2.3. Add HTML Node

Copy [`XuatNhapHang.html`](XuatNhapHang.html:1) vào HTML Content

#### 2.4. Update Config trong HTML

```javascript
const CONFIG = {
    N8N_WEBHOOK_URL: 'https://your-domain/webhook',
    API_PATH: 'api',
};
```

#### 2.5. Add Respond Node

- Response Body: `{{ $json.html }}`
- Headers: `Content-Type: text/html; charset=utf-8`

#### 2.6. Save & Activate

---

### BƯỚC 3: Workflow API GET (With Auth)

#### 3.1. Tạo Workflow

**Name:** `XuatNhapHang-API-GET`

#### 3.2. Webhook Node

- HTTP Method: **GET**
- Path: **api**

#### 3.3. Get Many - Check Whitelist

- Table: **allowed_users**
- Filter: `telegram_id` Equal `{{ $json.query.user_id }}`

#### 3.4. IF - Check Authorized

Add **IF** node:
- Mode: **Custom**
- Expression:
```javascript
{{ $input.all().length > 0 && $input.first().json.active === true }}
```

**TRUE → Authorized**
**FALSE → Unauthorized**

#### 3.5. FALSE Branch - Return Error

Add **Code** node:
```javascript
return [{
  json: {
    success: false,
    error: 'Unauthorized',
    message: 'Bạn không có quyền sử dụng ứng dụng này'
  }
}];
```

→ **Respond to Webhook**

#### 3.6. TRUE Branch - Add Switch Node

Add **Switch** với 3 rules:
- `{{ $json.query.endpoint }}` Equal `products`
- `{{ $json.query.endpoint }}` Equal `transactions`
- `{{ $json.query.endpoint }}` Equal `inventory`

**Output 0 - GET Products:**
Get Many → Format → Respond

**Output 1 - GET Transactions:**
Get Many → Format (include user) → Respond

Format code:
```javascript
const transactions = $input.all().map(item => {
  const t = item.json;
  return {
    id: t.id,
    type: t.type,
    product_id: t.product_id,
    quantity: t.quantity,
    note: t.note || '',
    page: t.page,
    user: t.user || 'Unknown',
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

**Output 2 - GET Inventory:**
Get Transactions → Calculate → Respond

#### 3.7. Save & Activate

---

### BƯỚC 4: Workflow API POST (With Auth)

#### 4.1. Tạo Workflow

**Name:** `XuatNhapHang-API-POST`

#### 4.2. Webhook + Auth

Same as GET workflow (steps 3.2-3.5)

#### 4.3. Switch (Authorized users only)

**Output 0 - POST Product (Update by Name):**

Flow:
```
Validate → Get Existing (by name+page) → Merge → IF (exists?) 
                                                  ├─ Update
                                                  └─ Insert
```

7 nodes total (xem phần 4.4 trong guide)

**Output 1 - POST Transaction:**

Flow:  
```
Validate → IF (type=xuat?) 
           ├─ Get Trans → Calculate → Check → Insert
           └─ Insert directly
```

7 nodes total (xem phần 4.5 trong guide)

#### 4.4. Save & Activate

---

### BƯỚC 5: Telegram Bot Setup

#### 5.1. Tạo Bot

@BotFather → `/newbot`

#### 5.2. Setup Mini App

```
/newapp
Title: Xuất Nhập Hàng
URL: https://your-n8n.app/webhook/app
```

#### 5.3. Set Menu Button

```
/setmenubutton
Button: 📦 Mở App
URL: https://your-n8n.app/webhook/app
```

---

## ✅ Testing

### Add User Vào Whitelist

n8n → Data Tables → allowed_users → Add Row:
```
telegram_id: 123456789
pages: RR88,XX88,MM88
role: admin
active: true
```

**Lưu ý:** Không cần điền first_name hay username!

### Test Access

1. User mở app
2. Nếu không trong whitelist:
   - Thấy unauthorized screen
   - Hiển thị Telegram ID
   - Button "Liên Hệ Admin" → https://t.me/PinusITRR88
3. User gửi ID cho admin
4. Admin add vào whitelist
5. User reload → Access! ✅

---

## 🔍 Debug Tips

### Check Whitelist

Query trong n8n:
```
Table: allowed_users
Filter: telegram_id = 123456789
```

Nếu found && active = true → Should work

### Check Permissions

User chỉ thấy pages được phép:
- `pages: RR88` → Chỉ thấy button RR88
- `pages: RR88,XX88,MM88` → Thấy cả 3 buttons

---

## 📊 Summary

**3 Workflows:**
1. Frontend (GET app)
2. API GET (with auth check)
3. API POST (with auth check)

**3 Data Tables:**
1. products
2. transactions
3. allowed_users (chỉ telegram_id + permissions)

**User Flow:**
1. Mở app → Check whitelist
2. Authorized → Use app
3. Unauthorized → Contact @PinusITRR88 → Get added → Access!

**Setup Time:** 40-50 phút

---

**Version:** 2.2.0  
**Updated:** 2025-11-07  
**Contact Admin:** https://t.me/PinusITRR88