# 📦 Telegram Mini App với n8n Data Table

## 🎯 Giải pháp đơn giản nhất

Dùng n8n Data Table có sẵn trên `tayninh.cloud` để lưu dữ liệu - không cần Supabase!

## ✅ Files cần thiết (chỉ 8 files)

### 🎨 Frontend:
1. **index.html** - Giao diện
2. **style.css** - CSS
3. **app-n8n.js** - Logic với n8n webhooks

### 🐳 Docker:
4. **Dockerfile** - Build image
5. **nginx.conf** - Nginx config
6. **docker-compose.telegram.yml** - Deploy config

### 🔄 n8n:
7. **n8n-workflow.json** - Workflow để import vào n8n

### 📖 Docs:
8. **N8N_SETUP.md** - Hướng dẫn setup

## 🚀 Setup - 3 bước:

### 1️⃣ Setup n8n Workflow

Làm theo [`N8N_SETUP.md`](N8N_SETUP.md):

```bash
1. Import n8n-workflow.json vào n8n
2. Tạo Data Table: inventory_imports
3. Activate workflow
```

### 2️⃣ Deploy Mini App

```bash
# Clone từ GitHub
cd /n8n-compose
git clone https://github.com/levi-soft/telegram-mini-app.git

# Thêm vào .env
echo "TELEGRAM_SUBDOMAIN=app" >> .env

# Deploy
cd telegram-mini-app
docker compose --env-file ../.env -f docker-compose.telegram.yml up -d --build
```

### 3️⃣ Tạo Telegram Bot

```bash
@BotFather → /newapp
URL: https://app.tayninh.cloud
```

## 🎯 URLs:

- `https://n8n.tayninh.cloud` - n8n (quản lý data)
- `https://app.tayninh.cloud` - Mini App

## 🔄 Update code:

```bash
cd /n8n-compose/telegram-mini-app
git pull
docker compose --env-file ../.env -f docker-compose.telegram.yml up -d --build
```

## 💡 Ưu điểm:

- ✅ Dùng n8n có sẵn (không cần Supabase)
- ✅ Data Table dễ quản lý trong n8n UI
- ✅ Có thể tạo thêm workflow khác
- ✅ Đơn giản, không phức tạp
- ✅ Miễn phí 100%

## 📊 Quản lý dữ liệu:

1. Vào n8n
2. Settings → Data Tables
3. Click `inventory_imports`
4. Xem/sửa/xóa dữ liệu

## 🔄 Workflow n8n có 3 endpoints:

```
POST /webhook/nhap-hang   - Lưu phiếu nhập
POST /webhook/kiem-hang   - Cập nhật kiểm hàng  
GET  /webhook/danh-sach   - Lấy danh sách
```

## 📚 Docs:

- **[N8N_SETUP.md](N8N_SETUP.md)** - Hướng dẫn setup n8n
- **[DEPLOY.md](DEPLOY.md)** - Hướng dẫn deploy (cần update)

---

**Đơn giản với n8n! 🚀**