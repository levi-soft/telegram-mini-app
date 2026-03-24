// ============================================
// Global State
// ============================================
const AppState = {
    currentPage: 'RR88',
    currentSection: 'dashboard',
    allowedPages: [],

    // Data
    products: [],
    transactions: [],
    inventory: {},
    locations: [],
    bandwidthLogs: [],
    currentBandwidth: {},

    // User
    user: null,
    userId: null,
    initData: null,

    // UI
    isSubmitting: false,
    chartInstance: null,
    currentChartType: 'bar',
};
