# 🔄 Setup n8n Workflow - ĐƠN GIẢN NHẤT

## 🎯 Tại sao dùng n8n?

- ✅ Bạn đã có n8n chạy sẵn!
- ✅ Dùng n8n Data Table để lưu dữ liệu
- ✅ Không cần database riêng
- ✅ Không cần Supabase
- ✅ Đơn giản, dễ quản lý

## 📋 Bước 1: Import Workflow vào n8n

1. Mở n8n: `https://n8n.tayninh.cloud`
2. Click nút **"+"** (New workflow)
3. Click **"⋮"** (menu 3 chấm) → **"Import from File"**
4. Chọn file [`n8n-workflow.json`](n8n-workflow.json)
5. Workflow sẽ được import với 3 webhooks:
   - `nhap-hang` - Lưu phiếu nhập
   - `kiem-hang` - Cập nhật kiểm hàng
   - `danh-sach` - Lấy danh sách

## 🗄️ Bước 2: Tạo Data Table

1. Trong n8n, vào **"Settings"** (⚙️)
2. Click **"Data Tables"**
3. Click **"Add Data Table"**
4. Đặt tên: `inventory_imports`
5. Thêm các columns (cột):

| Column Name | Type | Required |
|-------------|------|----------|
| product_name | String | ✅ Yes |
| product_code | String | ✅ Yes |
| quantity | Number | ✅ Yes |
| unit | String | ✅ Yes |
| supplier | String | ❌ No |
| import_date | String | ✅ Yes |
| notes | String | ❌ No |
| telegram_user_id | String | ✅ Yes |
| telegram_user_name | String | ❌ No |
| status | String | ✅ Yes |
| check_date | String | ❌ No |
| actual_quantity | Number | ❌ No |
| condition | String | ❌ No |
| check_notes | String | ❌ No |
| checked_by_user_id | String | ❌ No |
| checked_by_user_name | String | ❌ No |

6. Click **"Save"**

## ⚙️ Bước 3: Cập nhật Workflow Nodes

### Node "Lưu Nhập Hàng":
1. Click vào node **"Lưu Nhập Hàng"**
2. Chọn **"Data Table Name"**: `inventory_imports`
3. Mapping các fields:
   - product_name: `{{ $json.product_name }}`
   - product_code: `{{ $json.product_code }}`
   - quantity: `{{ $json.quantity }}`
   - unit: `{{ $json.unit }}`
   - supplier: `{{ $json.supplier }}`
   - import_date: `{{ $json.import_date }}`
   - notes: `{{ $json.notes }}`
   - telegram_user_id: `{{ $json.telegram_user_id }}`
   - telegram_user_name: `{{ $json.telegram_user_name }}`
   - status: `pending`
   - created_at: `{{ $now.toISO() }}`

### Node "Lấy Danh Sách":
1. Click vào node **"Lấy Danh Sách"**
2. **Operation**: `Get All`
3. **Data Table Name**: `inventory_imports`
4. **Return All**: ✅ Yes
5. **Sort**: `created_at` descending

### Node "Cập Nhật Kiểm Hàng":
1. Click vào node **"Cập Nhật Kiểm Hàng"**
2. **Operation**: `Update`
3. **Data Table Name**: `inventory_imports`
4. **Filter**: `id = {{ $json.id }}`
5. Update fields:
   - status: `checked`
   - check_date: `{{ $now.toISO() }}`
   - actual_quantity: `{{ $json.actual_quantity }}`
   - condition: `{{ $json.condition }}`
   - check_notes: `{{ $json.check_notes }}`
   - checked_by_user_id: `{{ $json.telegram_user_id }}`
   - checked_by_user_name: `{{ $json.telegram_user_name }}`

## 🚀 Bước 4: Activate Workflow

1. Đặt tên workflow: **"Telegram Mini App API"**
2. Click nút **"Active"** (toggle ON) ở góc phải trên
3. Workflow sẽ chuyển sang màu xanh

## 🔗 Bước 5: Test Webhooks

### Test Webhook "Danh Sách":
```bash
curl https://n8n.tayninh.cloud/webhook/danh-sach
```

Nếu thành công, sẽ trả về:
```json
{
  "success": true,
  "data": []
}
```

### Test Webhook "Nhập Hàng":
```bash
curl -X POST https://n8n.tayninh.cloud/webhook/nhap-hang \
  -H "Content-Type: application/json" \
  -d '{
    "product_name": "Test Product",
    "product_code": "TEST001",
    "quantity": 10,
    "unit": "cái",
    "supplier": "Test Supplier",
    "import_date": "2024-11-06",
    "notes": "",
    "telegram_user_id": "123456",
    "telegram_user_name": "Test User"
  }'
```

## ✅ Bước 6: Deploy Mini App

File [`app-n8n.js`](app-n8n.js:12) đã cấu hình đúng URL:

```javascript
const N8N_BASE_URL = 'https://n8n.tayninh.cloud/webhook';
```

Deploy lên VPS:

```bash
# Push lên GitHub
git add .
git commit -m "Switch to n8n Data Table"
git push

# Deploy
ssh user@vps
cd /n8n-compose/telegram-mini-app
git pull
docker compose --env-file ../.env -f docker-compose.telegram.yml up -d --build
```

## 🎉 Hoàn tất!

Giờ đây:
- ✅ Dữ liệu lưu trong n8n Data Table
- ✅ Không cần Supabase
- ✅ Đơn giản hơn rất nhiều
- ✅ Dễ quản lý từ n8n UI
- ✅ Có thể tạo thêm workflow khác (thông báo, báo cáo, etc.)

## 📊 Xem dữ liệu trong n8n

1. Vào n8n → **"Data Tables"**
2. Click table `inventory_imports`
3. Xem tất cả dữ liệu
4. Có thể thêm/sửa/xóa trực tiếp

## 🔄 Mở rộng sau này

Từ n8n, bạn dễ dàng thêm:
- 📧 Gửi email khi có hàng mới
- 📊 Tạo báo cáo tự động mỗi tuần
- 💬 Gửi thông báo Telegram khi cần kiểm hàng
- 📈 Export dữ liệu ra Google Sheets
- 🔔 Nhắc nhở kiểm hàng định kỳ

---

**Đơn giản và mạnh mẽ với n8n! 🚀**