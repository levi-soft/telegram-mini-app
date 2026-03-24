// ============================================
// App - Main Entry Point
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    initTelegram();
    initializeApp();
});

async function initializeApp() {
    try {
        showLoading();

        // 1. Check permissions
        const authResult = await checkUserPermissions();
        if (!authResult.authorized) {
            handleUnauthorized(authResult.message);
            hideLoading();
            return;
        }

        // 2. Setup pages
        AppState.allowedPages = authResult.pages || [];
        if (AppState.allowedPages.length > 0) {
            AppState.currentPage = AppState.allowedPages[0];
        }
        updatePageButtons();

        // 3. Load data (products first, rest in parallel)
        await loadProducts();
        await Promise.all([
            loadTransactions(),
            loadInventory(),
            loadLocations(),
            loadBandwidthLogs(),
        ]);

        // 4. Setup UI
        setupEventListeners();
        updateDashboard();

        hideLoading();
        showToast('success', 'Sẵn sàng!');
    } catch (error) {
        hideLoading();
        if (error.message !== 'Unauthorized') {
            showToast('error', 'Lỗi khởi tạo: ' + error.message);
        }
    }
}

// ============================================
// Data Loading
// ============================================

async function loadProducts() {
    try {
        const response = await apiCall('products', 'GET');
        if (response.success) {
            AppState.products = response.data || [];
        }
    } catch (error) {
        if (error.message !== 'Unauthorized') {
            showToast('error', 'Không thể tải sản phẩm');
        }
        throw error;
    }
}

async function loadTransactions() {
    try {
        const response = await apiCall('transactions', 'GET');
        if (response.success) {
            AppState.transactions = response.data || [];
        }
    } catch (error) {
        if (error.message !== 'Unauthorized') {
            showToast('error', 'Không thể tải lịch sử');
        }
    }
}

async function loadInventory() {
    try {
        const response = await apiCall('inventory', 'GET');
        if (response.success) {
            if (!AppState.inventory[AppState.currentPage]) {
                AppState.inventory[AppState.currentPage] = {};
            }
            const data = response.data || [];
            data.forEach(item => {
                AppState.inventory[AppState.currentPage][item.product_id] = item.quantity;
            });
        }
    } catch (error) {
        if (error.message !== 'Unauthorized') {
            showToast('error', 'Không thể tải tồn kho');
        }
    }
}

async function loadLocations() {
    try {
        const response = await apiCall('locations', 'GET');
        if (response.success) {
            AppState.locations = response.data || [];
        }
    } catch (error) {
        if (error.message !== 'Unauthorized') {
            showToast('error', 'Không thể tải khu vực');
        }
    }
}

async function loadBandwidthLogs() {
    try {
        const response = await apiCall('bandwidth_logs', 'GET');
        if (response.success) {
            AppState.bandwidthLogs = response.data || [];
            calculateCurrentBandwidth();
        }
    } catch (error) {
        if (error.message !== 'Unauthorized') {
            console.error('Load bandwidth error:', error);
        }
    }
}

function calculateCurrentBandwidth() {
    const locationMap = {};
    AppState.bandwidthLogs
        .filter(log => log.page === AppState.currentPage)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .forEach(log => {
            if (!locationMap[log.location]) {
                locationMap[log.location] = {
                    location: log.location,
                    bandwidth: log.bandwidth_after,
                    network_type: log.network_type,
                    provider: log.provider,
                    lastUpdate: log.timestamp,
                    lastUser: log.user
                };
            }
        });
    AppState.currentBandwidth = locationMap;
}

// ============================================
// Event Listeners
// ============================================

