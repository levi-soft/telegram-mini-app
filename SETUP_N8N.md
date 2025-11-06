# ⚡ Setup Telegram Mini App với n8n - ĐƠN GIẢN

## 🎯 Tổng quan

Giải pháp này sử dụng:
- ✅ n8n Data Table để lưu dữ liệu (có sẵn!)
- ✅ n8n Webhooks làm API
- ✅ Traefik + Docker (có sẵn!)
- ✅ Domain: tayninh.cloud

**Đơn giản! Không cần Supabase, không cần database riêng!**

---

## 📋 BƯỚC 1: Setup n8n (5 phút)

### 1.1. Import Workflow

1. Mở n8n: `https://n8n.tayninh.cloud`
2. Click **"+ New workflow"**
3. Click menu **"⋮"** → **"Import from File"**
4. Chọn file **`n8n-workflow.json`**
5. Workflow có 3 webhooks sẽ được import

### 1.2. Tạo Data Table

1. Vào **"Settings"** (⚙️) → **"Data Tables"**
2. Click **"+ Add Data Table"**
3. Tên table: `inventory_imports`
4. Thêm các columns:

**Required columns** (bắt buộc):
```
product_name      - String - Required
product_code      - String - Required  
quantity          - Number - Required
unit              - String - Required
import_date       - String - Required
telegram_user_id  - String - Required
status            - String - Required (default: pending)
```

**Optional columns** (tùy chọn):
```
supplier              - String
notes                 - String
telegram_user_name    - String
check_date            - String
actual_quantity       - Number
condition             - String
check_notes           - String
checked_by_user_id    - String
checked_by_user_name  - String
```

5. Click **"Create"**

### 1.3. Cấu hình Workflow Nodes

**Node 1: Lưu Nhập Hàng**
- Operation: `Create`
- Data Table: `inventory_imports`
- Map các fields từ webhook

**Node 2: Lấy Danh Sách**
- Operation: `Get All`
- Data Table: `inventory_imports`
- Sort by: `id` descending

**Node 3: Cập Nhật Kiểm Hàng**
- Operation: `Update`
- Data Table: `inventory_imports`
- Filter: `id = {{ $json.id }}`

### 1.4. Activate Workflow

1. Đặt tên: **"Telegram Mini App API"**
2. Toggle **"Active"** (màu xanh)
3. Lưu workflow

### 1.5. Test Webhooks

```bash
# Test lấy danh sách
curl https://n8n.tayninh.cloud/webhook/danh-sach

# Nên trả về: {"success":true,"data":[]}
```

---

## 📦 BƯỚC 2: Deploy Mini App (3 phút)

### 2.1. Clone Repository

```bash
ssh user@your-vps
cd /n8n-compose
git clone https://github.com/levi-soft/telegram-mini-app.git
```

### 2.2. Cấu hình .env

```bash
cd /n8n-compose
nano .env
```

Thêm dòngử này:
```bash
TELEGRAM_SUBDOMAIN=app
```

Lưu: Ctrl+X, Y, Enter

### 2.3. Deploy

```bash
cd /n8n-compose/telegram-mini-app

# Deploy
docker compose --env-file ../.env -f docker-compose.telegram.yml up -d --build

# Xem logs
docker compose -f docker-compose.telegram.yml logs -f
```

### 2.4. Kiểm tra

```bash
# Test Mini App
curl -I https://app.tayninh.cloud

# Xem containers
docker compose -f docker-compose.telegram.yml ps
```

---

## 🤖 BƯỚC 3: Tạo Telegram Bot (3 phút)

1. Mở Telegram → Tìm **@BotFather**
2. Gửi: `/newbot`
3. Đặt tên: `Quản Lý Tài Sản TayNinh`
4. Username: `TayNinhAssetBot`
5. Lưu API Token
6. Gửi: `/newapp`
7. Chọn bot vừa tạo
8. Tên app: `Quản Lý Tài Sản`
9. Mô tả: `Ứng dụng quản lý hàng hóa công ty`
10. `/empty` (bỏ qua ảnh)
11. `/empty` (bỏ qua GIF)
12. **URL:** `https://app.tayninh.cloud`
13. Short name: `quanlytaisan`

---

## 🎉 BƯỚC 4: Test

Mở trong Telegram:
```
https://t.me/TayNinhAssetBot/quanlytaisan
```

Hoặc: Chat với bot → Click Menu → Chọn app

---

## 🔄 Update Code

```bash
# Từ máy local, push lên GitHub
git add .
git commit -m "Update features"
git push

# Trên VPS
ssh user@vps
cd /n8n-compose/telegram-mini-app
git pull
docker compose --env-file ../.env -f docker-compose.telegram.yml up -d --build
```

---

## 📊 Quản lý Dữ liệu

### Xem data trong n8n:
1. Vào `https://n8n.tayninh.cloud`
2. Settings → Data Tables
3. Click `inventory_imports`
4. Xem/edit/delete records

### Export data:
- Click **"Export"** trong Data Table
- Chọn format: CSV hoặc JSON

---

## 🐛 Troubleshooting

### Workflow không active:
```bash
1. Vào n8n
2. Mở workflow
3. Check toggle "Active" có màu xanh không
4. Save workflow
```

### Webhook 404:
```bash
1. Check workflow đã active chưa
2. Check path webhook đúng format: /webhook/nhap-hang
3. Test trực tiếp trong n8n UI
```

### Mini App không load data:
```bash
1. F12 xem console log trong Telegram
2. Check N8N_BASE_URL trong app-n8n.js
3. Test webhook curl: curl https://n8n.tayninh.cloud/webhook/danh-sach
```

---

## ✅ Checklist

- [ ] n8n workflow đã import và active
- [ ] Data Table `inventory_imports` đã tạo
- [ ] Test webhook bằng curl thành công
- [ ] Mini App đã deploy lên VPS
- [ ] DNS `app.tayninh.cloud` đã trỏ về VPS
- [ ] Container telegram-mini-app đang chạy
- [ ] HTTPS hoạt động: https://app.tayninh.cloud
- [ ] Telegram Bot đã tạo và config URL
- [ ] Mini App mở được trong Telegram

---

## 🎯 Kết quả

- ✅ `https://n8n.tayninh.cloud` - n8n (quản lý data + workflows)
- ✅ `https://app.tayninh.cloud` - Telegram Mini App

Cả 2 đều HTTPS tự động!

---

**Đơn giản và mạnh mẽ với n8n! 🚀**