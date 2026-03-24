// ============================================
// Authentication & Permissions
// ============================================

async function checkUserPermissions() {
    try {
        const params = new URLSearchParams({
            endpoint: 'check_auth',
            user_id: AppState.userId || '',
        });

        if (AppState.initData) {
            params.set('initData', AppState.initData);
        }

        const url = `${CONFIG.N8N_WEBHOOK_URL}/${CONFIG.API_PATH}?${params}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });

        if (!response.ok) {
            return { authorized: false, message: 'Không thể kiểm tra quyền' };
        }

        const result = await response.json();

        if (result.success && result.authorized) {
            const pagesStr = result.pages || '';
            const pages = pagesStr.split(',').map(p => p.trim()).filter(p => p);
            return { authorized: true, pages: pages };
        }

        return {
            authorized: false,
            message: result.message || 'Không có quyền truy cập'
        };
    } catch (error) {
        console.error('[Auth] Error:', error);
        return { authorized: false, message: 'Lỗi kiểm tra quyền' };
    }
}

function updatePageButtons() {
    PAGES.forEach(page => {
        const btn = document.querySelector(`.page-btn[data-page="${page}"]`);
        if (!btn) return;

        if (AppState.allowedPages.includes(page)) {
            btn.style.display = '';
            btn.classList.toggle('active', page === AppState.currentPage);
        } else {
            btn.style.display = 'none';
        }
    });
}