function setupEventListeners() {
    // Page selector
    document.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            switchPage(this.dataset.page);
        });
    });

    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            showSection(this.dataset.section);
        });
    });

    // Forms
    const formNhap = document.getElementById('form-nhap');
    if (formNhap) formNhap.addEventListener('submit', handleNhapHang);

    const formXuat = document.getElementById('form-xuat');
    if (formXuat) formXuat.addEventListener('submit', handleXuatHang);

    const formProduct = document.getElementById('form-product');
    if (formProduct) formProduct.addEventListener('submit', handleSaveProduct);

    // Add product button
    const btnAdd = document.getElementById('btn-add-product');
    if (btnAdd) btnAdd.addEventListener('click', () => {
        document.getElementById('product-id').value = '';
        document.getElementById('form-product').reset();
        document.getElementById('modal-product-title').textContent = 'Thêm Sản Phẩm';
        openModal('modal-product');
    });

    // Sync button
    const btnSync = document.getElementById('btn-sync');
    if (btnSync) btnSync.addEventListener('click', async () => {
        await switchPage(AppState.currentPage);
        showToast('success', 'Đã đồng bộ!');
    });

    // Export
    const btnExport = document.getElementById('btn-export');
    if (btnExport) btnExport.addEventListener('click', exportExcel);

    // Search
    const searchTonKho = document.getElementById('search-tonkho');
    if (searchTonKho) searchTonKho.addEventListener('input', debounce(displayTonKho, 300));

    const searchLichSu = document.getElementById('search-lichsu');
    if (searchLichSu) searchLichSu.addEventListener('input', debounce(displayLichSu, 300));

    const filterType = document.getElementById('filter-type');
    if (filterType) filterType.addEventListener('change', displayLichSu);

    // Location
    const btnAddLocation = document.getElementById('btn-add-location');
    if (btnAddLocation) btnAddLocation.addEventListener('click', () => openLocationModal());

    const formLocation = document.getElementById('form-location');
    if (formLocation) formLocation.addEventListener('submit', handleSaveLocation);

    // Bandwidth
    const formBangThong = document.getElementById('form-bangthong');
    if (formBangThong) formBangThong.addEventListener('submit', handleBandwidthSubmit);

    const searchBandwidth = document.getElementById('search-bandwidth');
    if (searchBandwidth) searchBandwidth.addEventListener('input', debounce(displayBandwidthHistory, 300));

    const btLocation = document.getElementById('bt-location');
    if (btLocation) btLocation.addEventListener('change', updateCurrentBandwidthField);

    const btChange = document.getElementById('bt-change');
    if (btChange) btChange.addEventListener('input', calculateBandwidthAfter);

    const btEventType = document.getElementById('bt-event-type');
    if (btEventType) btEventType.addEventListener('change', () => { handleEventTypeChange(); calculateBandwidthAfter(); });

    // Modal backdrop close
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', function () {
            this.closest('.modal').classList.remove('active');
        });
    });
}

// ============================================
// Form Handlers
// ============================================

async function handleNhapHang(e) {
    e.preventDefault();
    if (AppState.isSubmitting) return;

    const productId = document.getElementById('nhap-product').value;
    const quantity = document.getElementById('nhap-quantity').value;
    const note = document.getElementById('nhap-note').value;

    if (!productId || !quantity) {
        showToast('error', 'Vui lòng điền đầy đủ!');
        return;
    }

    try {
        AppState.isSubmitting = true;
        showLoading();

        const response = await apiCall('transactions', 'POST', {
            type: 'nhap',
            product_id: parseInt(productId),
            quantity: parseInt(quantity),
            note: note,
        });

        if (response.success) {
            showToast('success', 'Nhập hàng thành công!');
            e.target.reset();
            await Promise.all([loadTransactions(), loadInventory()]);
            updateDashboard();
        } else {
            throw new Error(response.message || 'Lỗi nhập hàng');
        }
    } catch (error) {
        showToast('error', 'Lỗi: ' + error.message);
    } finally {
        AppState.isSubmitting = false;
        hideLoading();
    }
}

async function handleXuatHang(e) {
    e.preventDefault();
    if (AppState.isSubmitting) return;

    const productId = document.getElementById('xuat-product').value;
    const quantity = document.getElementById('xuat-quantity').value;
    const note = document.getElementById('xuat-note').value;

    if (!productId || !quantity) {
        showToast('error', 'Vui lòng điền đầy đủ!');
        return;
    }

    const currentInv = AppState.inventory[AppState.currentPage]?.[productId] || 0;
    if (currentInv < parseInt(quantity)) {
        showToast('error', `Không đủ hàng! Tồn: ${currentInv}`);
        return;
    }

    try {
        AppState.isSubmitting = true;
        showLoading();

        const response = await apiCall('transactions', 'POST', {
            type: 'xuat',
            product_id: parseInt(productId),
            quantity: parseInt(quantity),
            note: note,
        });

        if (response.success) {
            showToast('success', 'Cấp phát thành công!');
            e.target.reset();
            await Promise.all([loadTransactions(), loadInventory()]);
            updateDashboard();
        } else {
            throw new Error(response.message || 'Lỗi xuất hàng');
        }
    } catch (error) {
        showToast('error', 'Lỗi: ' + error.message);
    } finally {
        AppState.isSubmitting = false;
        hideLoading();
    }
}

