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

## BƯỚC 6: Workflow Google Sheets Sync (Optional)

### 6.1. Tạo Workflow

**Name:** `XuatNhapHang-GSheet-Sync`

### 6.2. Webhook Node

- HTTP Method: **POST**
- Path: **api**

### 6.3. Check Auth (Same as other workflows)

- Get Many → allowed_users
- IF → Check authorized
- FALSE → Return error

### 6.4. Switch Node (Authorized Branch)

Add **Switch** với 1 rule:
- Value 1: `{{ $json.query.endpoint }}`
- Operation: **Equal**
- Value 2: `sync_gsheet`

### 6.5. Output 0 - Sync GSheet Flow

#### Step 1: Parse Request Body

**Code** node:
```javascript
const body = $input.first().json.body;

return [{
  json: {
    inventory: body.inventory,
    transactions: body.transactions,
    sync_time: body.sync_time,
    synced_by: body.synced_by
  }
}];
```

#### Step 2: Create/Update Google Sheets

**Google Sheets** node (x4 - một cho mỗi sheet):

**Sheet 1 - RR88 Tồn Kho:**
- Spreadsheet: Your GSheet ID hoặc create new
- Sheet: `RR88`
- Operation: **Clear + Append**
- Data: `{{ $json.inventory.RR88 }}`
- Columns:
  - id → ID
  - name → Sản Phẩm
  - unit → Đơn Vị
  - quantity → Tồn Kho
  - description → Mô Tả

**Sheet 2 - XX88 Tồn Kho:**
- Sheet: `XX88`
- Data: `{{ $json.inventory.XX88 }}`
- Same columns (id, name, unit, quantity, description)

**Sheet 3 - MM88 Tồn Kho:**
- Sheet: `MM88`
- Data: `{{ $json.inventory.MM88 }}`
- Same columns (id, name, unit, quantity, description)

**Sheet 4 - Lịch Sử (All Pages):**
- Sheet: `Lịch Sử`
- Data: `{{ $json.transactions }}`
- Columns:
  - id → ID Giao Dịch
  - timestamp → Ngày Giờ
  - page → Page
  - type → Loại
  - product_id → ID Sản Phẩm
  - product → Tên Sản Phẩm
  - quantity → Số Lượng
  - user → Người Thực Hiện
  - note → Ghi Chú

#### Step 3: Return Success Response

**Code** node:
```javascript
return [{
  json: {
    success: true,
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID',
    message: 'Đồng bộ thành công',
    sheets: ['RR88', 'XX88', 'MM88', 'Lịch Sử'],
    synced_at: new Date().toISOString()
  }
}];
```

**Lưu ý:**
- Thay `YOUR_SHEET_ID` bằng ID thật của Google Sheet
- Hoặc dùng dynamic ID từ Google Sheets node output

→ **Respond to Webhook**

### 6.6. Google Sheets Setup

#### Prerequisites:
1. **Google Cloud Project** với Sheets API enabled
2. **Service Account** hoặc OAuth credentials
3. **Share spreadsheet** với service account email

#### n8n Google Sheets Credential:
- Vào n8n → Credentials → Add New
- Type: Google Sheets API
- Auth Type: Service Account (recommended)
- Upload JSON key file
- Save

#### Create Spreadsheet:
1. Tạo mới Google Sheet
2. Tạo 4 sheets: `RR88`, `XX88`, `MM88`, `Lịch Sử`
3. Share với service account email (Editor permission)
4. Copy Spreadsheet ID từ URL

### 6.7. Save & Activate

---

## 📊 Summary

**4 Workflows:**
1. Frontend (GET app)
2. API GET (with auth check)
3. API POST (with auth check)
4. **Google Sheets Sync (POST sync_gsheet)** - Optional

**3 Data Tables:**
1. products
2. transactions
3. allowed_users (chỉ telegram_id + permissions)

