-- =====================================================
-- SUPABASE POSTGRESQL SCHEMA
-- Telegram Mini App - Xuất Nhập Hàng
-- =====================================================
-- Chạy script này trong Supabase Dashboard → SQL Editor
-- =====================================================

-- 1. BẢNG PRODUCTS (Danh mục sản phẩm)
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  description TEXT,
  page TEXT NOT NULL CHECK (page IN ('RR88', 'XX88', 'MM88')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index để query nhanh theo page
CREATE INDEX IF NOT EXISTS idx_products_page ON products(page);

-- =====================================================
-- 2. BẢNG TRANSACTIONS (Lịch sử xuất nhập)
-- =====================================================
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('nhap', 'xuat')),
  product_id BIGINT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  note TEXT,
  page TEXT NOT NULL CHECK (page IN ('RR88', 'XX88', 'MM88')),
  "user" TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_page ON transactions(page);
CREATE INDEX IF NOT EXISTS idx_transactions_product ON transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp DESC);

-- =====================================================
-- 3. BẢNG LOCATIONS (Khu vực)
-- =====================================================
CREATE TABLE IF NOT EXISTS locations (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  page TEXT NOT NULL CHECK (page IN ('RR88', 'XX88', 'MM88')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_locations_page ON locations(page);

-- =====================================================
-- 4. BẢNG BANDWIDTH_LOGS (Lịch sử băng thông)
-- =====================================================
CREATE TABLE IF NOT EXISTS bandwidth_logs (
  id BIGSERIAL PRIMARY KEY,
  page TEXT NOT NULL CHECK (page IN ('RR88', 'XX88', 'MM88')),
  location TEXT NOT NULL,
  network_type TEXT CHECK (network_type IN ('doanh_nghiep', 'gia_dinh', 'other')),
  provider TEXT,
  event_type TEXT CHECK (event_type IN ('moi', 'tang', 'giam', 'chuyen')),
  bandwidth_change NUMERIC,
  bandwidth_after NUMERIC,
  note TEXT,
  "user" TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bandwidth_logs_page ON bandwidth_logs(page);
CREATE INDEX IF NOT EXISTS idx_bandwidth_logs_location ON bandwidth_logs(location);

-- =====================================================
-- 5. BẢNG ALLOWED_USERS (Whitelist người dùng)
-- =====================================================
CREATE TABLE IF NOT EXISTS allowed_users (
  id BIGSERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL UNIQUE,
  pages TEXT NOT NULL,  -- Comma-separated: 'RR88,XX88,MM88'
  role TEXT DEFAULT 'user',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_allowed_users_telegram ON allowed_users(telegram_id);

-- =====================================================
-- HOÀN TẤT!
-- Kiểm tra trong Table Editor để xác nhận các bảng đã tạo
-- =====================================================
