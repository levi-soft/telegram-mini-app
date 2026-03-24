// ============================================
// Navigation & Routing
// ============================================

function showSection(sectionId) {
    AppState.currentSection = sectionId;

    // Update sections
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`section-${sectionId}`);
    if (target) target.classList.add('active');

    // Update nav
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const navBtn = document.querySelector(`.nav-btn[data-section="${sectionId}"]`);
    if (navBtn) navBtn.classList.add('active');

    // Refresh section data
    refreshSection(sectionId);
}

function refreshSection(sectionId) {
    switch (sectionId) {
        case 'dashboard': updateDashboard(); break;
        case 'nhap': updateProductSelects(); break;
        case 'xuat': updateProductSelects(); break;
        case 'tonkho': displayTonKho(); break;
        case 'lichsu': displayLichSu(); break;
        case 'danhmuc': displayDanhMuc(); break;
        case 'khuvuc': displayKhuVuc(); break;
        case 'bangthong':
            displayBandwidth();
            updateLocationDropdown();
            setTimeout(() => { updateCurrentBandwidthField(); handleEventTypeChange(); }, 100);
            break;
    }
}

async function switchPage(page) {
    AppState.currentPage = page;
    updatePageButtons();

    try {
        showLoading();
        await loadProducts();
        await Promise.all([
            loadTransactions(),
            loadInventory(),
            loadLocations(),
            loadBandwidthLogs(),
        ]);
        refreshSection(AppState.currentSection);
    } catch (error) {
        showToast('error', 'Lỗi khi chuyển page');
    } finally {
        hideLoading();
    }
}
