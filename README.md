# 📦 Quản Lý Tài Sản - Telegram Mini App

Ứng dụng quản lý hàng hóa công ty với 2 chức năng chính:
- **Nhập Hàng**: Ghi nhận hàng hóa nhập kho
- **Kiểm Hàng**: Kiểm tra và xác nhận tồn kho

## 🚀 Cách triển khai Telegram Mini App

### Bước 1: Tạo Bot Telegram

1. Mở Telegram và tìm bot [@BotFather](https://t.me/BotFather)
2. Gửi lệnh `/newbot` để tạo bot mới
3. Đặt tên cho bot (ví dụ: "Quản Lý Tài Sản")
4. Đặt username cho bot (ví dụ: "QuanLyTaiSanBot")
5. BotFather sẽ gửi cho bạn **API Token** - hãy lưu lại token này

### Bước 2: Host ứng dụng

Bạn có 5 cách để host Mini App:

#### Cách 1: VPS với Traefik (Nếu đã có VPS + Traefik) ⭐⭐⭐

📖 **[Xem hướng dẫn chi tiết deploy với Traefik tại đây](TRAEFIK_DEPLOY.md)**

**Ưu điểm:**
- ✅ Tận dụng VPS và Traefik có sẵn
- ✅ SSL tự động (Let's Encrypt)
- ✅ Không cần setup từ đầu
- ✅ Chung network với các service khác (n8n, etc.)

**Deploy nhanh:**
```bash
# 1. Thêm TELEGRAM_SUBDOMAIN=app vào .env
# 2. Thêm service telegram-mini-app vào compose.yml (xem TRAEFIK_DEPLOY.md)
# 3. Deploy
cd /opt/n8n
docker-compose up -d --build telegram-mini-app
```

#### Cách 2: VPS với Docker Compose (Mới setup VPS) 🚀

📖 **[Xem hướng dẫn chi tiết VPS deployment tại đây](VPS_DEPLOY.md)**

**Ưu điểm:**
- ✅ Toàn quyền kiểm soát
- ✅ HTTPS với Nginx Proxy Manager
- ✅ Chi phí ~$5/tháng

#### Cách 3: GitHub Pages (Miễn phí, Dễ nhất) ⭐

📖 **[Xem hướng dẫn chi tiết deploy GitHub Pages tại đây](GITHUB_DEPLOY.md)**

Tóm tắt nhanh:
1. Tạo repository mới trên GitHub (Public)
2. Upload các file: `index.html`, `style.css`, `app.js`
3. Vào Settings > Pages
4. Source chọn "main" branch, folder chọn "/ (root)"
5. Nhấn Save
6. GitHub sẽ cung cấp URL (ví dụ: `https://username.github.io/repository-name`)

#### Cách 4: Vercel (Miễn phí)

1. Đăng ký tài khoản tại [vercel.com](https://vercel.com)
2. Kết nối với GitHub repository
3. Deploy tự động
4. Nhận URL từ Vercel

#### Cách 5: Netlify (Miễn phí)

1. Đăng ký tài khoản tại [netlify.com](https://netlify.com)
2. Kéo thả folder chứa các file vào Netlify
3. Nhận URL từ Netlify

### Bước 3: Đăng ký Mini App với BotFather

1. Quay lại chat với @BotFather
2. Gửi lệnh `/newapp`
3. Chọn bot bạn vừa tạo
4. Đặt tên cho app: "Quản Lý Tài Sản"
5. Mô tả: "Ứng dụng quản lý hàng hóa công ty"
6. Upload ảnh (512x512 px) hoặc bỏ qua
7. Gửi demo GIF (chọn /empty nếu không có)
8. **Quan trọng**: Paste URL host của bạn (từ bước 2)
9. Chọn Short name: `quanlytaisan` (hoặc tên khác)
10. Hoàn tất!

### Bước 4: Mở Mini App

Bây giờ bạn có thể mở Mini App bằng các cách:

1. **Trong chat với bot**:
   - Mở chat với bot của bạn
   - Nhấn nút Menu (≡) bên dưới
   - Chọn "Quản Lý Tài Sản"

2. **Hoặc sử dụng link trực tiếp**:
   ```
   https://t.me/YOUR_BOT_USERNAME/YOUR_SHORT_NAME
   ```
   
   Ví dụ: `https://t.me/QuanLyTaiSanBot/quanlytaisan`

3. **Chia sẻ với team**:
   - Gửi link trên vào group Telegram
   - Mọi người có thể mở ngay

## 📱 Hướng dẫn sử dụng

### Chức năng Nhập Hàng

1. Từ trang chủ, nhấn nút **"Nhập Hàng"**
2. Điền thông tin:
   - Tên sản phẩm (bắt buộc)
   - Mã sản phẩm (bắt buộc)
   - Số lượng (bắt buộc)
   - Đơn vị (bắt buộc)
   - Nhà cung cấp (tùy chọn)
   - Ngày nhập (bắt buộc)
   - Ghi chú (tùy chọn)
3. Nhấn **"💾 Lưu phiếu nhập"**
4. Phiếu nhập sẽ được lưu và hiển thị trong danh sách gần đây

### Chức năng Kiểm Hàng

1. Từ trang chủ, nhấn nút **"Kiểm Hàng"**
2. Xem danh sách hàng hóa cần kiểm
3. Sử dụng thanh tìm kiếm để tìm sản phẩm
4. Filter theo trạng thái: Tất cả / Chờ kiểm / Đã kiểm
5. Nhấn vào sản phẩm để kiểm tra
6. Nhập thông tin:
   - Số lượng thực tế
   - Tình trạng (Tốt/Hư hỏng/Hết hạn)
   - Ghi chú kiểm tra
7. Nhấn **"Xác nhận kiểm tra"**

## 💾 Lưu trữ dữ liệu

- Ứng dụng sử dụng **LocalStorage** của trình duyệt để lưu dữ liệu
- Dữ liệu được lưu trên thiết bị của từng người dùng
- Không cần server backend
- Dữ liệu sẽ được giữ lại ngay cả khi đóng app

## 🎨 Tính năng

✅ Giao diện đẹp, thân thiện với Telegram theme  
✅ Responsive, hoạt động tốt trên mobile  
✅ Nhập hàng với đầy đủ thông tin  
✅ Kiểm hàng và cập nhật tình trạng  
✅ Tìm kiếm và filter nhanh  
✅ Thống kê tổng quan  
✅ Lưu trữ dữ liệu local  

## 🔧 Phát triển thêm (Tùy chọn)

Nếu muốn thêm tính năng:

1. **Thêm Backend API**:
   - Lưu dữ liệu vào database
   - Đồng bộ giữa nhiều người dùng
   - Tạo báo cáo chi tiết

2. **Tích hợp Telegram Bot**:
   - Gửi thông báo khi có hàng mới
   - Nhắc nhở kiểm hàng định kỳ
   - Export báo cáo qua bot

3. **Thêm chức năng**:
   - Xuất hàng
   - Báo cáo thống kê
   - Quản lý nhà cung cấp
   - Quét mã QR/Barcode

## 📞 Hỗ trợ

Nếu gặp vấn đề:
1. Kiểm tra console browser (F12) để xem lỗi
2. Đảm bảo URL host đã được cấu hình đúng trong BotFather
3. Kiểm tra Telegram Web App script đã load thành công

## 📄 Cấu trúc file

```
telegram-mini-app/
├── index.html      # Giao diện chính
├── style.css       # Styles và theme
├── app.js          # Logic ứng dụng
└── README.md       # Hướng dẫn này
```

## 🔒 Bảo mật

- Ứng dụng chạy hoàn toàn trên client-side
- Dữ liệu lưu local, không gửi đi đâu
- Có thể thêm xác thực Telegram User ID nếu cần
- Nên thêm HTTPS khi deploy production

---

**Chúc bạn triển khai thành công! 🎉**