// Khởi tạo Telegram Web App
let tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Áp dụng theme từ Telegram
document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#ffffff');
document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#000000');
document.documentElement.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#999999');

// Quản lý dữ liệu
class InventoryManager {
    constructor() {
        this.imports = this.loadImports();
        this.currentItem = null;
    }

    loadImports() {
        const data = localStorage.getItem('inventory_imports');
        return data ? JSON.parse(data) : [];
    }

    saveImports() {
        localStorage.setItem('inventory_imports', JSON.stringify(this.imports));
    }

    addImport(importData) {
        const newImport = {
            id: Date.now(),
            ...importData,
            status: 'pending',
            checkDate: null,
            actualQuantity: null,
            condition: null,
            checkNotes: ''
        };
        this.imports.unshift(newImport);
        this.saveImports();
        this.updateStats();
        return newImport;
    }

    updateCheck(id, checkData) {
        const item = this.imports.find(i => i.id === id);
        if (item) {
            item.status = 'checked';
            item.checkDate = new Date().toISOString();
            item.actualQuantity = checkData.actualQuantity;
            item.condition = checkData.condition;
            item.checkNotes = checkData.checkNotes;
            this.saveImports();
            this.updateStats();
        }
    }

    getImports(filter = 'all') {
        if (filter === 'all') return this.imports;
        return this.imports.filter(i => i.status === filter);
    }

    searchImports(query) {
        const lowerQuery = query.toLowerCase();
        return this.imports.filter(i => 
            i.productName.toLowerCase().includes(lowerQuery) ||
            i.productCode.toLowerCase().includes(lowerQuery)
        );
    }

    updateStats() {
        const totalItems = this.imports.length;
        const pendingChecks = this.imports.filter(i => i.status === 'pending').length;
        
        document.getElementById('total-items').textContent = totalItems;
        document.getElementById('pending-checks').textContent = pendingChecks;
    }
}

const inventoryManager = new InventoryManager();

// Navigation
function navigateTo(pageId) {
    // Ẩn tất cả các trang
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Hiển thị trang được chọn
    document.getElementById(pageId).classList.add('active');
    
    // Cập nhật dữ liệu theo trang
    if (pageId === 'home-page') {
        inventoryManager.updateStats();
        renderRecentImports();
    } else if (pageId === 'import-page') {
        setTodayDate();
        renderRecentImports();
    } else if (pageId === 'check-page') {
        renderInventoryList('all');
    }
    
    // Cuộn lên đầu trang
    window.scrollTo(0, 0);
}

// Set ngày hôm nay cho form nhập hàng
function setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('import-date').value = today;
}

// Xử lý form nhập hàng
document.getElementById('import-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const importData = {
        productName: document.getElementById('product-name').value,
        productCode: document.getElementById('product-code').value,
        quantity: parseInt(document.getElementById('quantity').value),
        unit: document.getElementById('unit').value,
        supplier: document.getElementById('supplier').value,
        importDate: document.getElementById('import-date').value,
        notes: document.getElementById('notes').value
    };
    
    inventoryManager.addImport(importData);
    
    // Hiển thị thông báo
    tg.showAlert('✅ Đã lưu phiếu nhập hàng thành công!');
    
    // Reset form
    this.reset();
    setTodayDate();
    
    // Cập nhật danh sách gần đây
    renderRecentImports();
});

// Render danh sách nhập hàng gần đây
function renderRecentImports() {
    const container = document.getElementById('recent-imports-list');
    const recentImports = inventoryManager.getImports().slice(0, 5);
    
    if (recentImports.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">📭</div>
                <p>Chưa có phiếu nhập nào</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = recentImports.map(item => `
        <div class="import-card">
            <div class="product-name">${item.productName}</div>
            <div class="product-details">
                Mã: ${item.productCode} • 
                Số lượng: ${item.quantity} ${item.unit}
                ${item.supplier ? ` • NCC: ${item.supplier}` : ''}
            </div>
            <div class="import-date">📅 ${formatDate(item.importDate)}</div>
        </div>
    `).join('');
}

// Render danh sách kiểm hàng
function renderInventoryList(filter) {
    const container = document.getElementById('inventory-list');
    const items = inventoryManager.getImports(filter);
    
    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">📦</div>
                <p>Không có mặt hàng nào</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = items.map(item => `
        <div class="inventory-item ${item.status}" onclick="openCheckModal(${item.id})">
            <div class="item-header">
                <div class="product-name">${item.productName}</div>
                <span class="status-badge ${item.status}">
                    ${item.status === 'pending' ? '⏳ Chờ kiểm' : '✅ Đã kiểm'}
                </span>
            </div>
            <div class="item-details">
                <div>Mã: ${item.productCode}</div>
                <div>Số lượng: ${item.quantity} ${item.unit}</div>
                ${item.supplier ? `<div>NCC: ${item.supplier}</div>` : ''}
                <div>Ngày nhập: ${formatDate(item.importDate)}</div>
                ${item.status === 'checked' ? `
                    <div style="margin-top: 8px; color: var(--success-color);">
                        Thực tế: ${item.actualQuantity} ${item.unit} • 
                        ${getConditionText(item.condition)}
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Filter buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        const filter = this.dataset.filter;
        renderInventoryList(filter);
    });
});

