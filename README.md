# 📦 Telegram Mini App - Quản Lý Tài Sản

Ứng dụng quản lý hàng hóa công ty trên Telegram:
- **📥 Nhập Hàng** - Ghi nhận hàng hóa nhập kho
- **✅ Kiểm Hàng** - Kiểm tra tồn kho
- **📋 Danh Sách** - Xem tất cả phiếu nhập

**Hoàn toàn trong n8n - không cần deploy web riêng!**

---

## ⚡ Setup siêu nhanh - 3 bước

### 📖 Hướng dẫn chính:

**[`HUONG_DAN_N8N.md`](HUONG_DAN_N8N.md)** ⭐ - Hướng dẫn ngắn gọn

### 🚀 Tóm tắt:

**Bước 1: Tạo Data Table**
```
Settings → Data Tables → Add Table: inventory_imports
Thêm 16 columns (xem DATA_TABLE_GUIDE.md)
```

**Bước 2: Tạo Workflow**
```
Tạo 4 luồng webhook:
1. GET /app → HTML → Respond (serve Mini App)
2. POST /nhap-hang → Internal Table Create → Respond
3. POST /kiem-hang → Internal Table Update → Respond
4. GET /danh-sach → Internal Table Get All → Respond
```

**Bước 3: Config Bot**
```
@BotFather → /newapp
URL: https://n8n.tayninh.cloud/webhook/app
```

---

## 📄 File HTML để paste vào HTML node:

**[`mini-app.html`](mini-app.html)** - Copy toàn bộ và paste vào HTML node trong n8n

---

## 📚 Tài liệu đầy đủ:

1. **[`HUONG_DAN_N8N.md`](HUONG_DAN_N8N.md)** ⭐⭐⭐ - Hướng dẫn tạo workflow
2. **[`DATA_TABLE_GUIDE.md`](DATA_TABLE_GUIDE.md)** - Cách tạo Data Table (KHÔNG có Required!)
3. **[`mini-app.html`](mini-app.html)** - HTML đầy đủ để paste vào node
4. **[`N8N_MANUAL_GUIDE.md`](N8N_MANUAL_GUIDE.md)** - Hướng dẫn chi tiết hơn

---

## 🎯 URLs

- **Mini App:** `https://n8n.tayninh.cloud/webhook/app`
- **n8n Dashboard:** `https://n8n.tayninh.cloud`

---

## ✅ Ưu điểm

- ✅ Chỉ cần làm trong n8n UI
- ✅ Không cần deploy web
- ✅ Không cần Docker
- ✅ Không cần Git (optional)
- ✅ Update dễ: Sửa HTML node → Save
- ✅ Data lưu trong n8n Data Table
- ✅ Quản lý dễ trong n8n UI

---

## 🎨 Tính năng

✅ Nhập hàng đầy đủ thông tin  
✅ Kiểm hàng và cập nhật  
✅ Xem danh sách  
✅ Hiển thị người nhập/kiểm  
✅ Mobile responsive  
✅ Feedback rõ ràng  
✅ HTTPS tự động  

---

## 🔄 Workflow Structure

```
1. Webhook GET /app
   → HTML Node (paste mini-app.html)
   → Respond to Webhook (HTML)

2. Webhook POST /nhap-hang
   → Internal Table (Create)
   → Respond (JSON)

3. Webhook POST /kiem-hang
   → Internal Table (Update by ID)
   → Respond (JSON)

4. Webhook GET /danh-sach
   → Internal Table (Get All)
   → Respond (JSON)
```

---

## 📊 Quản lý dữ liệu

1. Vào n8n → Settings → Data Tables
2. Click `inventory_imports`
3. Xem/sửa/xóa records
4. Export CSV/JSON

---

## 🔧 Mở rộng

Từ n8n, dễ dàng thêm:
- 📧 Email thông báo
- 📊 Báo cáo tự động
- 💬 Telegram notification
- 📈 Google Sheets sync

---

**Live:** https://n8n.tayninh.cloud/webhook/app  
**GitHub:** https://github.com/levi-soft/telegram-mini-app  
**Domain:** tayninh.cloud  
**Developed with ❤️ using n8n**