**Google Sheets Integration:**
- ✅ 4 sheets tự động: RR88, XX88, MM88, Lịch Sử
- ✅ Đồng bộ toàn bộ dữ liệu từ app
- ✅ Link trực tiếp để mở GSheet
- ✅ Copy link hoặc open trong browser
- 🔧 Requires: Google Cloud Service Account

**User Flow:**
1. Mở app → Check whitelist
2. Authorized → Use app
3. Unauthorized → Contact @PinusITRR88 → Get added → Access!
4. Click "Đồng Bộ GSheet" → View data in Google Sheets ⭐ NEW

**Setup Time:**
- Core features: 40-50 phút
- + Google Sheets: +15-20 phút

---

## BƯỚC 7: Setup API Băng Thông (Bandwidth Tracking)

### 7.1. Tạo Data Table "bandwidth_logs"

Vào n8n → **Settings** → **Data Tables**

Click **Create Table** → Tên: `bandwidth_logs`

**Columns:**
- `page` - Text - Required (RR88 | XX88 | MM88)
- `location` - Text - Required (Tên khu vực: VD "Văn phòng tầng 8", "KTX tầng 7")
- `event_type` - Text - Required ("tang" | "giam" | "khac")
- `bandwidth_change` - Number - Required (Số thay đổi: +100, -50, etc.)
- `bandwidth_after` - Number - Required (Băng thông sau khi thay đổi)
- `note` - Text - Optional (Ghi chú chi tiết)
- `user` - Text - Required (first_name từ Telegram - real-time)
- `timestamp` - Date - Auto

**Sample data:**
```
RR88 | Văn phòng tầng 8 | tang | 100 | 750 | Nâng cấp gói cước | Admin | 2025-11-28
XX88 | KTX tầng 7 | giam | -10 | 60 | Giảm do cắt dịch vụ | Staff | 2025-11-27
MM88 | Nhà kho | tang | 50 | 200 | Thêm đường truyền dự phòng | Admin | 2025-11-26
```

---

### 7.2. Thêm Endpoint vào API GET Workflow

Vào workflow: `XuatNhapHang-API-GET`

#### 7.2.1. Update Switch Node

Thêm **Rule mới** vào Switch node (sau 3 rules hiện tại):

**Rule 4 - GET Bandwidth Logs:**
- Value 1: `{{ $json.query.endpoint }}`
- Operation: **Equal**
- Value 2: `bandwidth_logs`

#### 7.2.2. Output 4 - GET Bandwidth Logs Flow

**Node 1: Get Many**
- Table: **bandwidth_logs**
- Filter: `page` Equal `{{ $json.query.page }}`
- Return All: **Yes**
- Sort: `timestamp` Descending

→ **Node 2: Code** (Format response):
```javascript
const logs = $input.all().map(item => {
  const log = item.json;
  return {
    id: log.id,
    page: log.page,
    location: log.location,
    event_type: log.event_type,
    bandwidth_change: log.bandwidth_change,
    bandwidth_after: log.bandwidth_after,
    note: log.note || '',
    user: log.user,
    timestamp: log.timestamp
  };
});

return [{
  json: {
    success: true,
    data: logs
  }
}];
```

→ **Respond to Webhook**

**Save workflow!**

---

### 7.3. Thêm Endpoint vào API POST Workflow

Vào workflow: `XuatNhapHang-API-POST`

#### 7.3.1. Update Switch Node

Thêm **Rule mới** vào Switch node (sau rules hiện tại):

**Rule - POST Bandwidth Log:**
- Value 1: `{{ $json.query.endpoint }}`
- Operation: **Equal**
- Value 2: `bandwidth_logs`

#### 7.3.2. Output - POST Bandwidth Log Flow

