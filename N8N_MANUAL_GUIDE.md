# 📘 Hướng dẫn tạo Workflow n8n từng bước

## 🎯 Mục tiêu

Tạo workflow trong n8n để:
1. Serve HTML Mini App
2. Lưu phiếu nhập hàng
3. Cập nhật kiểm hàng
4. Lấy danh sách

---

## 📋 BƯỚC 1: Tạo Data Table

1. Mở n8n: `https://n8n.tayninh.cloud`
2. Click **Settings** (⚙️) → **Data Tables**
3. Click **"+ Add Data Table"**
4. **Table name:** `inventory_imports`
5. Thêm các columns:

### Columns bắt buộc:

| Name | Type | Required | Default |
|------|------|----------|---------|
| product_name | String | ✅ Yes | |
| product_code | String | ✅ Yes | |
| quantity | Number | ✅ Yes | |
| unit | String | ✅ Yes | |
| supplier | String | ❌ No | |
| import_date | String | ✅ Yes | |
| notes | String | ❌ No | |
| telegram_user_id | String | ✅ Yes | |
| telegram_user_name | String | ❌ No | |
| status | String | ✅ Yes | pending |
| actual_quantity | Number | ❌ No | |
| condition | String | ❌ No | |
| check_notes | String | ❌ No | |
| checked_by_user_id | String | ❌ No | |
| checked_by_user_name | String | ❌ No | |
| check_date | String | ❌ No | |

6. Click **"Create Table"**

---

## 🔄 BƯỚC 2: Tạo Workflow mới

1. Click **"+ New workflow"**
2. Đặt tên: **"Telegram Mini App"**

---

## 📝 BƯỚC 3: Tạo Webhook serve HTML

### 3.1. Thêm Webhook Node

1. Click **"+"** → Tìm **"Webhook"**
2. Chọn **"Webhook"** node
3. Cấu hình:
   - **HTTP Method:** GET
   - **Path:** `app`
   - **Respond:** Immediately
   - **Response Code:** 200

### 3.2. Thêm HTML Node

1. Click **"+"** sau Webhook → Tìm **"HTML"**
2. Chọn **"HTML"** node
3. Paste HTML sau vào field **HTML**:

