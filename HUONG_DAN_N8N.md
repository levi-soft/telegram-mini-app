# 🎯 Hướng dẫn tạo Telegram Mini App trong n8n

## BƯỚC 1: Tạo Data Table (3 phút)

1. Mở n8n: `https://n8n.tayninh.cloud`
2. **Settings** (⚙️) → **Data Tables** → **"+ Add Data Table"**
3. **Name:** `inventory_imports`
4. Click **"Create"**
5. Thêm 16 columns:

| Column Name | Type | Default |
|-------------|------|---------|
| product_name | String | |
| product_code | String | |
| quantity | Number | |
| unit | String | |
| supplier | String | |
| import_date | String | |
| notes | String | |
| telegram_user_id | String | |
| telegram_user_name | String | |
| status | String | pending |
| actual_quantity | Number | |
| condition | String | |
| check_notes | String | |
| checked_by_user_id | String | |
| checked_by_user_name | String | |
| check_date | String | |

**Chỉ có `status` điền Default = `pending`, các cột khác để trống!**

---

## BƯỚC 2: Tạo Workflow (7 phút)

### Luồng 1: Serve HTML App

#### Node 1: Webhook
- Thêm node **"Webhook"**
- HTTP Method: **GET**
- Path: `app`

#### Node 2: HTML
- Thêm node **"HTML"**
- Paste HTML vào (xem file `mini-app.html` đính kèm)

#### Node 3: Respond to Webhook  
- Thêm node **"Respond to Webhook"**
- Respond With: **Text**
- Response Body: `{{ $json.html }}`
- Add Options → Response Headers:
  - Name: `Content-Type`
  - Value: `text/html; charset=utf-8`

**Kết nối:** Webhook → HTML → Respond

---

### Luồng 2: API Nhập Hàng

#### Node 1: Webhook
- Node **"Webhook"**
- HTTP Method: **POST**
- Path: `nhap-hang`

#### Node 2: Internal n8n Table
- Node **"Internal n8n Table"**
- Operation: **Create**
- Table: `inventory_imports`
- Click **"Add Field"** cho từng field:
  - `product_name` = `{{ $json.body.product_name }}`
  - `product_code` = `{{ $json.body.product_code }}`
  - `quantity` = `{{ $json.body.quantity }}`
  - `unit` = `{{ $json.body.unit }}`
  - `supplier` = `{{ $json.body.supplier }}`
  - `import_date` = `{{ $json.body.import_date }}`
  - `notes` = `{{ $json.body.notes }}`
  - `telegram_user_id` = `{{ $json.body.telegram_user_id }}`
  - `telegram_user_name` = `{{ $json.body.telegram_user_name }}`
  - `status` = `pending`

#### Node 3: Respond to Webhook
- **Respond With:** JSON
- **Response Body:** `{{ {"success": true} }}`

**Kết nối:** Webhook → Internal Table → Respond

---

### Luồng 3: API Kiểm Hàng

#### Node 1: Webhook
- **POST** `/kiem-hang`

#### Node 2: Internal Table
- Operation: **Update**
- Table: `inventory_imports`
- Select Rows: **By Condition**
- Add Condition:
  - Column: `id`
  - Operator: `equals`
  - Value: `{{ $json.body.id }}`
- Add Field để update:
  - `status` = `checked`
  - `actual_quantity` = `{{ $json.body.actual_quantity }}`
  - `condition` = `{{ $json.body.condition }}`
  - `check_notes` = `{{ $json.body.check_notes }}`
  - `checked_by_user_id` = `{{ $json.body.telegram_user_id }}`
  - `checked_by_user_name` = `{{ $json.body.telegram_user_name }}`
  - `check_date` = `{{ $now.toISO() }}`

#### Node 3: Respond
- JSON: `{{ {"success": true} }}`

**Kết nối:** Webhook → Internal Table → Respond

---

### Luồng 4: API Danh Sách

#### Node 1: Webhook
- **GET** `/danh-sach`

#### Node 2: Internal Table
- Operation: **Get Many**
- Table: `inventory_imports`
- Return All: ✅ Yes
- Add Options → Sort:
  - Column: `id`
  - Direction: `DESC`

#### Node 3: Respond
- JSON: `{{ {"success": true, "data": $json} }}`

**Kết nối:** Webhook → Internal Table → Respond

---

## BƯỚC 3: Activate Workflow

1. Đặt tên: **"Telegram Mini App"**
2. Toggle **"Active"** (màu xanh)
3. **Save**

---

## BƯỚC 4: Test

Mở browser test:
```
https://n8n.tayninh.cloud/webhook/app
```

Nếu thấy giao diện Mini App → Thành công!

---

## BƯỚC 5: Tạo Bot

1. Telegram → **@BotFather**
2. `/newbot` → Đặt tên
3. `/newapp`
4. URL: `https://n8n.tayninh.cloud/webhook/app`
5. Short name: `quanlytaisan`

---

## BƯỚC 6: Mở Mini App

```
https://t.me/YOUR_BOT/quanlytaisan
```

---

## 📊 Quản lý data

Settings → Data Tables → `inventory_imports`

---

## 🎉 Hoàn thành!

**Workflow structure:**
```
Webhook /app → HTML → Respond
Webhook /nhap-hang → Internal Table (Create) → Respond
Webhook /kiem-hang → Internal Table (Update) → Respond
Webhook /danh-sach → Internal Table (Get) → Respond
```

---

**File HTML đầy đủ xem trong [`mini-app.html`](mini-app.html) (đã tạo riêng)!**