// ============================================
// API Layer
// ============================================

async function apiCall(endpoint, method = 'GET', data = null) {
    // All API calls use POST (n8n single webhook)
    // method is passed in body so the Code node knows intent
    const payload = {
        ...(data || {}),
        page: AppState.currentPage,
        user: AppState.user,
        timestamp: new Date().toISOString(),
    };

    const params = new URLSearchParams({
        endpoint: endpoint,
        page: AppState.currentPage,
        user_id: AppState.userId || '',
    });

    if (AppState.initData) {
        params.set('initData', AppState.initData);
    }

    const url = `${CONFIG.N8N_WEBHOOK_URL}/${CONFIG.API_PATH}?${params}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    if (!text || text.trim() === '') {
        throw new Error('Empty response');
    }

    const result = JSON.parse(text);

    if (result.success === false && result.error === 'Unauthorized') {
        handleUnauthorized(result.message);
        throw new Error('Unauthorized');
    }

    return result;
}

function handleUnauthorized(message) {
    hideLoading();
    const content = document.querySelector('.content');
    if (content) {
        const tgId = AppState.userId || 'Không xác định';
        const tgName = AppState.user || '';
        content.innerHTML = `
            <div class="card" style="text-align: center; padding: 40px;">
                <div style="font-size: 48px; margin-bottom: 16px;">🔒</div>
                <h2 style="margin-bottom: 8px;">Không có quyền truy cập</h2>
                <p style="color: var(--text-tertiary); margin-bottom: 20px;">${escapeHtml(message || 'Liên hệ admin để được cấp quyền.')}</p>
                <div style="background: var(--bg-secondary); border-radius: 12px; padding: 16px; margin-bottom: 12px;">
                    <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 8px;">Telegram ID của bạn:</p>
                    <p id="user-tg-id" style="font-size: 20px; font-weight: 700; color: var(--text-primary); letter-spacing: 1px;">${escapeHtml(tgId)}</p>
                    ${tgName ? `<p style="font-size: 13px; color: var(--text-tertiary); margin-top: 4px;">${escapeHtml(tgName)}</p>` : ''}
                </div>
                <button class="btn btn-primary" onclick="copyTelegramId()" style="width: 100%;">
                    📋 Copy ID gửi Admin
                </button>
                <p style="font-size: 12px; color: var(--text-tertiary); margin-top: 12px;">Gửi ID này cho admin để được cấp quyền truy cập</p>
            </div>
        `;
    }
    // Hide nav
    const nav = document.querySelector('.bottom-nav');
    if (nav) nav.style.display = 'none';
}

function copyTelegramId() {
    const tgId = AppState.userId || '';
    if (!tgId) {
        showToast('error', 'Không có Telegram ID');
        return;
    }
    if (navigator.clipboard) {
        navigator.clipboard.writeText(tgId).then(() => {
            showToast('success', 'Đã copy ID: ' + tgId);
        }).catch(() => {
            fallbackCopy(tgId);
        });
    } else {
        fallbackCopy(tgId);
    }
}

function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('success', 'Đã copy ID: ' + text);
}