```html
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quản Lý Tài Sản</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, sans-serif;
            background: #f5f5f5;
            padding: 15px;
        }
        .header {
            background: linear-gradient(135deg, #2481cc, #5ba3d8);
            color: white;
            padding: 25px;
            border-radius: 12px;
            text-align: center;
            margin-bottom: 20px;
        }
        .menu-btn {
            width: 100%;
            padding: 20px;
            background: white;
            border: 2px solid #e0e0e0;
            border-radius: 12px;
            margin-bottom: 15px;
            cursor: pointer;
            text-align: left;
        }
        .menu-btn:active { background: #f0f0f0; }
        .section {
            background: white;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 15px;
        }
        .form-group {
            margin-bottom: 15px;
        }
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
        }
        .form-group input, .form-group select {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 16px;
        }
        .btn {
            width: 100%;
            padding: 15px;
            background: #2481cc;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            margin-top: 10px;
        }
        .btn-back {
            background: #666;
            margin-bottom: 15px;
        }
        .item {
            padding: 15px;
            background: white;
            border-radius: 8px;
            margin-bottom: 10px;
            border-left: 4px solid #2481cc;
        }
        .hidden { display: none; }
    </style>
</head>
<body>
    <div id="app">
        <div class="header">
            <h1>📦 Quản Lý Tài Sản</h1>
            <p>Hệ thống quản lý hàng hóa công ty</p>
        </div>

        <!-- Menu -->
        <div id="menu-page">
            <button class="menu-btn" onclick="showPage('import')">
                <div style="font-size:28px;margin-bottom:8px;">📥</div>
                <div style="font-size:18px;font-weight:bold;">Nhập Hàng</div>
            </button>
            <button class="menu-btn" onclick="showPage('list')">
                <div style="font-size:28px;margin-bottom:8px;">📋</div>
                <div style="font-size:18px;font-weight:bold;">Danh Sách</div>
            </button>
            <button class="menu-btn" onclick="showPage('check')">
                <div style="font-size:28px;margin-bottom:8px;">✅</div>
                <div style="font-size:18px;font-weight:bold;">Kiểm Hàng</div>
            </button>
        </div>

        <!-- Nhập Hàng -->
        <div id="import-page" class="hidden">
            <button class="btn btn-back" onclick="showPage('menu')">← Quay lại</button>
            <div class="section">
                <h2>Nhập Hàng</h2>
                <form id="form-import">
                    <div class="form-group">
                        <label>Tên sản phẩm *</label>
                        <input type="text" id="name" required>
                    </div>
                    <div class="form-group">
                        <label>Mã sản phẩm *</label>
                        <input type="text" id="code" required>
                    </div>
                    <div class="form-group">
                        <label>Số lượng *</label>
                        <input type="number" id="qty" required min="1">
                    </div>
                    <div class="form-group">
                        <label>Đơn vị *</label>
                        <select id="unit" required>
                            <option value="cái">Cái</option>
                            <option value="chiếc">Chiếc</option>
                            <option value="hộp">Hộp</option>
                            <option value="kg">Kg</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Nhà cung cấp</label>
                        <input type="text" id="supplier">
                    </div>
                    <div class="form-group">
                        <label>Ngày nhập *</label>
                        <input type="date" id="date" required>
                    </div>
                    <button type="submit" class="btn">💾 Lưu</button>
                </form>
            </div>
        </div>

        <!-- Danh Sách -->
        <div id="list-page" class="hidden">
            <button class="btn btn-back" onclick="showPage('menu')">← Quay lại</button>
            <div class="section">
                <h2>Danh Sách</h2>
                <div id="list"></div>
            </div>
        </div>

        <!-- Kiểm Hàng -->
        <div id="check-page" class="hidden">
            <button class="btn btn-back" onclick="showPage('menu')">← Quay lại</button>
            <div class="section">
                <h2>Kiểm Hàng</h2>
                <div id="check-list"></div>
            </div>
        </div>
    </div>

    <script>
        const tg = window.Telegram.WebApp;
        tg.expand();
        tg.ready();
        const API = 'https://n8n.tayninh.cloud/webhook';
        const user = tg.initDataUnsafe?.user || {id:'test',first_name:'Test'};

        function showPage(page) {
            ['menu','import','list','check'].forEach(p => {
                document.getElementById(p+'-page').classList.add('hidden');
            });
            document.getElementById(page+'-page').classList.remove('hidden');
            
            if (page === 'import') setToday();
            if (page === 'list') loadList();
            if (page === 'check') loadCheckList();
        }

        function setToday() {
            document.getElementById('date').value = new Date().toISOString().split('T')[0];
        }

        document.getElementById('form-import').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button');
            btn.disabled = true;
            btn.textContent = '⏳ Đang lưu...';

            try {
                const res = await fetch(API + '/nhap-hang', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        product_name: document.getElementById('name').value,
                        product_code: document.getElementById('code').value,
                        quantity: parseInt(document.getElementById('qty').value),
                        unit: document.getElementById('unit').value,
                        supplier: document.getElementById('supplier').value,
                        import_date: document.getElementById('date').value,
                        telegram_user_id: user.id.toString(),
                        telegram_user_name: user.first_name,
                        status: 'pending'
                    })
                });
                
                if (res.ok) {
                    tg.showAlert('✅ Đã lưu!');
                    e.target.reset();
                    showPage('menu');
                }
            } catch (err) {
                tg.showAlert('❌ Lỗi!');
            } finally {
                btn.disabled = false;
                btn.textContent = '💾 Lưu';
            }
        });

        async function loadList() {
            try {
                const res = await fetch(API + '/danh-sach');
                const data = await res.json();
                const list = data.data || [];
                
                document.getElementById('list').innerHTML = list.length ? list.map(i => 
                    \`<div class="item">
                        <b>\${i.product_name}</b><br>
                        <small>Mã: \${i.product_code} • \${i.quantity} \${i.unit}</small><br>
                        <small>📅 \${i.import_date}</small>
                    </div>\`
                ).join('') : '<p style="text-align:center;color:#999;">Chưa có dữ liệu</p>';
            } catch (err) {
                document.getElementById('list').innerHTML = '<p style="color:red;">Lỗi tải dữ liệu</p>';
            }
        }

        async function loadCheckList() {
            try {
                const res = await fetch(API + '/danh-sach');
                const data = await res.json();
                const pending = (data.data || []).filter(i => i.status === 'pending');
                
                document.getElementById('check-list').innerHTML = pending.length ? pending.map(i => 
                    \`<div class="item" onclick="checkItem(\${i.id}, '\${i.product_name}', \${i.quantity}, '\${i.unit}')">
                        <b>\${i.product_name}</b><br>
                        <small>Mã: \${i.product_code} • \${i.quantity} \${i.unit}</small><br>
                        <small style="color:#ff9800;">⏳ Chờ kiểm</small>
                    </div>\`
                ).join('') : '<p style="text-align:center;color:#999;">Không có hàng cần kiểm</p>';
            } catch (err) {
                document.getElementById('check-list').innerHTML = '<p style="color:red;">Lỗi tải dữ liệu</p>';
            }
        }

        async function checkItem(id, name, qty, unit) {
            const actual = prompt(\`Số lượng thực tế (\${unit}):\`, qty);
            if (!actual) return;
            
            try {
                const res = await fetch(API + '/kiem-hang', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        id: id,
                        actual_quantity: parseInt(actual),
                        condition: 'good',
                        check_notes: '',
                        telegram_user_id: user.id.toString(),
                        telegram_user_name: user.first_name
                    })
                });
                
                if (res.ok) {
                    tg.showAlert(\`✅ Đã kiểm: \${name}\`);
                    loadCheckList();
                }
            } catch (err) {
                tg.showAlert('❌ Lỗi!');
            }
        }

        setToday();
    </script>
</body>
</html>`;