async function handleSaveProduct(e) {
    e.preventDefault();
    if (AppState.isSubmitting) return;

    const id = document.getElementById('product-id').value;
    const name = document.getElementById('product-name').value;
    const unit = document.getElementById('product-unit').value;
    const description = document.getElementById('product-description').value;

    try {
        AppState.isSubmitting = true;
        showLoading();

        const response = await apiCall('products', 'POST', {
            id: id ? parseInt(id) : null,
            name, unit, description,
            page: AppState.currentPage,
        });

        if (response.success) {
            showToast('success', id ? 'Cập nhật thành công!' : 'Thêm sản phẩm thành công!');
            closeModal('modal-product');
            await loadProducts();
            displayDanhMuc();
            updateProductSelects();
        } else {
            throw new Error(response.message || 'Lỗi lưu sản phẩm');
        }
    } catch (error) {
        showToast('error', 'Lỗi: ' + error.message);
    } finally {
        AppState.isSubmitting = false;
        hideLoading();
    }
}

function editProduct(productId) {
    const product = AppState.products.find(p => p.id === productId);
    if (!product) return;

    document.getElementById('product-id').value = product.id;
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-unit').value = product.unit;
    document.getElementById('product-description').value = product.description || '';
    document.getElementById('modal-product-title').textContent = 'Sửa Sản Phẩm';
    openModal('modal-product');
}

// ============================================
// Display Functions
// ============================================

function updateProductSelects() {
    const pageProducts = AppState.products.filter(p => p.page === AppState.currentPage);
    ['nhap-product', 'xuat-product'].forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;
        const current = select.value;
        select.innerHTML = '<option value="">-- Chọn sản phẩm --</option>';
        pageProducts.forEach(p => {
            select.innerHTML += `<option value="${p.id}">${escapeHtml(p.name)} (${escapeHtml(p.unit)})</option>`;
        });
        if (current) select.value = current;
    });
}

function displayTonKho() {
    const container = document.getElementById('tonkho-list');
    if (!container) return;

    const search = (document.getElementById('search-tonkho')?.value || '').toLowerCase();
    const pageProducts = AppState.products.filter(p =>
        p.page === AppState.currentPage && p.name.toLowerCase().includes(search)
    );
    const inv = AppState.inventory[AppState.currentPage] || {};

    if (pageProducts.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-text">Không có sản phẩm</div></div>';
        return;
    }

    container.innerHTML = `
        <div class="card">
            <div class="table-wrapper">
                <table class="data-table">
                    <thead><tr><th>Sản phẩm</th><th>ĐVT</th><th style="text-align:right">Tồn</th></tr></thead>
                    <tbody>
                        ${pageProducts.map(p => {
                            const qty = inv[p.id] || 0;
                            return `<tr>
                                <td><strong>${escapeHtml(p.name)}</strong></td>
                                <td>${escapeHtml(p.unit)}</td>
                                <td style="text-align:right"><strong style="color:${qty > 0 ? 'var(--success)' : 'var(--danger)'}">${qty}</strong></td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function displayLichSu() {
    const container = document.getElementById('lichsu-list');
    if (!container) return;

    const search = (document.getElementById('search-lichsu')?.value || '').toLowerCase();
    const filterType = document.getElementById('filter-type')?.value || '';
    const productMap = buildProductMap(AppState.products);

    let filtered = AppState.transactions.filter(t => t.page === AppState.currentPage);
    if (filterType) filtered = filtered.filter(t => t.type === filterType);
    if (search) {
        filtered = filtered.filter(t => {
            const p = productMap.get(String(t.product_id));
            return p && p.name.toLowerCase().includes(search);
        });
    }
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🕐</div><div class="empty-state-text">Chưa có lịch sử</div></div>';
        return;
    }

    // Group by date
    const groups = {};
    filtered.forEach(t => {
        const d = new Date(t.timestamp);
        const key = d.toLocaleDateString('vi-VN');
        if (!groups[key]) groups[key] = { date: d, items: [] };
        groups[key].items.push(t);
    });

    let html = '';
    Object.keys(groups).forEach(key => {
        const g = groups[key];
        html += `<div class="date-header">${getRelativeDateLabel(g.date)}</div>`;
        g.items.forEach(t => {
            const p = productMap.get(String(t.product_id));
            const name = p ? p.name : 'N/A';
            html += `
                <div class="list-item">
                    <div class="list-item-header">
                        <div class="list-item-title">${escapeHtml(name)}</div>
                        <div class="badge badge-${t.type}">${t.type === 'nhap' ? 'Nhập' : 'Xuất'}</div>
                    </div>
                    <div class="list-item-details">
                        <div class="list-item-detail"><span>SL: ${t.quantity}</span></div>
                        <div class="list-item-detail"><span>${formatTime(t.timestamp)}</span></div>
                        ${t.user ? `<div class="list-item-detail"><span>${escapeHtml(t.user)}</span></div>` : ''}
                    </div>
                    ${t.note ? `<div style="margin-top:6px;font-size:13px;color:var(--text-tertiary)">${escapeHtml(t.note)}</div>` : ''}
                </div>
            `;
        });
    });

    container.innerHTML = html;
}

