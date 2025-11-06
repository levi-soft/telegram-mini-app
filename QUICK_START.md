# ⚡ Bắt đầu nhanh với GitHub Pages

## 🎯 3 bước đơn giản để có Mini App

### 1️⃣ Tạo GitHub Repository (2 phút)

1. Vào https://github.com/new
2. Điền:
   - **Repository name**: `telegram-mini-app`
   - Chọn **Public**
3. Click **"Create repository"**

### 2️⃣ Upload code (3 phút)

**Option A: Dùng Git** (nếu đã cài Git)
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/telegram-mini-app.git
git branch -M main
git push -u origin main
```

**Option B: Upload trực tiếp**
1. Click nút **"uploading an existing file"**
2. Kéo thả 5 file này vào:
   - ✅ index.html
   - ✅ style.css
   - ✅ app.js
   - ✅ .nojekyll
   - ✅ README.md
3. Click **"Commit changes"**

### 3️⃣ Bật GitHub Pages (1 phút)

1. Vào tab **Settings**
2. Click **Pages** ở menu trái
3. Source:
   - Branch: **main**
   - Folder: **/ (root)**
4. Click **Save**

✅ **Xong! URL của bạn:**
```
https://YOUR_USERNAME.github.io/telegram-mini-app/
```

---

## 🤖 Tạo Telegram Bot (5 phút)

### Bước 1: Tạo Bot
1. Mở Telegram, tìm **@BotFather**
2. Gửi: `/newbot`
3. Đặt tên: `Quản Lý Tài Sản`
4. Username: `QuanLyTaiSanBot`

### Bước 2: Tạo Mini App
1. Gửi: `/newapp`
2. Chọn bot vừa tạo
3. Tên app: `Quản Lý Tài Sản`
4. Mô tả: `Quản lý hàng hóa công ty`
5. Gửi `/empty` (bỏ qua ảnh)
6. Gửi `/empty` (bỏ qua GIF)
7. **Paste URL GitHub Pages của bạn**
8. Short name: `quanlytaisan`

### Bước 3: Test
Mở link: `https://t.me/YOUR_BOT_USERNAME/quanlytaisan`

---

## 📱 Sử dụng App

### Nhập Hàng
1. Click nút "Nhập Hàng"
2. Điền thông tin sản phẩm
3. Click "Lưu phiếu nhập"

### Kiểm Hàng
1. Click nút "Kiểm Hàng"
2. Click vào sản phẩm cần kiểm
3. Nhập số lượng thực tế
4. Chọn tình trạng
5. Click "Xác nhận kiểm tra"

---

## 🔄 Cập nhật Code

```bash
# Sửa code trên máy
# Sau đó:
git add .
git commit -m "Update features"
git push
```

Đợi 1-2 phút → Refresh app trong Telegram

---

## ❓ Gặp vấn đề?

- 📖 Xem [Hướng dẫn chi tiết GitHub Pages](GITHUB_DEPLOY.md)
- 📖 Xem [README đầy đủ](README.md)
- 🐛 Xem phần xử lý lỗi trong GITHUB_DEPLOY.md

---

**Chúc bạn thành công! 🎉**