# 📦 Telegram Mini App - Quản Lý Tài Sản

Ứng dụng quản lý hàng hóa công ty trên Telegram với 2 chức năng chính:
- **Nhập Hàng**: Ghi nhận hàng hóa nhập kho
- **Kiểm Hàng**: Kiểm tra và xác nhận tồn kho

## 🚀 Deploy trên VPS Ubuntu với Traefik

**Xem hướng dẫn đầy đủ:** [`DEPLOY.md`](DEPLOY.md)

### Tóm tắt nhanh:

```bash
# 1. Clone repository
cd /n8n-compose
git clone https://github.com/levi-soft/telegram-mini-app.git

# 2. Thêm vào .env
echo "TELEGRAM_SUBDOMAIN=app" >> /n8n-compose/.env

# 3. Deploy
cd telegram-mini-app
docker compose --env-file ../.env -f docker-compose.telegram.yml up -d --build
```

## 🎯 Kết quả

- `https://n8n.tayninh.cloud` - n8n
- `https://app.tayninh.cloud` - Telegram Mini App

## 🎨 Tính năng

✅ Giao diện đẹp, responsive  
✅ Nhập hàng với đầy đủ thông tin  
✅ Kiểm hàng và cập nhật tình trạng  
✅ Tìm kiếm và filter nhanh  
✅ Thống kê tổng quan  
✅ Lưu trữ dữ liệu LocalStorage  
✅ HTTPS tự động (Traefik + Let's Encrypt)  

## 📱 Sử dụng

### Nhập Hàng
1. Click "Nhập Hàng"
2. Điền thông tin sản phẩm
3. Lưu phiếu nhập

### Kiểm Hàng
1. Click "Kiểm Hàng"
2. Tìm và chọn sản phẩm
3. Nhập số lượng thực tế
4. Chọn tình trạng
5. Xác nhận

## 🔄 Cập nhật

```bash
cd /n8n-compose/telegram-mini-app
git pull
docker compose --env-file ../.env -f docker-compose.telegram.yml up -d --build
```

## 📄 Cấu trúc

- `index.html` - Giao diện
- `style.css` - Styles
- `app.js` - Logic
- `Dockerfile` - Docker image
- `nginx.conf` - Nginx config
- `docker-compose.telegram.yml` - Deploy config
- `DEPLOY.md` - Hướng dẫn deploy

## 🤖 Telegram Bot

Tạo bot với @BotFather:
1. `/newbot` → Đặt tên
2. `/newapp` → Config
3. URL: `https://app.tayninh.cloud`

## 📖 Tài liệu

- [DEPLOY.md](DEPLOY.md) - Hướng dẫn deploy đầy đủ

## 💾 Lưu trữ

Dữ liệu lưu trên LocalStorage của từng user, không cần backend.

## 🔒 Bảo mật

- HTTPS bắt buộc
- CSP headers cho Telegram iframe
- Traefik reverse proxy
- Let's Encrypt SSL

---

**Demo:** https://app.tayninh.cloud  
**Developed by:** Kilo Code