**Node 1: Code** (Validate & Prepare):
```javascript
const body = $input.first().json.body;

// Validate required fields
if (!body.location || !body.event_type || !body.bandwidth_change || !body.bandwidth_after) {
  return [{
    json: {
      success: false,
      message: 'Thiếu thông tin bắt buộc'
    }
  }];
}

// Validate event_type
const validTypes = ['tang', 'giam', 'khac'];
if (!validTypes.includes(body.event_type)) {
  return [{
    json: {
      success: false,
      message: 'Loại sự kiện không hợp lệ'
    }
  }];
}

return [{
  json: {
    page: body.page,
    location: body.location,
    event_type: body.event_type,
    bandwidth_change: parseFloat(body.bandwidth_change),
    bandwidth_after: parseFloat(body.bandwidth_after),
    note: body.note || '',
    user: body.user,
    timestamp: new Date().toISOString()
  }
}];
```

→ **Node 2: Insert**
- Table: **bandwidth_logs**
- Data Mode: **Define Below**
- Fields:
  - page: `{{ $json.page }}`
  - location: `{{ $json.location }}`
  - event_type: `{{ $json.event_type }}`
  - bandwidth_change: `{{ $json.bandwidth_change }}`
  - bandwidth_after: `{{ $json.bandwidth_after }}`
  - note: `{{ $json.note }}`
  - user: `{{ $json.user }}`
  - timestamp: `{{ $json.timestamp }}`

→ **Node 3: Code** (Format success response):
```javascript
return [{
  json: {
    success: true,
    message: 'Cập nhật băng thông thành công',
    data: $input.first().json
  }
}];
```

→ **Respond to Webhook**

**Save workflow!**

---

### 7.4. Test API Băng Thông

#### Test GET - Lấy danh sách logs:

```
GET https://your-n8n.app/webhook/api?endpoint=bandwidth_logs&page=RR88&user_id=123456789
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "page": "RR88",
      "location": "Văn phòng tầng 8",
      "event_type": "tang",
      "bandwidth_change": 100,
      "bandwidth_after": 750,
      "note": "Nâng cấp gói cước",
      "user": "Admin",
      "timestamp": "2025-11-28T10:30:00Z"
    }
  ]
}
```

#### Test POST - Thêm log mới:

```
POST https://your-n8n.app/webhook/api?endpoint=bandwidth_logs&page=RR88&user_id=123456789

Body (JSON):
{
  "page": "RR88",
  "location": "Văn phòng tầng 8",
  "event_type": "tang",
  "bandwidth_change": 100,
  "bandwidth_after": 750,
  "note": "Nâng cấp gói cước",
  "user": "Admin"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Cập nhật băng thông thành công",
  "data": { ... }
}
```

---

### 7.5. Workflow Summary - Băng Thông

**Updated Workflows:**
1. ✅ **API GET** - Thêm Rule 4: GET bandwidth_logs
2. ✅ **API POST** - Thêm Rule: POST bandwidth_logs

**New Data Table:**
- ✅ `bandwidth_logs` - 8 columns

**Frontend Integration:**
- ✅ Tab "Băng Thông" (đã có trong HTML)
- ✅ Form cập nhật băng thông
- ✅ Hiển thị băng thông hiện tại
- ✅ Lịch sử thay đổi
- ✅ Dashboard widget

**Features:**
- 📡 Theo dõi băng thông theo khu vực
- 📈 Ghi lại sự kiện tăng/giảm băng thông
- 📊 Hiển thị băng thông mới nhất trên Dashboard
- 🔍 Tìm kiếm lịch sử theo khu vực
- 👤 Tracking người cập nhật
- 📝 Ghi chú chi tiết cho mỗi sự kiện

---

### 7.6. Ví Dụ Use Cases

**Use Case 1: Tăng băng thông**
```
Khu vực: Văn phòng tầng 8
Loại: Tăng
Thay đổi: +100 Mbps
Sau: 750 Mbps
Ghi chú: Nâng cấp gói cước từ 650Mbps lên 750Mbps
```

