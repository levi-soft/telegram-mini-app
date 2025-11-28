-- ============================================
-- SUPABASE POSTGRESQL SCHEMA
-- Telegram Mini App - Quản Lý Xuất Nhập Hàng
-- ============================================
-- Copy toàn bộ file này vào Supabase SQL Editor và chạy

-- ============================================
-- BẢNG 1: products (Sản phẩm)
-- ============================================
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    description TEXT,
    page VARCHAR(10) NOT NULL CHECK (page IN ('RR88', 'XX88', 'MM88')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_product_per_page UNIQUE (name, page)
);

-- Indexes cho products
CREATE INDEX IF NOT EXISTS idx_products_page ON products(page);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- ============================================
-- BẢNG 2: transactions (Lịch sử nhập/xuất)
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(10) NOT NULL CHECK (type IN ('nhap', 'xuat')),
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    note TEXT,
    page VARCHAR(10) NOT NULL CHECK (page IN ('RR88', 'XX88', 'MM88')),
    user_name VARCHAR(255) NOT NULL,
    telegram_user_id BIGINT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes cho transactions
CREATE INDEX IF NOT EXISTS idx_transactions_page ON transactions(page);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_product_id ON transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_page_timestamp ON transactions(page, timestamp DESC);

-- ============================================
-- BẢNG 3: allowed_users (Whitelist - Phân quyền)
-- ============================================
CREATE TABLE IF NOT EXISTS allowed_users (
    id BIGSERIAL PRIMARY KEY,
    telegram_id BIGINT NOT NULL UNIQUE,
    pages TEXT NOT NULL,  -- Comma-separated: "RR88,XX88,MM88"
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes cho allowed_users
CREATE INDEX IF NOT EXISTS idx_allowed_users_telegram_id ON allowed_users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_allowed_users_active ON allowed_users(active);

-- ============================================
-- BẢNG 4: locations (Khu vực - cho Băng thông)
-- ============================================
CREATE TABLE IF NOT EXISTS locations (
    id BIGSERIAL PRIMARY KEY,
    page VARCHAR(10) NOT NULL CHECK (page IN ('RR88', 'XX88', 'MM88')),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_location_per_page UNIQUE (name, page)
);

-- Indexes cho locations
CREATE INDEX IF NOT EXISTS idx_locations_page ON locations(page);
CREATE INDEX IF NOT EXISTS idx_locations_name ON locations(name);

-- ============================================
-- BẢNG 5: bandwidth_logs (Băng thông)
-- ============================================
CREATE TABLE IF NOT EXISTS bandwidth_logs (
    id BIGSERIAL PRIMARY KEY,
    page VARCHAR(10) NOT NULL CHECK (page IN ('RR88', 'XX88', 'MM88')),
    location VARCHAR(255) NOT NULL,
    network_type VARCHAR(20) NOT NULL CHECK (network_type IN ('doanh_nghiep', 'gia_dinh')),
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('ezecom', 'today', 'sinet', 'mekong', 'telnet', 'online', 'metfone', 'other')),
    event_type VARCHAR(10) NOT NULL CHECK (event_type IN ('moi', 'tang', 'giam', 'chuyen')),
    bandwidth_change DECIMAL(10,2) NOT NULL,
    bandwidth_after DECIMAL(10,2) NOT NULL CHECK (bandwidth_after >= 0),
    note TEXT,
    user_name VARCHAR(255) NOT NULL,
    telegram_user_id BIGINT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes cho bandwidth_logs
CREATE INDEX IF NOT EXISTS idx_bandwidth_logs_page ON bandwidth_logs(page);
CREATE INDEX IF NOT EXISTS idx_bandwidth_logs_location ON bandwidth_logs(location);
CREATE INDEX IF NOT EXISTS idx_bandwidth_logs_timestamp ON bandwidth_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_bandwidth_logs_page_location ON bandwidth_logs(page, location);

-- ============================================
-- VIEW 1: inventory (Tồn kho - Tự động tính)
-- ============================================
CREATE OR REPLACE VIEW inventory AS
SELECT
    p.id AS product_id,
    p.name AS product_name,
    p.unit,
    p.page,
    COALESCE(
        SUM(CASE WHEN t.type = 'nhap' THEN t.quantity ELSE 0 END) -
        SUM(CASE WHEN t.type = 'xuat' THEN t.quantity ELSE 0 END),
        0
    )::INTEGER AS quantity
FROM products p
LEFT JOIN transactions t ON p.id = t.product_id
GROUP BY p.id, p.name, p.unit, p.page;

-- ============================================
-- VIEW 2: current_bandwidth (Băng thông hiện tại theo location)
-- ============================================
CREATE OR REPLACE VIEW current_bandwidth AS
SELECT DISTINCT ON (page, location)
    page,
    location,
    network_type,
    provider,
    bandwidth_after AS bandwidth,
    timestamp
FROM bandwidth_logs
ORDER BY page, location, timestamp DESC;

-- ============================================
-- FUNCTION: Tự động cập nhật updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger cho products
DROP TRIGGER IF EXISTS trigger_products_updated_at ON products;
CREATE TRIGGER trigger_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger cho allowed_users
DROP TRIGGER IF EXISTS trigger_allowed_users_updated_at ON allowed_users;
CREATE TRIGGER trigger_allowed_users_updated_at
    BEFORE UPDATE ON allowed_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HOÀN TẤT
-- ============================================
-- Sau khi chạy xong, bạn sẽ có:
-- - 5 bảng: products, transactions, allowed_users, locations, bandwidth_logs
-- - 2 views: inventory (tự động tính tồn kho), current_bandwidth
-- - Tự động cập nhật updated_at khi UPDATE
--
-- Tiếp theo:
-- 1. Thêm dữ liệu allowed_users để test
-- 2. Cấu hình n8n PostgreSQL credentials với Supabase connection string
-- 3. Tạo workflow n8n mới
