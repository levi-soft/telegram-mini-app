# ⚡ Deploy nhanh vào VPS có Traefik - 5 phút

## 🎯 Tóm tắt - 4 bước

```bash
# Bước 1: Upload code
scp -r index.html style.css app.js Dockerfile nginx.conf .dockerignore user@your-vps:/opt/n8n/telegram-mini-app/

# Bước 2: Cập nhật .env (thêm 1 dòng)
echo "TELEGRAM_SUBDOMAIN=app" >> /opt/n8n/.env

# Bước 3: Deploy
cd /opt/n8n
docker-compose up -d --build telegram-mini-app

# Bước 4: Tạo bot và config URL
# URL: https://app.yourdomain.com
```

✅ Xong!

---

## 📋 Chi tiết từng bước

### 1️⃣ Upload code lên VPS

**Từ máy local (trong folder dự án):**

```bash
# Upload toàn bộ folder
scp -r . user@your-vps:/opt/n8n/telegram-mini-app/

# Hoặc upload từng file
cd /path/to/Telegram-Mini-App
scp index.html user@your-vps:/opt/n8n/telegram-mini-app/
scp style.css user@your-vps:/opt/n8n/telegram-mini-app/
scp app.js user@your-vps:/opt/n8n/telegram-mini-app/
scp Dockerfile user@your-vps:/opt/n8n/telegram-mini-app/
scp nginx.conf user@your-vps:/opt/n8n/telegram-mini-app/
scp .dockerignore user@your-vps:/opt/n8n/telegram-mini-app/
```

### 2️⃣ Cập nhật file .env

**SSH vào VPS:**

```bash
ssh user@your-vps
cd /opt/n8n
nano .env
```

**Thêm dòng này:**

```bash
TELEGRAM_SUBDOMAIN=app
```

Lưu: Ctrl+X, Y, Enter

### 3️⃣ Cập nhật compose.yml

```bash
cd /opt/n8n
nano compose.yml
```

**Thêm service này (trước phần `volumes:`):**

```yaml
  telegram-mini-app:
    build:
      context: ./telegram-mini-app
      dockerfile: Dockerfile
    container_name: telegram-mini-app
    restart: unless-stopped
    expose:
      - "80"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.telegram-app.rule=Host(`${TELEGRAM_SUBDOMAIN}.${DOMAIN_NAME}`)"
      - "traefik.http.routers.telegram-app.entrypoints=web,websecure"
      - "traefik.http.routers.telegram-app.tls=true"
      - "traefik.http.routers.telegram-app.tls.certresolver=mytlschallenge"
      - "traefik.http.middlewares.telegram-app.headers.SSLRedirect=true"
      - "traefik.http.middlewares.telegram-app.headers.STSSeconds=315360000"
      - "traefik.http.middlewares.telegram-app.headers.browserXSSFilter=true"
      - "traefik.http.middlewares.telegram-app.headers.contentTypeNosniff=true"
      - "traefik.http.middlewares.telegram-app.headers.forceSTSHeader=true"
      - "traefik.http.middlewares.telegram-app.headers.SSLHost=${DOMAIN_NAME}"
      - "traefik.http.middlewares.telegram-app.headers.STSIncludeSubdomains=true"
      - "traefik.http.middlewares.telegram-app.headers.STSPreload=true"
      - "traefik.http.middlewares.telegram-app.headers.frameDeny=false"
      - "traefik.http.middlewares.telegram-app.headers.contentSecurityPolicy=frame-ancestors 'self' https://web.telegram.org https://telegram.org"
      - "traefik.http.routers.telegram-app.middlewares=telegram-app@docker"
      - "traefik.http.services.telegram-app.loadbalancer.server.port=80"
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  n8n_data:
  traefik_data:
```

Lưu: Ctrl+X, Y, Enter

### 4️⃣ Deploy

```bash
cd /opt/n8n

# Build và start
docker-compose up -d --build telegram-mini-app

# Xem logs
docker-compose logs -f telegram-mini-app
```

### 5️⃣ Thêm DNS (nếu chưa có)

Vào nhà cung cấp domain, thêm A record:
- **Type:** A
- **Name:** app
- **Value:** YOUR_VPS_IP
- **TTL:** 3600

Đợi 5-10 phút để DNS propagate.

### 6️⃣ Kiểm tra

```bash
# Test HTTPS
curl -I https://app.yourdomain.com

# Hoặc mở browser
firefox https://app.yourdomain.com
```

### 7️⃣ Tạo Telegram Bot

1. Mở Telegram → Tìm **@BotFather**
2. `/newbot` → Đặt tên và username
3. `/newapp` → Chọn bot
4. Điền thông tin
5. **URL:** `https://app.yourdomain.com`
6. Short name: `quanlytaisan`

### 8️⃣ Test Mini App

Mở: `https://t.me/YOUR_BOT/quanlytaisan`

---

## 🔄 Cập nhật sau này

```bash
# Upload file mới
scp index.html user@vps:/opt/n8n/telegram-mini-app/

# SSH và rebuild
ssh user@vps
cd /opt/n8n
docker-compose up -d --build telegram-mini-app
```

---

## 📊 Kiểm tra status

```bash
# Xem containers
docker-compose ps

# Xem logs
docker-compose logs -f telegram-mini-app

# Xem resource
docker stats telegram-mini-app
```

---

## ✅ Checklist

- [ ] Code đã upload vào `/opt/n8n/telegram-mini-app/`
- [ ] `.env` có `TELEGRAM_SUBDOMAIN=app`
- [ ] `compose.yml` có service `telegram-mini-app`
- [ ] DNS record `app.yourdomain.com` đã trỏ về VPS
- [ ] Container đang chạy healthy
- [ ] HTTPS hoạt động
- [ ] Telegram Bot đã config URL
- [ ] Mini App mở được trong Telegram

---

**🎉 Done! URL của bạn:** `https://app.yourdomain.com`

📖 **Chi tiết đầy đủ:** Xem [TRAEFIK_DEPLOY.md](TRAEFIK_DEPLOY.md)