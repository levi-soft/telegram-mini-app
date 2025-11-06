// Khởi tạo Telegram Web App
let tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Áp dụng theme từ Telegram
document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#ffffff');
document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#000000');
document.documentElement.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#999999');

// Cấu hình n8n Webhook Base URL
const N8N_BASE_URL = 'https://n8n.tayninh.cloud/webhook';

// Lấy thông tin user từ Telegram
const telegramUser = tg.initDataUnsafe?.user || {
    id: 'local_user',
    first_name: 'Test User',
    last_name: ''
};

// Quản lý dữ liệu với n8n
class InventoryManager {
    constructor() {
        this.imports = [];
        this.currentItem = null;
        this.loading = false;
    }

    async loadImports() {
        try {
            this.loading = true;
            const response = await fetch(`${N8N_BASE_URL}/danh-sach`);
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            const result = await response.json();
            this.imports = result.data || [];
            this.updateStats();
            return this.imports;
        } catch (error) {
            console.error('Lỗi load dữ liệu:', error);
            tg.showAlert('⚠️ Không thể tải dữ liệu từ n8n. Vui lòng kiểm tra kết nối!');
            return [];
        } finally {
            this.loading = false;
        }
    }

    async addImport(importData) {
        try {
            const payload = {
                ...importData,
                telegram_user_id: telegramUser.id.toString(),
                telegram_user_name: `${telegramUser.first_name} ${telegramUser.last_name}`.trim()
            };

            const response = await fetch(`${N8N_BASE_URL}/nhap-hang`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('Failed to save import');
            }

            const result = await response.json();
            
            if (result.success) {
                await this.loadImports();
                return result;
            } else {
                throw new Error(result.message || 'Unknown error');
            }
        } catch (error) {
            console.error('Lỗi thêm phiếu nhập:', error);
            throw error;
        }
    }

    async updateCheck(id, checkData) {
        try {
            const payload = {
                id: id,
                actual_quantity: checkData.actualQuantity,
                condition: checkData.condition,
                check_notes: checkData.checkNotes,
                telegram_user_id: telegramUser.id.toString(),
                telegram_user_name: `${telegramUser.first_name} ${telegramUser.last_name}`.trim()
            };

            const response = await fetch(`${N8N_BASE_URL}/kiem-hang`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('Failed to update check');
            }

            const result = await response.json();
            
            if (result.success) {
                await this.loadImports();
                return result;
            } else {
                throw new Error(result.message || 'Unknown error');
            }
        } catch (error) {
            console.error('Lỗi cập nhật kiểm hàng:', error);
            throw error;
        }
    }

    getImports(filter = 'all') {
        if (filter === 'all') return this.imports;
        return this.imports.filter(i => i.status === filter);
    }

