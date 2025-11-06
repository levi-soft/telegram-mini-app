# 🚀 Hướng dẫn Deploy Telegram Mini App lên GitHub Pages

## Bước 1: Chuẩn bị Repository GitHub

### 1.1. Tạo Repository mới trên GitHub

1. Đăng nhập vào GitHub: https://github.com
2. Click nút **"New"** (màu xanh) hoặc vào https://github.com/new
3. Điền thông tin:
   - **Repository name**: `telegram-mini-app` (hoặc tên bạn muốn)
   - **Description**: "Ứng dụng quản lý tài sản công ty trên Telegram"
   - Chọn **Public** (bắt buộc để dùng GitHub Pages miễn phí)
   - ✅ Tick "Add a README file" (có thể bỏ qua vì đã có README.md)
4. Click **"Create repository"**

### 1.2. Upload code lên GitHub

**Cách 1: Sử dụng Git (Khuyến nghị)**

Mở terminal trong folder dự án và chạy:

```bash
# Khởi tạo git (nếu chưa có)
git init

# Thêm tất cả file
git add .

# Commit
git commit -m "Initial commit: Telegram Mini App"

# Thêm remote (thay YOUR_USERNAME và YOUR_REPO)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push code lên GitHub
git branch -M main
git push -u origin main
```

**Cách 2: Upload trực tiếp trên web**

1. Vào repository vừa tạo
2. Click nút **"Add file"** → **"Upload files"**
3. Kéo thả các file vào:
   - index.html
   - style.css
   - app.js
   - README.md
   - .gitignore
4. Viết commit message: "Add Telegram Mini App files"
5. Click **"Commit changes"**

## Bước 2: Bật GitHub Pages

1. Trong repository, vào tab **"Settings"** (⚙️)
2. Scroll xuống phần **"Pages"** ở menu bên trái
3. Trong phần **"Source"**:
   - Branch: Chọn **"main"** (hoặc "master")
   - Folder: Chọn **"/ (root)"**
4. Click **"Save"**
5. Đợi khoảng 1-2 phút để GitHub deploy

## Bước 3: Lấy URL của Mini App

Sau khi deploy xong, GitHub sẽ hiển thị URL:

```
https://YOUR_USERNAME.github.io/YOUR_REPO/
```

Ví dụ: `https://nguyenvana.github.io/telegram-mini-app/`

**Lưu URL này để dùng cho bước tiếp theo!**

## Bước 4: Tạo Telegram Bot

1. Mở Telegram và tìm bot **@BotFather**
2. Gửi lệnh: `/newbot`
3. Đặt tên bot: `Quản Lý Tài Sản` (hoặc tên bạn muốn)
4. Đặt username: `QuanLyTaiSanBot` (phải kết thúc bằng "bot")
5. BotFather sẽ gửi cho bạn **API Token** - lưu lại để dùng sau nếu cần

## Bước 5: Đăng ký Mini App

1. Vẫn trong chat với @BotFather
2. Gửi lệnh: `/newapp`
3. Chọn bot vừa tạo (nếu có nhiều bot)
4. Nhập tên app: `Quản Lý Tài Sản`
5. Nhập mô tả: `Ứng dụng quản lý hàng hóa, nhập kho và kiểm kho`
6. Upload ảnh 640x360px (hoặc gửi `/empty` để bỏ qua)
7. Upload GIF demo (hoặc gửi `/empty` để bỏ qua)
8. **QUAN TRỌNG**: Paste URL từ Bước 3:
   ```
   https://YOUR_USERNAME.github.io/YOUR_REPO/
   ```
9. Short name: `quanlytaisan` (viết liền, không dấu, chữ thường)
10. Hoàn tất! ✅

## Bước 6: Mở và Test Mini App

### Cách 1: Từ Bot Menu
1. Mở chat với bot của bạn
2. Click nút Menu (≡) ở dưới
3. Chọn "Quản Lý Tài Sản"

### Cách 2: Link trực tiếp
```
https://t.me/YOUR_BOT_USERNAME/YOUR_SHORT_NAME
```

Ví dụ: `https://t.me/QuanLyTaiSanBot/quanlytaisan`

### Cách 3: Share link
- Gửi link trên vào group để mọi người cùng dùng
- Hoặc tạo nút inline trong bot message

## 🔄 Cập nhật Code

Khi bạn muốn sửa code:

1. Sửa file trên máy local
2. Push lên GitHub:
   ```bash
   git add .
   git commit -m "Update: mô tả thay đổi"
   git push
   ```
3. Đợi 1-2 phút GitHub Pages tự động update
4. Refresh Mini App trong Telegram

## ⚡ Lời khuyên

### ✅ Nên làm:
- Dùng repository Public cho GitHub Pages miễn phí
- Test kỹ trên local trước khi push
- Commit message rõ ràng
- Backup data quan trọng

### ❌ Tránh:
- Không commit file nhạy cảm (API keys, passwords)
- Không dùng repository Private (phải trả phí)
- Không push code chưa test

## 🐛 Xử lý lỗi thường gặp

### Lỗi: "404 Page not found"
**Nguyên nhân**: GitHub Pages chưa deploy xong hoặc cấu hình sai
**Giải pháp**: 
- Đợi thêm 2-3 phút
- Kiểm tra Settings > Pages đã chọn đúng branch chưa
- Đảm bảo file `index.html` ở root directory

### Lỗi: Mini App không mở trong Telegram
**Nguyên nhân**: URL config sai hoặc file HTML bị lỗi
**Giải pháp**:
- Kiểm tra URL có đúng format: `https://username.github.io/repo/`
- Mở URL trên browser xem có lỗi gì không
- Check console log (F12) để xem lỗi JavaScript

### Lỗi: "Telegram WebApp not available"
**Nguyên nhân**: Script Telegram chưa load
**Giải pháp**:
- Đảm bảo có dòng `<script src="https://telegram.org/js/telegram-web-app.js"></script>` trong HTML
- Kiểm tra internet connection

## 📞 Hỗ trợ thêm

Nếu gặp vấn đề:
1. Check GitHub Actions tab để xem build log
2. Xem Issues trong repository
3. Google error message
4. Tham khảo: https://docs.github.com/pages

---

**Chúc bạn deploy thành công! 🎉**