function displayDanhMuc() {
    const container = document.getElementById('danhmuc-list');
    if (!container) return;

    const pageProducts = AppState.products.filter(p => p.page === AppState.currentPage);

    if (pageProducts.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-text">Chưa có sản phẩm</div></div>';
        return;
    }

    container.innerHTML = pageProducts.map(p => `
        <div class="list-item">
            <div class="list-item-header">
                <div class="list-item-title">${escapeHtml(p.name)}</div>
                <button class="btn btn-secondary btn-sm" onclick="editProduct(${p.id})">Sửa</button>
            </div>
            <div class="list-item-details">
                <div class="list-item-detail"><span>ĐVT: ${escapeHtml(p.unit)}</span></div>
                ${p.description ? `<div class="list-item-detail"><span>${escapeHtml(p.description)}</span></div>` : ''}
            </div>
        </div>
    `).join('');
}

// ============================================
// Dashboard
// ============================================

function updateDashboard() {
    updateDashboardBandwidth();
    updateDashboardChart();
    updateDashboardRecent();
}

function updateDashboardChart() {
    const canvas = document.getElementById('dashboard-chart');
    const chartContainer = document.getElementById('chart-container');
    const chartEmpty = document.getElementById('chart-empty');
    if (!canvas || !chartContainer) return;
    if (typeof Chart === 'undefined') return;

    const pageProducts = AppState.products.filter(p => p.page === AppState.currentPage);
    const inv = AppState.inventory[AppState.currentPage] || {};

    // Destroy existing chart
    if (AppState.chartInstance) {
        AppState.chartInstance.destroy();
        AppState.chartInstance = null;
    }

    if (pageProducts.length === 0) {
        chartContainer.style.display = 'none';
        if (chartEmpty) chartEmpty.style.display = 'block';
        return;
    }

    chartContainer.style.display = 'block';
    if (chartEmpty) chartEmpty.style.display = 'none';

    const labels = pageProducts.map(p => p.name);
    const data = pageProducts.map(p => inv[p.id] || 0);
    const chartType = AppState.currentChartType;

    const palette = ['#3390ec', '#4caf50', '#ff9800', '#e53935', '#9c27b0', '#00bcd4', '#ff5722', '#607d8b'];
    const barColors = data.map(v => v > 0 ? '#4caf50' : v < 0 ? '#e53935' : '#999999');
    const pieColors = labels.map((_, i) => palette[i % palette.length]);

    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#000';
    const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--separator').trim() || 'rgba(0,0,0,0.08)';

    const isBar = chartType === 'bar';

    AppState.chartInstance = new Chart(canvas, {
        type: chartType,
        data: {
            labels: labels,
            datasets: [{
                label: 'Tồn kho',
                data: data,
                backgroundColor: isBar ? barColors : pieColors,
                borderRadius: isBar ? 6 : 0,
                barThickness: isBar ? 28 : undefined,
                borderWidth: isBar ? 0 : 2,
                borderColor: isBar ? undefined : '#fff',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: !isBar, position: 'bottom', labels: { color: textColor, font: { size: 11 }, padding: 12 } },
            },
            scales: isBar ? {
                x: { ticks: { color: textColor, font: { size: 11 } }, grid: { display: false } },
                y: { beginAtZero: true, ticks: { color: textColor, font: { size: 11 }, precision: 0 }, grid: { color: gridColor } }
            } : {}
        }
    });
}

