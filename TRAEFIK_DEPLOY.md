# 🚀 Deploy Telegram Mini App vào VPS có sẵn Traefik & n8n

## 📋 Tình huống của bạn

Bạn đã có:
- ✅ VPS đang chạy
- ✅ Traefik reverse proxy
- ✅ n8n workflow automation
- ✅ Domain với SSL (Let's Encrypt)
- ✅ File `compose.yml` và `.env`

Bây giờ bạn muốn thêm Telegram Mini App vào cùng VPS này.

## 🎯 Kết quả mong đợi

Sau khi hoàn thành, bạn sẽ có:
- `n8n.yourdomain.com` - n8n (đang có)
- `app.yourdomain.com` - Telegram Mini App (mới)

Tất cả đều có HTTPS tự động từ Traefik + Let's Encrypt.

## 📦 Bước 1: Chuẩn bị cấu trúc thư mục

Trên VPS của bạn, giả sử n8n đang ở `/opt/n8n/`:

```bash
# SSH vào VPS
ssh user@your-vps

# Tạo folder cho Telegram Mini App
cd /opt/n8n
mkdir telegram-mini-app
cd telegram-mini-app
```

## 📤 Bước 2: Upload code Mini App

**Cách 1: Sử dụng SCP (từ máy local)**

```bash
# Từ thư mục dự án trên máy local
cd /path/to/Telegram-Mini-App

# Upload các file cần thiết
scp index.html user@your-vps:/opt/n8n/telegram-mini-app/
scp style.css user@your-vps:/opt/n8n/telegram-mini-app/
scp app.js user@your-vps:/opt/n8n/telegram-mini-app/
scp Dockerfile user@your-vps:/opt/n8n/telegram-mini-app/
scp nginx.conf user@your-vps:/opt/n8n/telegram-mini-app/
scp .dockerignore user@your-vps:/opt/n8n/telegram-mini-app/
```

**Cách 2: Sử dụng Git**

```bash
# Trên VPS
cd /opt/n8n/telegram-mini-app

# Clone hoặc pull
git init
git remote add origin https://github.com/YOUR_USERNAME/telegram-mini-app.git
git pull origin main

# Hoặc nếu đã có repo
git clone https://github.com/YOUR_USERNAME/telegram-mini-app.git .
```

**Cách 3: Tạo file trực tiếp trên VPS**

```bash
cd /opt/n8n/telegram-mini-app

# Tạo Dockerfile
nano Dockerfile
# Copy nội dung từ Dockerfile vào, Ctrl+X để lưu

# Tạo nginx.conf
nano nginx.conf
# Copy nội dung, Ctrl+X để lưu

# Tạo index.html, style.css, app.js
# Tương tự như trên
```

## ⚙️ Bước 3: Cập nhật file .env

```bash
cd /opt/n8n
nano .env
```

Thêm dòng này vào file `.env`:

```bash
TELEGRAM_SUBDOMAIN=app
```

File `.env` của bạn sẽ giống như:

```bash
DOMAIN_NAME=yourdomain.com
SUBDOMAIN=n8n
TELEGRAM_SUBDOMAIN=app
SSL_EMAIL=your-email@example.com
GENERIC_TIMEZONE=Asia/Bangkok
```

Lưu và thoát (Ctrl+X, Y, Enter).

## 🐳 Bước 4: Cập nhật compose.yml

```bash
cd /opt/n8n
nano compose.yml
```

Thêm service `telegram-mini-app` vào cuối file (trước phần `volumes:`):

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

Lưu và thoát (Ctrl+X, Y, Enter).

## 🚀 Bước 5: Build và Deploy

```bash
cd /opt/n8n

# Build image Telegram Mini App
docker-compose build telegram-mini-app

# Start container (không ảnh hưởng n8n đang chạy)
docker-compose up -d telegram-mini-app

# Xem logs
docker-compose logs -f telegram-mini-app
```

## ✅ Bước 6: Kiểm tra

### Kiểm tra DNS

```bash
# Kiểm tra subdomain đã resolve chưa
nslookup app.yourdomain.com
```

Nếu chưa, thêm A record tại nhà cung cấp domain:
- Type: `A`
- Name: `app`
- Value: `YOUR_VPS_IP`
- TTL: `3600`

### Kiểm tra container

```bash
# Xem status
docker-compose ps

# Nên thấy output như này:
# telegram-mini-app    running    healthy
# n8n                  running
# traefik              running
```

### Kiểm tra HTTPS

```bash
# Test endpoint
curl -I https://app.yourdomain.com

# Hoặc mở browser
firefox https://app.yourdomain.com
```

## 🤖 Bước 7: Đăng ký Telegram Bot

1. Mở Telegram, tìm **@BotFather**
2. Gửi: `/newbot`
3. Đặt tên: `Quản Lý Tài Sản`
4. Username: `QuanLyTaiSanBot`
5. Lưu API Token
6. Gửi: `/newapp`
7. Chọn bot vừa tạo
8. Tên app: `Quản Lý Tài Sản`
9. Mô tả: `Quản lý hàng hóa công ty`
10. `/empty` (bỏ qua ảnh)
11. `/empty` (bỏ qua GIF)
12. **URL**: `https://app.yourdomain.com`
13. Short name: `quanlytaisan`

## 🎉 Bước 8: Test Mini App

Mở link trong Telegram:
```
https://t.me/YOUR_BOT_USERNAME/quanlytaisan
```

Hoặc mở chat với bot → Click Menu (≡) → Chọn app.

## 🔄 Cập nhật code sau này

Khi bạn muốn update Mini App:

```bash
# SSH vào VPS
ssh user@your-vps
cd /opt/n8n/telegram-mini-app

# Cập nhật code (nếu dùng Git)
git pull

# Hoặc upload file mới bằng SCP

# Rebuild và restart
cd /opt/n8n
docker-compose build telegram-mini-app
docker-compose up -d telegram-mini-app

# Xem logs
docker-compose logs -f telegram-mini-app
```

## 🛠️ Các lệnh hữu ích

```bash
# Xem tất cả containers
docker-compose ps

# Xem logs của Mini App
docker-compose logs -f telegram-mini-app

# Restart Mini App (không ảnh hưởng n8n)
docker-compose restart telegram-mini-app

# Stop Mini App
docker-compose stop telegram-mini-app

# Start lại
docker-compose start telegram-mini-app

# Xóa và rebuild hoàn toàn
docker-compose stop telegram-mini-app
docker-compose rm -f telegram-mini-app
docker-compose build telegram-mini-app
docker-compose up -d telegram-mini-app

# Xem resource usage
docker stats telegram-mini-app

# Vào shell của container
docker-compose exec telegram-mini-app sh
```

## 🐛 Xử lý lỗi

### Lỗi: Container không start

```bash
# Xem logs chi tiết
docker-compose logs telegram-mini-app

# Check cấu trúc thư mục
ls -la /opt/n8n/telegram-mini-app/
# Phải có: Dockerfile, nginx.conf, index.html, style.css, app.js
```

### Lỗi: SSL không hoạt động

```bash
# Kiểm tra Traefik logs
docker-compose logs traefik | grep telegram-app

# Kiểm tra DNS
nslookup app.yourdomain.com

# Restart Traefik nếu cần
docker-compose restart traefik
```

### Lỗi: 404 Not Found

```bash
# Kiểm tra file có trong container không
docker-compose exec telegram-mini-app ls -la /usr/share/nginx/html/

# Nếu thiếu file, rebuild
docker-compose build --no-cache telegram-mini-app
docker-compose up -d telegram-mini-app
```

### Lỗi: App không load trong Telegram

**Nguyên nhân thường gặp:**
1. HTTPS chưa hoạt động
2. CSP headers chặn iframe
3. URL config sai trong BotFather

**Giải pháp:**

```bash
# 1. Kiểm tra HTTPS
curl -I https://app.yourdomain.com
# Phải thấy: HTTP/2 200

# 2. Kiểm tra headers
curl -I https://app.yourdomain.com | grep -i frame
# Phải KHÔNG thấy: X-Frame-Options: DENY

# 3. Kiểm tra CSP
docker-compose logs telegram-mini-app | grep CSP
```

## 📊 Cấu trúc thư mục cuối cùng

```
/opt/n8n/
├── compose.yml
├── .env
├── local-files/
└── telegram-mini-app/
    ├── Dockerfile
    ├── nginx.conf
    ├── .dockerignore
    ├── index.html
    ├── style.css
    └── app.js
```

## 💾 Backup

```bash
# Backup cấu hình
cd /opt/n8n
tar -czf backup-telegram-app-$(date +%Y%m%d).tar.gz telegram-mini-app/

# Backup compose.yml và .env
cp compose.yml compose.yml.backup
cp .env .env.backup
```

## 🎯 Tóm tắt cho lần sau

Khi cần rebuild/restart nhanh:

```bash
ssh user@your-vps
cd /opt/n8n
docker-compose up -d --build telegram-mini-app
```

## ✅ Checklist hoàn thành

- [ ] Code đã upload vào `/opt/n8n/telegram-mini-app/`
- [ ] File `.env` có biến `TELEGRAM_SUBDOMAIN=app`
- [ ] File `compose.yml` có service `telegram-mini-app`
- [ ] DNS A record `app.yourdomain.com` trỏ về VPS IP
- [ ] Container đang chạy: `docker-compose ps`
- [ ] HTTPS hoạt động: `curl -I https://app.yourdomain.com`
- [ ] Telegram Bot đã tạo và config URL
- [ ] Mini App mở được trong Telegram

---

**Chúc bạn deploy thành công! 🎉**

Nếu gặp vấn đề, check logs:
```bash
docker-compose logs -f telegram-mini-app
docker-compose logs traefik | grep telegram-app