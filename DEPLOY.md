# 🚀 Deploy Telegram Mini App lên tayninh.cloud

## 📋 Thông tin

- **GitHub:** https://github.com/levi-soft/telegram-mini-app
- **Domain:** tayninh.cloud
- **n8n:** https://n8n.tayninh.cloud
- **Mini App:** https://app.tayninh.cloud (sẽ tạo)

## 🔧 Bước 1: Clone code từ GitHub

```bash
# SSH vào VPS Ubuntu
ssh user@your-vps

# Di chuyển vào thư mục n8n
cd /n8n-compose

# Clone repository
git clone https://github.com/levi-soft/telegram-mini-app.git

# Hoặc nếu folder đã tồn tại, pull code mới:
cd telegram-mini-app
git pull origin main
```

## ⚙️ Bước 2: Cấu hình .env

```bash
# Mở file .env của n8n
cd /n8n-compose
nano .env
```

**Thêm dòng này vào cuối file:**

```bash
TELEGRAM_SUBDOMAIN=app
```

File .env sẽ giống như:

```bash
DOMAIN_NAME=tayninh.cloud
SUBDOMAIN=n8n
GENERIC_TIMEZONE=Europe/Berlin
SSL_EMAIL=your-email@example.com
TELEGRAM_SUBDOMAIN=app
```

Lưu: **Ctrl+X**, **Y**, **Enter**

## 🚀 Bước 3: Deploy

```bash
cd /n8n-compose/telegram-mini-app

# Deploy với .env từ folder cha
docker compose --env-file ../.env -f docker-compose.telegram.yml up -d --build

# Xem logs
docker compose -f docker-compose.telegram.yml logs -f
```

## ✅ Bước 4: Kiểm tra

```bash
# Xem containers
docker compose -f docker-compose.telegram.yml ps

# Test URL
curl -I https://app.tayninh.cloud

# Nên thấy: HTTP/2 200
```

## 🌐 Bước 5: Cấu hình DNS (nếu chưa có)

Tại nhà cung cấp domain `tayninh.cloud`, thêm A record:

- **Type:** A
- **Name:** `app`
- **Value:** `YOUR_VPS_IP`
- **TTL:** 3600

Đợi 5-10 phút để DNS propagate.

Kiểm tra:
```bash
nslookup app.tayninh.cloud
```

## 🤖 Bước 6: Tạo Telegram Bot

1. Mở Telegram → Tìm **@BotFather**
2. Gửi: `/newbot`
3. Đặt tên: `Quản Lý Tài Sản TayNinh`
4. Username: `TayNinhAssetBot` (hoặc tên bạn muốn)
5. Lưu API Token
6. Gửi: `/newapp`
7. Chọn bot vừa tạo
8. Tên app: `Quản Lý Tài Sản`
9. Mô tả: `Ứng dụng quản lý hàng hóa công ty`
10. Gửi `/empty` (bỏ qua ảnh)
11. Gửi `/empty` (bỏ qua GIF)
12. **URL:** `https://app.tayninh.cloud`
13. Short name: `quanlytaisan`

## 🎉 Bước 7: Test

Mở link trong Telegram:

```
https://t.me/YOUR_BOT_USERNAME/quanlytaisan
```

Hoặc mở chat với bot → Click Menu (≡) → Chọn app.

---

## 🔄 Cập nhật code sau này

```bash
# SSH vào VPS
ssh user@your-vps

# Pull code mới từ GitHub
cd /n8n-compose/telegram-mini-app
git pull origin main

# Rebuild và restart
docker compose --env-file ../.env -f docker-compose.telegram.yml up -d --build

# Xem logs
docker compose -f docker-compose.telegram.yml logs -f
```

---

## 📊 Lệnh quản lý

```bash
cd /n8n-compose/telegram-mini-app

# Xem logs
docker compose -f docker-compose.telegram.yml logs -f

# Xem status
docker compose -f docker-compose.telegram.yml ps

# Restart
docker compose -f docker-compose.telegram.yml restart

# Stop
docker compose -f docker-compose.telegram.yml stop

# Start
docker compose -f docker-compose.telegram.yml start

# Xem resource
docker stats telegram-mini-app
```

---

## 🐛 Debug

```bash
# Logs chi tiết
docker compose -f docker-compose.telegram.yml logs telegram-mini-app

# Kiểm tra files
ls -la /n8n-compose/telegram-mini-app/

# Rebuild từ đầu
cd /n8n-compose/telegram-mini-app
docker compose -f docker-compose.telegram.yml down
docker compose --env-file ../.env -f docker-compose.telegram.yml up -d --build --force-recreate
```

---

## 🎯 Kết quả

Bạn sẽ có:
- ✅ `https://n8n.tayninh.cloud` - n8n
- ✅ `https://app.tayninh.cloud` - Telegram Mini App

Cả 2 đều có HTTPS tự động từ Traefik + Let's Encrypt!

---

## 📁 Cấu trúc

```
/n8n-compose/
├── .env (đã update)
├── compose.yml (n8n - không động)
└── telegram-mini-app/ (từ GitHub)
    ├── index.html
    ├── style.css
    ├── app.js
    ├── Dockerfile
    ├── nginx.conf
    ├── docker-compose.telegram.yml
    └── DEPLOY.md (file này)
```

---

**Chúc bạn deploy thành công trên tayninh.cloud! 🚀**