return [{ json: { html } }];
```

### 3.3. Thêm Respond to Webhook

1. Click **"+"** sau Code node → Tìm **"Respond to Webhook"**
2. Cấu hình:
   - **Respond With:** Text
   - **Response Body:** `{{ $json.html }}`
   - Click **"Add Option"** → **Response Headers**
   - Thêm header:
     - Name: `Content-Type`
     - Value: `text/html; charset=utf-8`

### 3.4. Kết nối

- Webhook → Code → Respond to Webhook

---

## 📥 BƯỚC 4: Workflow Nhập Hàng

### 4.1. Thêm Webhook

1. Click **"+"** → **"Webhook"**
2. Cấu hình:
   - **HTTP Method:** POST
   - **Path:** `nhap-hang`
   - **Respond:** Immediately

### 4.2. Thêm Internal n8n Table (Create)

1. Click **"+"** → Tìm **"Internal n8n Table"**
2. Cấu hình:
   - **Operation:** Create
   - **Table:** `inventory_imports`
   - Click **"Add Field"** cho từng field:
     - `product_name` = `{{ $json.body.product_name }}`
     - `product_code` = `{{ $json.body.product_code }}`
     - `quantity` = `{{ $json.body.quantity }}`
     - `unit` = `{{ $json.body.unit }}`
     - `supplier` = `{{ $json.body.supplier }}`
     - `import_date` = `{{ $json.body.import_date }}`
     - `telegram_user_id` = `{{ $json.body.telegram_user_id }}`
     - `telegram_user_name` = `{{ $json.body.telegram_user_name }}`
     - `status` = `pending`

### 4.3. Thêm Respond to Webhook

1. Click **"+"** → **"Respond to Webhook"**
2. Cấu hình:
   - **Respond With:** JSON
   - **Response Body:** `{{ { "success": true } }}`

### 4.4. Kết nối

- Webhook nhap-hang → Internal Table → Respond

---

## ✅ BƯỚC 5: Workflow Kiểm Hàng

### 5.1. Thêm Webhook

1. **"+"** → **"Webhook"**
2. Cấu hình:
   - **HTTP Method:** POST
   - **Path:** `kiem-hang`

### 5.2. Thêm Internal Table (Update)

1. **"+"** → **"Internal n8n Table"**
2. Cấu hình:
   - **Operation:** Update
   - **Table:** `inventory_imports`
   - **Select Rows:** By Condition
   - Click **"Add Condition"**:
     - Column: `id`
     - Operator: `equals`
     - Value: `{{ $json.body.id }}`
   - Click **"Add Field"** để update:
     - `status` = `checked`
     - `actual_quantity` = `{{ $json.body.actual_quantity }}`
     - `condition` = `{{ $json.body.condition }}`
     - `check_notes` = `{{ $json.body.check_notes }}`
     - `checked_by_user_id` = `{{ $json.body.telegram_user_id }}`
     - `checked_by_user_name` = `{{ $json.body.telegram_user_name }}`
     - `check_date` = `{{ $now.toISO() }}`

### 5.3. Respond to Webhook

1. **"+"** → **"Respond to Webhook"**
2. **Response Body:** `{{ { "success": true } }}`

### 5.4. Kết nối

- Webhook kiem-hang → Internal Table → Respond

---

## 📋 BƯỚC 6: Workflow Lấy Danh Sách

### 6.1. Thêm Webhook

1. **"+"** → **"Webhook"**
2. Cấu hình:
   - **HTTP Method:** GET
   - **Path:** `danh-sach`

### 6.2. Thêm Internal Table (Get All)

1. **"+"** → **"Internal n8n Table"**
2. Cấu hình:
   - **Operation:** Get Many
   - **Table:** `inventory_imports`
   - **Limit:** 100 (hoặc Return All)
   - Click **"Add Option"** → **Sort**
     - Column: `id`
     - Direction: `DESC`

### 6.3. Respond to Webhook

1. **"+"** → **"Respond to Webhook"**
2. **Response Body:** `{{ { "success": true, "data": $json } }}`

### 6.4. Kết nối

- Webhook danh-sach → Internal Table → Respond

---

## 🎯 BƯỚC 7: Activate Workflow

1. Đặt tên workflow: **"Telegram Mini App"**
2. Toggle **"Active"** lên (màu xanh)
3. Click **"Save"**

---

## ✅ BƯỚC 8: Test Webhooks

### Test trong browser:

```bash
# Test Main App
https://n8n.tayninh.cloud/webhook/app