function switchChartType(type) {
    AppState.currentChartType = type;
    document.getElementById('chart-type-bar')?.classList.toggle('active', type === 'bar');
    document.getElementById('chart-type-doughnut')?.classList.toggle('active', type === 'doughnut');
    updateDashboardChart();
}

function updateDashboardRecent() {
    const container = document.getElementById('dashboard-recent-list');
    if (!container) return;

    const productMap = buildProductMap(AppState.products);
    const recent = AppState.transactions
        .filter(t => t.page === AppState.currentPage)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 5);

    if (recent.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🕐</div><div class="empty-state-text">Chưa có hoạt động</div></div>';
        return;
    }

    container.innerHTML = recent.map(t => {
        const p = productMap.get(String(t.product_id));
        const name = p ? p.name : 'N/A';
        const isNhap = t.type === 'nhap';
        return `<div class="list-item" style="padding:8px 12px;margin-bottom:4px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="flex:1;">
                    <div style="font-size:13px;font-weight:600;">${escapeHtml(name)}</div>
                    <div style="font-size:11px;color:var(--text-tertiary);">${formatDateTime(t.timestamp)}</div>
                </div>
                <div style="font-size:14px;font-weight:700;color:${isNhap ? 'var(--success)' : 'var(--danger)'};">
                    ${isNhap ? '+' : '-'}${t.quantity}
                </div>
            </div>
        </div>`;
    }).join('');
}

// ============================================
// Export
// ============================================

function exportExcel() {
    try {
        const inv = AppState.inventory[AppState.currentPage] || {};
        const pageProducts = AppState.products.filter(p => p.page === AppState.currentPage);
        const productMap = buildProductMap(AppState.products);

        // Sheet 1: Inventory
        const invData = [['Sản Phẩm', 'Đơn Vị', 'Tồn Kho']];
        pageProducts.forEach(p => {
            invData.push([p.name, p.unit, inv[p.id] || 0]);
        });

        // Sheet 2: History
        const histData = [['Ngày Giờ', 'Loại', 'Sản Phẩm', 'Số Lượng', 'Người', 'Ghi Chú']];
        AppState.transactions
            .filter(t => t.page === AppState.currentPage)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .forEach(t => {
                const p = productMap.get(String(t.product_id));
                histData.push([
                    formatDateTime(t.timestamp),
                    t.type === 'nhap' ? 'Nhập' : 'Xuất',
                    p ? p.name : 'N/A',
                    t.quantity,
                    t.user || '',
                    t.note || '',
                ]);
            });

        if (typeof XLSX === 'undefined') {
            showToast('error', 'Thư viện XLSX chưa tải xong, thử lại sau');
            return;
        }
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(invData), 'Tồn Kho');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(histData), 'Lịch Sử');

        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const filename = `XNH_${AppState.currentPage}_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}.xlsx`;

        XLSX.writeFile(wb, filename);
        showToast('success', 'Đã xuất Excel!');
    } catch (error) {
        showToast('error', 'Lỗi export: ' + error.message);
    }
}

// ============================================
// Khu Vực (Location Management)
// ============================================

function displayKhuVuc() {
    const container = document.getElementById('khuvuc-list');
    if (!container) return;
    const pageLocations = AppState.locations.filter(loc => loc.page === AppState.currentPage);

    if (pageLocations.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📍</div><div class="empty-state-text">Chưa có khu vực nào</div></div>';
        return;
    }

    container.innerHTML = pageLocations.map(loc => `
        <div class="list-item">
            <div class="list-item-header">
                <div class="list-item-title">${escapeHtml(loc.name)}</div>
                <div style="display:flex;gap:6px;">
                    <button class="btn btn-secondary btn-sm" onclick="editLocation(${loc.id})">Sửa</button>
                </div>
            </div>
            ${loc.description ? `<div class="list-item-details"><div class="list-item-detail"><span>${escapeHtml(loc.description)}</span></div></div>` : ''}
        </div>
    `).join('');
}