// Search functionality
document.getElementById('search-product').addEventListener('input', function(e) {
    const query = e.target.value.trim();
    const container = document.getElementById('inventory-list');
    
    if (query === '') {
        const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
        renderInventoryList(activeFilter);
        return;
    }
    
    const results = inventoryManager.searchImports(query);
    
    if (results.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">🔍</div>
                <p>Không tìm thấy kết quả</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = results.map(item => `
        <div class="inventory-item ${item.status}" onclick="openCheckModal(${item.id})">
            <div class="item-header">
                <div class="product-name">${item.productName}</div>
                <span class="status-badge ${item.status}">
                    ${item.status === 'pending' ? '⏳ Chờ kiểm' : '✅ Đã kiểm'}
                </span>
            </div>
            <div class="item-details">
                <div>Mã: ${item.productCode}</div>
                <div>Số lượng: ${item.quantity} ${item.unit}</div>
                ${item.supplier ? `<div>NCC: ${item.supplier}</div>` : ''}
                <div>Ngày nhập: ${formatDate(item.importDate)}</div>
                ${item.status === 'checked' ? `
                    <div style="margin-top: 8px; color: var(--success-color);">
                        Thực tế: ${item.actualQuantity} ${item.unit} • 
                        ${getConditionText(item.condition)}
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
});

// Modal kiểm hàng
function openCheckModal(itemId) {
    const item = inventoryManager.imports.find(i => i.id === itemId);
    if (!item) return;
    
    inventoryManager.currentItem = item;
    
    document.getElementById('modal-product-name').textContent = item.productName;
    document.getElementById('modal-product-code').textContent = item.productCode;
    document.getElementById('modal-quantity').textContent = `${item.quantity} ${item.unit}`;
    
    // Pre-fill nếu đã kiểm
    if (item.status === 'checked') {
        document.getElementById('actual-quantity').value = item.actualQuantity;
        document.getElementById('condition').value = item.condition;
        document.getElementById('check-notes').value = item.checkNotes;
    } else {
        document.getElementById('actual-quantity').value = item.quantity;
        document.getElementById('condition').value = 'good';
        document.getElementById('check-notes').value = '';
    }
    
    document.getElementById('check-modal').classList.add('active');
}

function closeCheckModal() {
    document.getElementById('check-modal').classList.remove('active');
    inventoryManager.currentItem = null;
}

function submitCheck() {
    const actualQuantity = parseInt(document.getElementById('actual-quantity').value);
    const condition = document.getElementById('condition').value;
    const checkNotes = document.getElementById('check-notes').value;
    
    if (!actualQuantity && actualQuantity !== 0) {
        tg.showAlert('⚠️ Vui lòng nhập số lượng thực tế!');
        return;
    }
    
    if (!condition) {
        tg.showAlert('⚠️ Vui lòng chọn tình trạng!');
        return;
    }
    
    const checkData = {
        actualQuantity,
        condition,
        checkNotes
    };
    
    inventoryManager.updateCheck(inventoryManager.currentItem.id, checkData);
    
    tg.showAlert('✅ Đã lưu kết quả kiểm hàng!');
    
    closeCheckModal();
    renderInventoryList(document.querySelector('.filter-btn.active').dataset.filter);
}

// Close modal khi click ngoài
document.getElementById('check-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeCheckModal();
    }
});

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function getConditionText(condition) {
    const conditions = {
        'good': '✅ Tốt',
        'damaged': '⚠️ Hư hỏng',
        'expired': '❌ Hết hạn'
    };
    return conditions[condition] || condition;
}

// Khởi tạo app
document.addEventListener('DOMContentLoaded', function() {
    inventoryManager.updateStats();
    setTodayDate();
    renderRecentImports();
    
    // Hiển thị thông tin user từ Telegram
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        console.log('Telegram User:', user);
    }
});