# 📊 Hướng dẫn tạo Data Table trong n8n

## 🎯 Data Table trong n8n chỉ có 3 thuộc tính

Khi tạo column trong n8n Data Table, bạn chỉ cần điền:

1. **Column Name** - Tên cột
2. **Type** - Kiểu dữ liệu
3. **Default Value** - Giá trị mặc định (optional)

**KHÔNG có chức năng "Required"** - tất cả fields đều optional!

---

## 📋 Bảng Data Table: `inventory_imports`

### Tạo 16 columns sau:

| # | Column Name | Type | Default Value | Ghi chú |
|---|-------------|------|---------------|---------|
| 1 | product_name | String | | Tên sản phẩm |
| 2 | product_code | String | | Mã sản phẩm |
| 3 | quantity | Number | | Số lượng |
| 4 | unit | String | | Đơn vị (cái, chiếc, kg...) |
| 5 | supplier | String | | Nhà cung cấp |
| 6 | import_date | String | | Ngày nhập (YYYY-MM-DD) |
| 7 | notes | String | | Ghi chú |
| 8 | telegram_user_id | String | | ID người dùng Telegram |
| 9 | telegram_user_name | String | | Tên người dùng |
| 10 | status | String | `pending` | Trạng thái (pending/checked) |
| 11 | actual_quantity | Number | | Số lượng thực tế khi kiểm |
| 12 | condition | String | | Tình trạng (good/damaged/expired) |
| 13 | check_notes | String | | Ghi chú khi kiểm |
| 14 | checked_by_user_id | String | | ID người kiểm |
| 15 | checked_by_user_name | String | | Tên người kiểm |
| 16 | check_date | String | | Ngày kiểm |

**Lưu ý:** Chỉ có `status` cần điền Default Value = `pending`, các cột khác để trống!

---

## 🔧 Cách tạo từng column

### Bước 1: Vào Data Tables

1. Mở n8n: `https://n8n.tayninh.cloud`
2. Click **Settings** (⚙️)
3. Click **"Data Tables"** ở menu bên trái
4. Click **"+ Add Data Table"**
5. **Name:** `inventory_imports`
6. Click **"Create"**

### Bước 2: Thêm columns

Bây giờ thêm từng column:

**Column 1: product_name**
1. Click **"+ Add Column"**
2. **Name:** `product_name`
3. **Type:** Chọn `String`
4. **Default Value:** Để trống
5. Click **"Add"** hoặc **"Save"**

**Column 2: product_code**
1. Click **"+ Add Column"**
2. **Name:** `product_code`
3. **Type:** `String`
4. **Default Value:** Để trống
5. Click **"Add"**

**Column 3: quantity**
1. Click **"+ Add Column"**
2. **Name:** `quantity`
3. **Type:** `Number`
4. **Default Value:** Để trống
5. Click **"Add"**

**Column 4: unit**
1. Click **"+ Add Column"**
2. **Name:** `unit`
3. **Type:** `String`
4. **Default Value:** Để trống
5. Click **"Add"**

**... Tiếp tục tương tự cho đến column 9**

**Column 10: status (ĐẶC BIỆT - có default)**
1. Click **"+ Add Column"**
2. **Name:** `status`
3. **Type:** `String`
4. **Default Value:** `pending` ← Điền "pending" vào đây!
5. Click **"Add"**

**Column 11-16:** Tạo tương tự, để Default Value trống

### Bước 3: Hoàn tất

Sau khi thêm đủ 16 columns, click **"Save"** hoặc nút xác nhận.

---

## ✅ Kiểm tra

1. Vào **Data Tables** → Click `inventory_imports`
2. Bạn sẽ thấy bảng với 17 columns:
   - `id` (tự động tạo bởi n8n)
   - 16 columns bạn vừa tạo
3. Bảng đang trống (0 rows)

---

## 🚀 Bước tiếp theo

Sau khi tạo Data Table xong, tiếp tục tạo Workflow theo:

**[`N8N_MANUAL_GUIDE.md`](N8N_MANUAL_GUIDE.md)** - Bước 2 trở đi

---

## 💡 Validation

Vì n8n không có Required, bạn cần validate trong Code node hoặc JavaScript ở frontend.

Frontend đã có validation HTML5:
```html
<input type="text" id="product-name" required>
```

Điều này đảm bảo user phải nhập đủ thông tin trước khi submit.

---

**Data Table đơn giản! Chỉ có Name, Type, Default! 🎉**