function openLocationModal(locationId) {
    document.getElementById('form-location').reset();
    document.getElementById('location-id').value = '';

    if (locationId) {
        const loc = AppState.locations.find(l => l.id === locationId);
        if (loc) {
            document.getElementById('modal-location-title').textContent = 'Sửa Khu Vực';
            document.getElementById('location-id').value = loc.id;
            document.getElementById('location-name').value = loc.name;
            document.getElementById('location-description').value = loc.description || '';
        }
    } else {
        document.getElementById('modal-location-title').textContent = 'Thêm Khu Vực';
    }
    openModal('modal-location');
}

function editLocation(locationId) {
    openLocationModal(locationId);
}

async function handleSaveLocation(e) {
    e.preventDefault();
    if (AppState.isSubmitting) return;

    const id = document.getElementById('location-id').value;
    const name = document.getElementById('location-name').value;
    const description = document.getElementById('location-description').value;

    try {
        AppState.isSubmitting = true;
        showLoading();
        const response = await apiCall('locations', 'POST', {
            id: id ? parseInt(id) : null,
            name, description,
            page: AppState.currentPage,
        });
        if (response.success) {
            showToast('success', id ? 'Cập nhật thành công!' : 'Thêm khu vực thành công!');
            closeModal('modal-location');
            await loadLocations();
            displayKhuVuc();
        } else {
            throw new Error(response.message || 'Lỗi lưu khu vực');
        }
    } catch (error) {
        showToast('error', 'Lỗi: ' + error.message);
    } finally {
        AppState.isSubmitting = false;
        hideLoading();
    }
}

// ============================================
// Băng Thông (Bandwidth Tracking)
// ============================================

const PROVIDER_MAP = { ezecom: 'EZECOM', today: 'Today', sinet: 'SINet', mekong: 'MekongNet', telnet: 'TelNet', online: 'Online', metfone: 'Metfone', other: 'Khác' };

function updateLocationDropdown() {
    const dropdown = document.getElementById('bt-location');
    if (!dropdown) return;
    const pageLocations = AppState.locations.filter(loc => loc.page === AppState.currentPage);
    const current = dropdown.value;
    dropdown.innerHTML = '<option value="">-- Chọn khu vực --</option>';
    pageLocations.forEach(loc => {
        dropdown.innerHTML += `<option value="${escapeHtml(loc.name)}">${escapeHtml(loc.name)}</option>`;
    });
    if (current && pageLocations.some(loc => loc.name === current)) dropdown.value = current;
    updateCurrentBandwidthField();
}

function updateCurrentBandwidthField() {
    const locationSelect = document.getElementById('bt-location');
    const currentInput = document.getElementById('bt-current');
    if (!locationSelect || !currentInput) return;

    const selected = locationSelect.value;
    if (!selected) { currentInput.value = 0; calculateBandwidthAfter(); return; }

    const data = AppState.currentBandwidth[selected];
    currentInput.value = data ? data.bandwidth : 0;
    handleEventTypeChange();
    calculateBandwidthAfter();
}

function handleEventTypeChange() {
    const eventType = document.getElementById('bt-event-type')?.value;
    const networkGroup = document.getElementById('bt-network-type-group');
    const providerGroup = document.getElementById('bt-provider-group');
    const networkSelect = document.getElementById('bt-network-type');
    const providerSelect = document.getElementById('bt-provider');
    const locationSelect = document.getElementById('bt-location');

    if (!eventType) return;

    if (eventType === 'moi' || eventType === 'chuyen') {
        if (networkGroup) networkGroup.style.display = '';
        if (providerGroup) providerGroup.style.display = '';
    } else {
        if (networkGroup) networkGroup.style.display = 'none';
        if (providerGroup) providerGroup.style.display = 'none';
        const selected = locationSelect?.value;
        if (selected && AppState.currentBandwidth[selected]) {
            const d = AppState.currentBandwidth[selected];
            if (networkSelect) networkSelect.value = d.network_type || '';
            if (providerSelect) providerSelect.value = d.provider || '';
        }
    }
}

