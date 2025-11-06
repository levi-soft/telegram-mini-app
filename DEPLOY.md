# 🚀 Deploy Telegram Mini App

## 📦 Upload lên VPS

```bash
# Upload toàn bộ folder này lên VPS
scp -r . user@your-vps:/n8n-compose/telegram-mini-app/
```

## ⚙️ Cấu hình

**Thêm vào file `/n8n-compose/.env`:**

```bash
TELEGRAM_SUBDOMAIN=app
```

## 🚀 Deploy

```bash
ssh user@your-vps
cd /n8n-compose/telegram-mini-app

# Dùng file .env từ folder cha
docker compose --env-file ../.env -f docker-compose.telegram.yml up -d --build

# Xem logs
docker compose -f docker-compose.telegram.yml logs -f
```

## ✅ Kiểm tra

```bash
# Xem containers
docker compose -f docker-compose.telegram.yml ps

# Test URL
curl -I https://app.yourdomain.com
```

## 🔄 Update

```bash
cd /n8n-compose/telegram-mini-app

# Rebuild
docker compose --env-file ../.env -f docker-compose.telegram.yml up -d --build
```

## 🤖 Tạo Bot

1. Telegram → @BotFather
2. `/newbot` → Đặt tên
3. `/newapp` 
4. URL: `https://app.yourdomain.com`
5. Short name: `quanlytaisan`

## 🎯 Kết quả

- `https://n8n.yourdomain.com` - n8n
- `https://app.yourdomain.com` - Mini App

---

**Chỉ cần 6 files trong folder này:**
- index.html, style.css, app.js
- Dockerfile, nginx.conf
- docker-compose.telegram.yml