**Use Case 2: Giảm băng thông**
```
Khu vực: KTX tầng 7
Loại: Giảm
Thay đổi: -10 Mbps
Sau: 60 Mbps
Ghi chú: Cắt giảm do hết hợp đồng dịch vụ cũ
```

**Use Case 3: Sự kiện khác**
```
Khu vực: Nhà kho
Loại: Khác
Thay đổi: 0 Mbps
Sau: 200 Mbps
Ghi chú: Kiểm tra đường truyền định kỳ
```

---

### 7.7. Dashboard Display

Sau khi setup xong, băng thông sẽ hiển thị trên Dashboard:

**Card "📡 Băng Thông Hiện Tại":**
```
Văn phòng tầng 8: 750 Mbps
KTX tầng 7: 60 Mbps
Nhà kho: 200 Mbps
```

Admin có thể nhanh chóng nắm bắt tình trạng băng thông hiện tại của tất cả các khu vực!

---

## BƯỚC 8: Setup API Khu Vực (Location Management)

### 8.1. Tạo Data Table "locations"

Vào n8n → **Settings** → **Data Tables**

Click **Create Table** → Tên: `locations`

**Columns:**
- `page` - Text - Required (RR88 | XX88 | MM88)
- `name` - Text - Required (Tên khu vực: VD "Văn phòng tầng 8", "KTX tầng 7")
- `description` - Text - Optional (Mô tả chi tiết khu vực)
- `created_at` - Date - Auto

**Sample data:**
```
RR88 | Văn phòng tầng 8 | Văn phòng chính tòa nhà A | 2025-11-28
RR88 | KTX tầng 7 | Ký túc xá sinh viên | 2025-11-28
XX88 | Nhà kho | Kho hàng tầng trệt | 2025-11-28
MM88 | Phòng server | Phòng máy chủ tầng 5 | 2025-11-28
```

---

### 8.2. Thêm Endpoint vào API GET Workflow

Vào workflow: `XuatNhapHang-API-GET`

#### 8.2.1. Update Switch Node

Thêm **Rule mới** vào Switch node:

**Rule 5 - GET Locations:**
- Value 1: `{{ $json.query.endpoint }}`
- Operation: **Equal**
- Value 2: `locations`

#### 8.2.2. Output 5 - GET Locations Flow

**Node 1: Get Many**
- Table: **locations**
- Filter: `page` Equal `{{ $json.query.page }}`
- Return All: **Yes**
- Sort: `name` Ascending

→ **Node 2: Code** (Format response):
```javascript
const locs = $input.all().map(item => {
  const loc = item.json;
  return {
    id: loc.id,
    page: loc.page,
    name: loc.name,
    description: loc.description || '',
    created_at: loc.created_at
  };
});

return [{
  json: {
    success: true,
    data: locs
  }
}];
```

→ **Respond to Webhook**

**Save workflow!**

---

### 8.3. Thêm Endpoint vào API POST Workflow

Vào workflow: `XuatNhapHang-API-POST`

#### 8.3.1. Update Switch Node

Thêm **Rule mới** vào Switch node:

**Rule - POST Location:**
- Value 1: `{{ $json.query.endpoint }}`
- Operation: **Equal**
- Value 2: `locations`

#### 8.3.2. Output - POST Location Flow

**Node 1: Code** (Validate & Prepare):
```javascript
const body = $input.first().json.body;

// Delete action
if (body.action === 'delete') {
  return [{
    json: {
      action: 'delete',
      id: body.id
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
    id: body.id || null,
    page: body.page,
    name: body.name,
    description: body.description || '',
    created_at: new Date().toISOString()
  }
}];
```

→ **Node 2: IF** (Check action)
- Condition: `{{ $json.action }}` Equal `delete`

**IF TRUE (Delete):**
→ **Node: Delete** (Data Tables)
- Table: **locations**
- Delete By: `id` Equal `{{ $json.id }}`

→ **Node: Code** (Success response):
```javascript
return [{
  json: {
    success: true,
    message: 'Xóa khu vực thành công'
  }
}];
```