function calculateBandwidthAfter() {
    const current = parseFloat(document.getElementById('bt-current')?.value) || 0;
    const change = parseFloat(document.getElementById('bt-change')?.value) || 0;
    const eventType = document.getElementById('bt-event-type')?.value;
    const afterInput = document.getElementById('bt-after');
    if (!afterInput) return;

    let result = 0;
    if (eventType === 'moi') result = Math.abs(change);
    else if (eventType === 'tang') result = current + Math.abs(change);
    else if (eventType === 'giam') result = current - Math.abs(change);
    else if (eventType === 'chuyen') result = current + change;
    else result = current;

    afterInput.value = Math.max(0, result);
}

async function handleBandwidthSubmit(e) {
    e.preventDefault();
    if (AppState.isSubmitting) return;

    const location = document.getElementById('bt-location').value.trim();
    const eventType = document.getElementById('bt-event-type').value;
    const networkType = document.getElementById('bt-network-type').value;
    const provider = document.getElementById('bt-provider').value;
    const changeValue = parseFloat(document.getElementById('bt-change').value);
    const after = parseFloat(document.getElementById('bt-after').value);
    const note = document.getElementById('bt-note').value.trim();

    if (!location || !eventType || isNaN(changeValue)) {
        showToast('error', 'Vui lòng điền đầy đủ!');
        return;
    }
    if ((eventType === 'moi' || eventType === 'chuyen') && (!networkType || !provider)) {
        showToast('error', 'Vui lòng chọn loại mạng và nhà cung cấp!');
        return;
    }

    let actualChange = 0;
    if (eventType === 'moi') actualChange = Math.abs(changeValue);
    else if (eventType === 'tang') actualChange = Math.abs(changeValue);
    else if (eventType === 'giam') actualChange = -Math.abs(changeValue);
    else actualChange = changeValue;

    try {
        AppState.isSubmitting = true;
        showLoading();
        const response = await apiCall('bandwidth_logs', 'POST', {
            location, event_type: eventType, network_type: networkType,
            provider, bandwidth_change: actualChange, bandwidth_after: after,
            note, user: AppState.user || '',
        });
        if (response.success) {
            showToast('success', 'Cập nhật băng thông thành công!');
            document.getElementById('form-bangthong').reset();
            await loadBandwidthLogs();
            displayBandwidth();
        } else {
            throw new Error(response.message || 'Lỗi');
        }
    } catch (error) {
        showToast('error', 'Lỗi: ' + error.message);
    } finally {
        AppState.isSubmitting = false;
        hideLoading();
    }
}

function displayBandwidth() {
    displayCurrentBandwidth();
    displayBandwidthHistory();
    updateDashboardBandwidth();
}

