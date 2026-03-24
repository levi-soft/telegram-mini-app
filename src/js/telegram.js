// ============================================
// Telegram WebApp SDK Integration
// ============================================

function initTelegram() {
    const tg = window.Telegram?.WebApp;
    if (!tg) {
        console.warn('[TG] Telegram WebApp SDK not available');
        return;
    }

    tg.ready();
    tg.expand();
    tg.setHeaderColor('bg_color');
    tg.MainButton.hide();

    // Get user info
    const user = tg.initDataUnsafe?.user;
    if (user) {
        AppState.user = user.first_name || user.username || 'Unknown';
        AppState.userId = user.id;
    }

    // Store raw initData for server-side validation
    AppState.initData = tg.initData || null;

    // Sync theme
    const theme = tg.colorScheme || 'light';
    document.documentElement.setAttribute('data-theme', theme);

    tg.onEvent('themeChanged', function () {
        document.documentElement.setAttribute('data-theme', tg.colorScheme);
    });
}
