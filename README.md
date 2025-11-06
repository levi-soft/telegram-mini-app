# 📦 Telegram Mini App - Xuất Nhập Tồn

**Chỉ cần 1 file:** [`mini-app-full.html`](mini-app-full.html)

**Lưu data:** Google Sheets (3 sheets cho 3 công ty)

---

## 📊 BƯỚC 1: Tạo Google Spreadsheet

1. Vào https://sheets.google.com
2. Tạo mới: **"Quản Lý Tài Sản"**
3. Tạo 3 sheets:
   - Sheet 1: Đổi tên **"RR88"**
   - Sheet 2: Thêm mới **"XX88"**
   - Sheet 3: Thêm mới **"MM88"**

4. Mỗi sheet có header row 1 giống nhau:

| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| ID | Loại | Tên SP | Mã SP | SL | Đơn vị | NCC | Ngày | Người | Trạng thái |

**Loại:** "Nhập" hoặc "Xuất"

---

## 🔄 BƯỚC 2: Workflow n8n (5 webhooks)

### Webhook 1: GET /app (Serve HTML)

**Node 1: Webhook**
- HTTP Method: GET
- Path: `app`

**Node 2: HTML**
- Paste toàn bộ file [`mini-app-full.html`](mini-app-full.html)

**Node 3: Respond to Webhook**
- Respond With: Text
- Response Body: `{{ $json.html }}`
- Add Options → Response Headers:
  - Content-Type: `text/html; charset=utf-8`

**Kết nối:** Webhook → HTML → Respond

---

### Webhook 2: POST /nhap-hang

**Node 1: Webhook**
- HTTP Method: POST
- Path: `nhap-hang`

**Node 2: Google Sheets**
- Operation: **Append**
- Document: "Quản Lý Tài Sản"
- Sheet: **{{ $json.body.trang }}** ← Động! RR88/XX88/MM88
- Columns (thứ tự A-J):
  - A: `={{ $json.body.id || Date.now() }}`
  - B: `Nhập`
  - C: `={{ $json.body.product_name }}`
  - D: `={{ $json.body.product_code }}`
  - E: `={{ $json.body.quantity }}`
  - F: `={{ $json.body.unit }}`
  - G: `={{ $json.body.supplier }}`
  - H: `={{ $json.body.import_date }}`
  - I: `={{ $json.body.telegram_user_name }}`
  - J: `={{ $json.body.status }}`

**Node 3: Respond**
- JSON: `{{ {"success": true} }}`

**Kết nối:** Webhook → Google Sheets → Respond

---

### Webhook 3: POST /xuat-hang

**Node 1: Webhook**
- HTTP Method: POST
- Path: `xuat-hang`

**Node 2: Google Sheets**
- Operation: Append
- Document: "Quản Lý Tài Sản"
- Sheet: **{{ $json.body.trang }}**
- Columns:
  - A: `={{ Date.now() }}`
  - B: `Xuất`
  - C: `={{ $json.body.product_name }}`
  - D: `={{ $json.body.product_code }}`
  - E: `={{ $json.body.quantity }}`
  - F: `={{ $json.body.unit }}`
  - G: (trống)
  - H: `={{ $json.body.import_date }}`
  - I: `={{ $json.body.telegram_user_name }}`
  - J: `completed`

**Node 3: Respond**
- JSON: `{{ {"success": true} }}`

**Kết nối:** Webhook → Google Sheets → Respond

---

### Webhook 4: GET /danh-sach

**Node 1: Webhook**
- HTTP Method: GET
- Path: `danh-sach`

**Node 2: Google Sheets**
- Operation: **Lookup**
- Document: "Quản Lý Tài Sản"
- Sheet: **RR88** (hoặc tạo webhook riêng cho mỗi sheet)
- Return All Matches: ON

**Hoặc đơn giản hơn:**

**Node 2: Code**
```javascript
// Fetch data từ tất cả 3 sheets
const sheets = ['RR88', 'XX88', 'MM88'];
const allData = [];

for (const sheet of sheets) {
    // Giả sử bạn có node Google Sheets Get All cho từng sheet
    // Hoặc dùng Google Sheets API trực tiếp
}

return allData;
```

**Node 3: Respond**
- JSON: `={{ $json }}`

---

### Webhook 5: POST /kiem-hang

**Node 1: Webhook**
- HTTP Method: POST
- Path: `kiem-hang`

**Node 2: Google Sheets**
- Operation: **Update**
- Document: "Quản Lý Tài Sản"
- Sheet: `={{ $json.body.trang }}`
- Lookup Column: `D` (Mã SP)
- Lookup Value: `={{ $json.body.product_code }}`
- Update Columns:
  - J (Trạng thái): `checked`

**Node 3: Respond**
- JSON: `{{ {"success": true} }}`

---

## 🎯 Workflow đơn giản hơn

Vì Google Sheets phức tạp khi Get All từ nhiều sheets, đề xuất:

### Option 1: Mỗi Trang 1 webhook riêng

```
GET /danh-sach-rr88 → Google Sheets (RR88) → Respond
GET /danh-sach-xx88 → Google Sheets (XX88) → Respond
GET /danh-sach-mm88 → Google Sheets (MM88) → Respond
```

Mini App call 3 APIs và merge data.

### Option 2: Vẫn dùng Data Table + sync sang Sheets

Đơn giản hơn nhiều:
- Data Table làm database chính
- Google Sheets chỉ để xem/export

---

## ✅ Checklist

- [ ] Google Spreadsheet có 3 sheets: RR88, XX88, MM88
- [ ] Header row đã setup
- [ ] 5 webhooks đã tạo
- [ ] Google Sheets nodes có credential
- [ ] Workflow Active
- [ ] Test: https://n8n.tayninh.cloud/webhook/app
- [ ] Bot config đúng URL

---

**Khuyến nghị: Vẫn dùng Data Table + sync Google Sheets cho đơn giản!**

Tôi có thể tạo workflow hybrid: Data Table + Google Sheets nếu bạn muốn!
</result>
</attempt_completion>