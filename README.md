# 📦 Telegram Mini App - Quản Lý Tài Sản

Ứng dụng quản lý hàng hóa công ty: Nhập Hàng - Kiểm Hàng - Danh Sách

**Setup hoàn toàn trong n8n - chỉ cần 1 file HTML!**

---

## 🚀 HƯỚNG DẪN SETUP

### Bước 1: Tạo Data Table (2 phút)

n8n → **Settings** → **Data Tables** → **Add Table**

**Tên table:** `inventory_imports`

**Thêm 16 columns:**

| Tên | Kiểu |
|-----|------|
| product_name | String |
| product_code | String |
| quantity | Number |
| unit | String |
| supplier | String |
| import_date | String |
| notes | String |
| telegram_user_id | String |
| telegram_user_name | String |
| status | String |
| actual_quantity | Number |
| condition | String |
| check_notes | String |
| checked_by_user_id | String |
| checked_by_user_name | String |
| check_date | String |

Click **Create**

---

### Bước 2: Tạo Workflow (5 phút)

**New Workflow** → Tên: "Telegram Mini App"

#### Luồng 1: Serve HTML

Thêm 3 nodes theo thứ tự:

**1. Webhook**
- HTTP Method: GET
- Path: `app`

**2. HTML** 
- Copy toàn bộ file [`mini-app.html`](mini-app.html) paste vào

**3. Respond to Webhook**
- Respond With: Text
- Response Body: `{{ $json.html }}`
- Add Options → Response Headers:
  - Content-Type: `text/html; charset=utf-8`

Kết nối: Webhook → HTML → Respond

---

#### Luồng 2: API Nhập Hàng

**1. Webhook**
- POST `/nhap-hang`

**2. Internal n8n Table**
- Operation: Create
- Table: `inventory_imports`
- Add Field (9 fields):
  - product_name = `{{ $json.body.product_name }}`
  - product_code = `{{ $json.body.product_code }}`
  - quantity = `{{ $json.body.quantity }}`
  - unit = `{{ $json.body.unit }}`
  - supplier = `{{ $json.body.supplier }}`
  - import_date = `{{ $json.body.import_date }}`
  - notes = `{{ $json.body.notes }}`
  - telegram_user_id = `{{ $json.body.telegram_user_id }}`
  - telegram_user_name = `{{ $json.body.telegram_user_name }}`

**3. Respond to Webhook**
- JSON: `{{ {"success": true} }}`

Kết nối: Webhook → Internal Table → Respond

---

#### Luồng 3: API Danh Sách

**1. Webhook**
- GET `/danh-sach`

**2. Internal n8n Table**
- Operation: Get Many
- Table: `inventory_imports`
- Return All: ✅ ON
- Options → Sort: id DESC

**3. Respond to Webhook**
- JSON: `{{ $json }}`

Kết nối: Webhook → Internal Table → Respond

---

#### Luồng 4: API Kiểm Hàng

**1. Webhook**
- POST `/kiem-hang`

**2. Internal n8n Table**
- Operation: Update
- Table: `inventory_imports`
- Select Rows: By Condition
  - Column: `id`
  - Operator: `equals`
  - Value: `{{ $json.body.id }}`
- Add Field (6 fields):
  - status = `checked`
  - actual_quantity = `{{ $json.body.actual_quantity }}`
  - condition = `{{ $json.body.condition }}`
  - check_notes = `{{ $json.body.check_notes }}`
  - checked_by_user_id = `{{ $json.body.telegram_user_id }}`
  - checked_by_user_name = `{{ $json.body.telegram_user_name }}`

**3. Respond to Webhook**
- JSON: `{{ {"success": true} }}`

Kết nối: Webhook → Internal Table → Respond

---

### Bước 3: Activate

- Toggle **Active** ON
- **Save**

---

### Bước 4: Test

Browser: `https://n8n.tayninh.cloud/webhook/app`

---

### Bước 5: Tạo Bot

1. @BotFather → `/newapp`
2. URL: `https://n8n.tayninh.cloud/webhook/app`
3. Short name: `quanlytaisan`

---

### Bước 6: Mở App

`https://t.me/YOUR_BOT/quanlytaisan`

---

## 📊 Quản lý Data

Settings → Data Tables → `inventory_imports`

---

## 🔄 Update UI

Edit node **HTML** → Sửa code → Save

---

## 🐛 Debug

Telegram Desktop → Ctrl+Shift+I → Console

---

**Chỉ 1 file [`mini-app.html`](mini-app.html)! Siêu đơn giản! 🎉**

**Domain:** tayninh.cloud  
**GitHub:** https://github.com/levi-soft/telegram-mini-app