# Test API danh sách
https://n8n.tayninh.cloud/webhook/danh-sach
```

### Test bằng curl:

```bash
# Test nhập hàng
curl -X POST https://n8n.tayninh.cloud/webhook/nhap-hang \
  -H "Content-Type: application/json" \
  -d '{
    "product_name": "Test",
    "product_code": "T001",
    "quantity": 10,
    "unit": "cái",
    "supplier": "Test",
    "import_date": "2024-11-06",
    "telegram_user_id": "123",
    "telegram_user_name": "Test User",
    "status": "pending"
  }'
```

---

## 🤖 BƯỚC 9: Tạo Telegram Bot

1. Mở Telegram → **@BotFather**
2. `/newbot`
3. Đặt tên: `Quản Lý Tài Sản TayNinh`
4. Username: `TayNinhAssetBot`
5. `/newapp`
6. Chọn bot
7. Tên app: `Quản Lý Tài Sản`
8. Mô tả: `Quản lý hàng hóa`
9. `/empty` (ảnh)
10. `/empty` (GIF)
11. **URL:** `https://n8n.tayninh.cloud/webhook/app`
12. Short name: `quanlytaisan`

---

## 🎉 BƯỚC 10: Test Mini App

Mở trong Telegram:
```
https://t.me/TayNinhAssetBot/quanlytaisan
```

---

## 📊 Quản lý

### Xem dữ liệu:
1. n8n → Settings → Data Tables
2. Click `inventory_imports`
3. Xem tất cả records

### Xem workflow executions:
1. Mở workflow
2. Tab **"Executions"**
3. Click vào execution để debug

### Export data:
1. Data Tables → `inventory_imports`
2. Export CSV

---

## 🔧 Customize

### Sửa giao diện:
1. Mở workflow
2. Edit node **"Generate HTML"**
3. Sửa HTML/CSS trong code
4. Save

### Thêm field mới:
1. Thêm column vào Data Table
2. Sửa HTML thêm input
3. Sửa mapping trong node lưu data
4. Save

---

## 💡 Tóm tắt Workflow

```
┌─────────────────────────────────┐
│  Webhook: /app                  │
│  ↓                               │
│  Code: Generate HTML            │
│  ↓                               │
│  Respond: Return HTML           │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  Webhook POST: /nhap-hang       │
│  ↓                               │
│  Internal Table: Create Row     │
│  ↓                               │
│  Respond: {success: true}       │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  Webhook POST: /kiem-hang       │
│  ↓                               │
│  Internal Table: Update Row     │
│  ↓                               │
│  Respond: {success: true}       │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  Webhook GET: /danh-sach        │
│  ↓                               │
│  Internal Table: Get All        │
│  ↓                               │
│  Respond: {data: [...]}         │
└─────────────────────────────────┘
```

---

**Chỉ cần tạo trong n8n UI! Đơn giản! 🚀**