**IF FALSE (Add/Update):**
→ **Node: Upsert** (Data Tables)
- Table: **locations**
- Upsert By: `id`
- Fields:
  - id: `{{ $json.id }}`
  - page: `{{ $json.page }}`
  - name: `{{ $json.name }}`
  - description: `{{ $json.description }}`
  - created_at: `{{ $json.created_at }}`

→ **Node: Code** (Success response):
```javascript
const isUpdate = $input.first().json.id;
return [{
  json: {
    success: true,
    message: isUpdate ? 'Cập nhật khu vực thành công' : 'Thêm khu vực thành công',
    data: $input.first().json
  }
}];
```

**Merge both paths** → **Respond to Webhook**

**Save workflow!**

---

### 8.4. Test API Khu Vực

#### Test GET - Lấy danh sách locations:

```
GET https://your-n8n.app/webhook/api?endpoint=locations&page=RR88&user_id=123456789
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "page": "RR88",
      "name": "Văn phòng tầng 8",
      "description": "Văn phòng chính tòa nhà A",
      "created_at": "2025-11-28T10:30:00Z"
    }
  ]
}
```

#### Test POST - Thêm location mới:

```
POST https://your-n8n.app/webhook/api?endpoint=locations&page=RR88&user_id=123456789

Body (JSON):
{
  "page": "RR88",
  "name": "KTX tầng 7",
  "description": "Ký túc xá sinh viên"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Thêm khu vực thành công",
  "data": { ... }
}
```

#### Test DELETE - Xóa location:

```
POST https://your-n8n.app/webhook/api?endpoint=locations&page=RR88&user_id=123456789

Body (JSON):
{
  "action": "delete",
  "id": 1
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Xóa khu vực thành công"
}
```

---

### 8.5. Workflow Summary - Khu Vực

**Updated Workflows:**
1. ✅ **API GET** - Thêm Rule 5: GET locations
2. ✅ **API POST** - Thêm Rule: POST locations (add/update/delete)

**New Data Table:**
- ✅ `locations` - 4 columns

**Frontend Integration:**
- ✅ Tab "Khu Vực" với CRUD đầy đủ
- ✅ Form băng thông sử dụng dropdown khu vực
- ✅ Tự động cập nhật dropdown khi thêm/sửa/xóa

**Features:**
- 📍 Quản lý danh mục khu vực (thêm/sửa/xóa)
- 🔗 Liên kết với băng thông tracking
- 🎯 Dropdown thông minh trong form băng thông
- 🔍 Filter theo page (RR88, XX88, MM88)

---

## 📊 Final Summary

**5 Workflows (Core + Extensions):**
1. Frontend (GET app)
2. API GET (products, transactions, inventory, **locations**, **bandwidth_logs**)
3. API POST (products, transactions, **locations**, **bandwidth_logs**)
4. Google Sheets Sync (Optional)

**5 Data Tables:**
1. products
2. transactions
3. allowed_users
4. **locations** ⭐ NEW
5. **bandwidth_logs** ⭐ NEW

**Features:**
- ✅ Inventory Management (Xuất Nhập Hàng)
- ✅ Multi-warehouse Support (RR88, XX88, MM88)
- ✅ User Authentication & Authorization
- ✅ Google Sheets Integration
- ✅ **Location Management** ⭐ NEW
- ✅ **Bandwidth Tracking** ⭐ NEW
- ✅ Dashboard Analytics with Bandwidth Display
- ✅ Integrated Location & Bandwidth Features

**Setup Time:**
- Core features: 40-50 phút
- + Google Sheets: +15-20 phút
- **+ Location Management: +8-10 phút** ⭐
- **+ Bandwidth Tracking: +10-15 phút** ⭐

---

**Version:** 2.5.0
**Updated:** 2025-11-28
**Contact Admin:** https://t.me/PinusITRR88