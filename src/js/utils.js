// ============================================
// Utility Functions
// ============================================

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function debounce(fn, ms) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), ms);
    };
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
}

function formatTime(dateStr) {
    return new Date(dateStr).toLocaleTimeString('vi-VN', {
        hour: '2-digit', minute: '2-digit'
    });
}

function formatDateTime(dateStr) {
    return new Date(dateStr).toLocaleString('vi-VN');
}

function getRelativeDateLabel(date) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Hôm Nay';
    if (date.toDateString() === yesterday.toDateString()) return 'Hôm Qua';

    const dayOfWeek = date.toLocaleDateString('vi-VN', { weekday: 'long' });
    const dateStr = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${dayOfWeek}, ${dateStr}`;
}

function buildProductMap(products) {
    return new Map(products.map(p => [String(p.id), p]));
}

function csvEscape(val) {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}