function renderBandwidthItem(loc) {
    const providerText = PROVIDER_MAP[loc.provider] || loc.provider || 'N/A';
    const updateDate = loc.lastUpdate ? new Date(loc.lastUpdate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '';
    return `<div class="list-item" style="padding:8px 12px;margin-bottom:4px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
            <div style="flex:1;display:flex;flex-direction:column;gap:2px;">
                <div style="font-size:13px;font-weight:600;">${escapeHtml(loc.location)}</div>
                ${updateDate ? `<div style="font-size:10px;color:var(--text-tertiary);">Cập nhật: ${updateDate}</div>` : ''}
            </div>
            <div style="font-size:13px;font-weight:600;color:var(--text-secondary);margin:0 12px;">${providerText}</div>
            <div style="font-size:16px;font-weight:700;color:var(--primary);white-space:nowrap;">
                ${loc.bandwidth}<span style="font-size:11px;font-weight:500;opacity:0.7;margin-left:2px;">Mbps</span>
            </div>
        </div>
    </div>`;
}

function renderBandwidthGroup(locations) {
    const groups = { doanh_nghiep: [], gia_dinh: [], other: [] };
    locations.forEach(loc => {
        const t = loc.network_type;
        if (t === 'doanh_nghiep') groups.doanh_nghiep.push(loc);
        else if (t === 'gia_dinh') groups.gia_dinh.push(loc);
        else groups.other.push(loc);
    });
    Object.values(groups).forEach(g => g.sort((a, b) => (b.bandwidth || 0) - (a.bandwidth || 0)));

    let html = '';
    const sections = [
        { key: 'doanh_nghiep', icon: '🏢', label: 'Mạng Doanh Nghiệp' },
        { key: 'gia_dinh', icon: '🏠', label: 'Mạng Gia Đình' },
        { key: 'other', icon: '🌐', label: 'Khác' },
    ];
    sections.forEach(s => {
        if (groups[s.key].length > 0) {
            html += `<div style="margin-bottom:16px;">
                <div style="font-size:13px;font-weight:600;color:var(--primary);padding:8px 12px;margin-bottom:6px;display:flex;align-items:center;gap:6px;background:rgba(51,144,236,0.08);border-radius:10px;border-left:3px solid var(--primary);">
                    <span>${s.icon}</span><span>${s.label}</span>
                </div>
                ${groups[s.key].map(loc => renderBandwidthItem(loc)).join('')}
            </div>`;
        }
    });
    return html;
}

function displayCurrentBandwidth() {
    const container = document.getElementById('current-bandwidth-list');
    if (!container) return;
    const locations = Object.values(AppState.currentBandwidth);
    if (locations.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📡</div><div class="empty-state-text">Chưa có dữ liệu băng thông</div></div>';
        return;
    }
    container.innerHTML = renderBandwidthGroup(locations);
}

function updateDashboardBandwidth() {
    const container = document.getElementById('dashboard-bandwidth-list');
    if (!container) return;
    const locations = Object.values(AppState.currentBandwidth);
    if (locations.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📡</div><div class="empty-state-text">Chưa có dữ liệu</div></div>';
        return;
    }
    container.innerHTML = renderBandwidthGroup(locations);
}

function displayBandwidthHistory() {
    const container = document.getElementById('bandwidth-history-list');
    if (!container) return;
    const search = (document.getElementById('search-bandwidth')?.value || '').toLowerCase();

    let logs = AppState.bandwidthLogs.filter(log =>
        log.page === AppState.currentPage && log.location.toLowerCase().includes(search)
    );

    if (logs.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📡</div><div class="empty-state-text">Chưa có lịch sử</div></div>';
        return;
    }

    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const eventMap = { moi: ['🆕', 'Lắp Mới'], tang: ['📈', 'Tăng'], giam: ['📉', 'Giảm'], chuyen: ['🔄', 'Đổi NCC'] };
    const netMap = { doanh_nghiep: ['🏢', 'Doanh Nghiệp'], gia_dinh: ['🏠', 'Gia Đình'] };

    container.innerHTML = logs.map(log => {
        const change = log.bandwidth_change;
        const changeText = change > 0 ? `+${change}` : `${change}`;
        const changeColor = change > 0 ? 'var(--success)' : 'var(--danger)';
        const [eIcon, eText] = eventMap[log.event_type] || ['📝', 'Khác'];
        const [nIcon, nText] = netMap[log.network_type] || ['🌐', log.network_type || 'N/A'];
        const providerText = PROVIDER_MAP[log.provider] || log.provider || 'N/A';
        const time = new Date(log.timestamp).toLocaleString('vi-VN');

        return `<div class="list-item">
            <div class="list-item-header">
                <div class="list-item-title">${escapeHtml(log.location)}</div>
                <div class="badge" style="background:${changeColor};color:white;">${eIcon} ${eText}</div>
            </div>
            <div class="list-item-details">
                <div class="list-item-detail"><span>${nIcon} ${nText}</span></div>
                <div class="list-item-detail"><span>📶 ${providerText}</span></div>
                <div class="list-item-detail"><span>📊 Thay đổi: <strong style="color:${changeColor};">${changeText} Mbps</strong></span></div>
                <div class="list-item-detail"><span>📡 Sau: <strong>${log.bandwidth_after} Mbps</strong></span></div>
                <div class="list-item-detail"><span>⏰ ${time}</span></div>
                ${log.user ? `<div class="list-item-detail"><span>👤 ${escapeHtml(log.user)}</span></div>` : ''}
                ${log.note ? `<div class="list-item-detail"><span>📝 ${escapeHtml(log.note)}</span></div>` : ''}
            </div>
        </div>`;
    }).join('');
}