    searchImports(query) {
        const lowerQuery = query.toLowerCase();
        return this.imports.filter(i => 
            i.product_name.toLowerCase().includes(lowerQuery) ||
            i.product_code.toLowerCase().includes(lowerQuery)
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
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    document.getElementById(pageId).classList.add('active');
    
    if (pageId === 'home-page') {
        inventoryManager.loadImports().then(() => {
            inventoryManager.updateStats();
            renderRecentImports();
        });
    } else if (pageId === 'import-page') {
        setTodayDate();
        inventoryManager.loadImports().then(() => {
            renderRecentImports();
        });
    } else if (pageId === 'check-page') {
        inventoryManager.loadImports().then(() => {
            renderInventoryList('all');
        });
    }
    
    window.scrollTo(0, 0);
}

// Set ngày hôm nay cho form nhập hàng
function setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('import-date').value = today;
}

// Xử lý form nhập hàng
document.getElementById('import-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Đang lưu...';
    
    const importData = {
        product_name: document.getElementById('product-name').value,
        product_code: document.getElementById('product-code').value,
        quantity: parseInt(document.getElementById('quantity').value),
        unit: document.getElementById('unit').value,
        supplier: document.getElementById('supplier').value,
        import_date: document.getElementById('import-date').value,
        notes: document.getElementById('notes').value
    };
    
    try {
        await inventoryManager.addImport(importData);
        
        tg.showPopup({
            title: '✅ Thành công',
            message: `Đã lưu phiếu nhập: ${importData.product_name}`,
            buttons: [{
                id: 'ok',
                type: 'default',
                text: 'OK'
            }]
        }, function(buttonId) {
            if (buttonId === 'ok') {
                navigateTo('home-page');
            }
        });
        
        this.reset();
        setTodayDate();
    } catch (error) {
        tg.showAlert('❌ Lỗi khi lưu phiếu nhập. Vui lòng thử lại!');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
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
            <div class="product-name">${item.product_name}</div>
            <div class="product-details">
                Mã: ${item.product_code} • 
                Số lượng: ${item.quantity} ${item.unit}
                ${item.supplier ? ` • NCC: ${item.supplier}` : ''}
            </div>
            <div class="import-date">
                📅 ${formatDate(item.import_date)} • 
                👤 ${item.telegram_user_name || 'Unknown'}
            </div>
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
                <div class="product-name">${item.product_name}</div>
                <span class="status-badge ${item.status}">
                    ${item.status === 'pending' ? '⏳ Chờ kiểm' : '✅ Đã kiểm'}
                </span>
            </div>
            <div class="item-details">
                <div>Mã: ${item.product_code}</div>
                <div>Số lượng: ${item.quantity} ${item.unit}</div>
                ${item.supplier ? `<div>NCC: ${item.supplier}</div>` : ''}
                <div>Ngày nhập: ${formatDate(item.import_date)}</div>
                <div>Nhập bởi: ${item.telegram_user_name || 'Unknown'}</div>
                ${item.status === 'checked' ? `
                    <div style="margin-top: 8px; color: var(--success-color);">
                        Thực tế: ${item.actual_quantity} ${item.unit} • 
                        ${getConditionText(item.condition)}
                    </div>
                    <div style="font-size: 12px; color: var(--tg-theme-hint-color);">
                        Kiểm bởi: ${item.checked_by_user_name || 'Unknown'}
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
                <div class="product-name">${item.product_name}</div>
                <span class="status-badge ${item.status}">
                    ${item.status === 'pending' ? '⏳ Chờ kiểm' : '✅ Đã kiểm'}
                </span>
            </div>
            <div class="item-details">
                <div>Mã: ${item.product_code}</div>
                <div>Số lượng: ${item.quantity} ${item.unit}</div>
                ${item.supplier ? `<div>NCC: ${item.supplier}</div>` : ''}
                <div>Ngày nhập: ${formatDate(item.import_date)}</div>
                <div>Nhập bởi: ${item.telegram_user_name || 'Unknown'}</div>
                ${item.status === 'checked' ? `
                    <div style="margin-top: 8px; color: var(--success-color);">
                        Thực tế: ${item.actual_quantity} ${item.unit} • 
                        ${getConditionText(item.condition)}
                    </div>
                    <div style="font-size: 12px; color: var(--tg-theme-hint-color);">
                        Kiểm bởi: ${item.checked_by_user_name || 'Unknown'}
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
    
    document.getElementById('modal-product-name').textContent = item.product_name;
    document.getElementById('modal-product-code').textContent = item.product_code;
    document.getElementById('modal-quantity').textContent = `${item.quantity} ${item.unit}`;
    
    if (item.status === 'checked') {
        document.getElementById('actual-quantity').value = item.actual_quantity;
        document.getElementById('condition').value = item.condition;
        document.getElementById('check-notes').value = item.check_notes || '';
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

async function submitCheck() {
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
    
    const itemName = inventoryManager.currentItem.product_name;
    
    try {
        await inventoryManager.updateCheck(inventoryManager.currentItem.id, checkData);
        
        tg.showPopup({
            title: '✅ Đã kiểm tra',
            message: `Đã lưu kết quả kiểm hàng: ${itemName}`,
            buttons: [{
                id: 'ok',
                type: 'default',
                text: 'OK'
            }]
        }, function(buttonId) {
            if (buttonId === 'ok') {
                closeCheckModal();
                renderInventoryList(document.querySelector('.filter-btn.active').dataset.filter);
            }
        });
    } catch (error) {
        tg.showAlert('❌ Lỗi khi lưu kết quả kiểm hàng. Vui lòng thử lại!');
    }
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
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Khởi tạo Telegram Mini App với n8n');
    console.log('👤 Telegram User:', telegramUser);
    console.log('🌐 n8n URL:', N8N_BASE_URL);
    
    try {
        // Load dữ liệu từ n8n
        await inventoryManager.loadImports();
        
        console.log('✅ Đã tải', inventoryManager.imports.length, 'phiếu nhập từ n8n Data Table');
        
        // Khởi tạo UI
        inventoryManager.updateStats();
        setTodayDate();
        renderRecentImports();
        
    } catch (error) {
        console.error('❌ Lỗi khởi tạo:', error);
        tg.showAlert('⚠️ Không thể kết nối n8n. Vui lòng kiểm tra workflow!');
    }
});