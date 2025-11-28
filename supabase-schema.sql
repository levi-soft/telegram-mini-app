-- ============================================
-- XUẤT NHẬP HÀNG - SUPABASE ALL-IN-ONE SCHEMA
-- Version: 3.0.1
-- Date: 2025-11-28
-- ============================================

-- NOTE: Row Level Security (RLS)
-- By default, Supabase enables RLS on all tables.
-- For development/testing, you may want to disable RLS to allow manual editing in Table Editor.
-- Run this AFTER creating tables if you want to disable RLS:
--
-- ALTER TABLE allowed_users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE products DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE locations DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE bandwidth_logs DISABLE ROW LEVEL SECURITY;
--
-- For production, enable RLS and create policies (see README_SUPABASE.md)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy search

-- ============================================
-- TABLES
-- ============================================

-- Table 1: allowed_users
CREATE TABLE IF NOT EXISTS allowed_users (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    pages TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_allowed_users_user_id ON allowed_users(user_id);

-- Table 2: products
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    page TEXT NOT NULL CHECK (page IN ('RR88', 'XX88', 'MM88')),
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_product_per_page UNIQUE (page, name)
);

CREATE INDEX IF NOT EXISTS idx_products_page ON products(page);
CREATE INDEX IF NOT EXISTS idx_products_name ON products USING gin(name gin_trgm_ops);

-- Table 3: locations
CREATE TABLE IF NOT EXISTS locations (
    id BIGSERIAL PRIMARY KEY,
    page TEXT NOT NULL CHECK (page IN ('RR88', 'XX88', 'MM88')),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_location_per_page UNIQUE (page, name)
);

CREATE INDEX IF NOT EXISTS idx_locations_page ON locations(page);

-- Table 4: transactions
-- NOTE: ON DELETE CASCADE means:
-- - When you delete a product, all related transactions are automatically deleted
-- - This is useful for development/testing
-- - For production, consider using ON DELETE RESTRICT to prevent accidental data loss
CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    page TEXT NOT NULL CHECK (page IN ('RR88', 'XX88', 'MM88')),
    type TEXT NOT NULL CHECK (type IN ('nhap', 'xuat')),
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity NUMERIC(10,2) NOT NULL CHECK (quantity != 0),
    note TEXT,
    "user" TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_page ON transactions(page);
CREATE INDEX IF NOT EXISTS idx_transactions_product_id ON transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_page_timestamp ON transactions(page, timestamp DESC);

-- Table 5: bandwidth_logs
CREATE TABLE IF NOT EXISTS bandwidth_logs (
    id BIGSERIAL PRIMARY KEY,
    page TEXT NOT NULL CHECK (page IN ('RR88', 'XX88', 'MM88')),
    location TEXT NOT NULL,
    network_type TEXT NOT NULL CHECK (network_type IN ('doanh_nghiep', 'gia_dinh')),
    provider TEXT NOT NULL CHECK (provider IN ('ezecom', 'today', 'sinet', 'mekong', 'telnet', 'online', 'metfone', 'other')),
    event_type TEXT NOT NULL CHECK (event_type IN ('moi', 'tang', 'giam', 'chuyen')),
    bandwidth_change NUMERIC(10,2) NOT NULL,
    bandwidth_after NUMERIC(10,2) NOT NULL CHECK (bandwidth_after >= 0),
    note TEXT,
    "user" TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bandwidth_logs_page ON bandwidth_logs(page);
CREATE INDEX IF NOT EXISTS idx_bandwidth_logs_location ON bandwidth_logs(location);
CREATE INDEX IF NOT EXISTS idx_bandwidth_logs_timestamp ON bandwidth_logs(timestamp DESC);

-- ============================================
-- DISABLE ROW LEVEL SECURITY (Development/Testing)
-- ============================================
-- This allows manual editing in Supabase Table Editor
-- For production, remove this section and create proper RLS policies

ALTER TABLE allowed_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE bandwidth_logs DISABLE ROW LEVEL SECURITY;

-- ============================================
-- MATERIALIZED VIEW: Current Inventory
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS inventory_current AS
SELECT
    p.id AS product_id,
    p.page,
    p.name AS product_name,
    p.unit,
    COALESCE(SUM(
        CASE
            WHEN t.type = 'nhap' THEN t.quantity
            WHEN t.type = 'xuat' THEN -t.quantity
            ELSE 0
        END
    ), 0) AS current_quantity,
    COUNT(t.id) AS total_transactions,
    MAX(t.timestamp) AS last_updated
FROM products p
LEFT JOIN transactions t ON p.id = t.product_id
GROUP BY p.id, p.page, p.name, p.unit;

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_current_product_id ON inventory_current(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_current_page ON inventory_current(page);

-- Function to refresh inventory
CREATE OR REPLACE FUNCTION refresh_inventory()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY inventory_current;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STORED FUNCTIONS: API Operations
-- ============================================

-- ============================================
-- Function: api_get
-- Universal GET function for all endpoints
-- ============================================
CREATE OR REPLACE FUNCTION api_get(
    p_endpoint TEXT,
    p_page TEXT DEFAULT NULL,
    p_search TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    CASE p_endpoint
        -- GET products
        WHEN 'products' THEN
            SELECT json_build_object(
                'success', true,
                'data', COALESCE(json_agg(row_to_json(t)), '[]'::json)
            ) INTO result
            FROM (
                SELECT id, page, name, unit, description, created_at
                FROM products
                WHERE (p_page IS NULL OR page = p_page)
                  AND (p_search IS NULL OR name ILIKE '%' || p_search || '%')
                ORDER BY name ASC
            ) t;

        -- GET transactions
        WHEN 'transactions' THEN
            SELECT json_build_object(
                'success', true,
                'data', COALESCE(json_agg(row_to_json(t)), '[]'::json)
            ) INTO result
            FROM (
                SELECT
                    t.id,
                    t.page,
                    t.type,
                    t.product_id,
                    p.name AS product_name,
                    p.unit,
                    t.quantity,
                    t.note,
                    t."user",
                    t.timestamp
                FROM transactions t
                JOIN products p ON t.product_id = p.id
                WHERE (p_page IS NULL OR t.page = p_page)
                ORDER BY t.timestamp DESC
                LIMIT 500
            ) t;

        -- GET inventory
        WHEN 'inventory' THEN
            PERFORM refresh_inventory();
            SELECT json_build_object(
                'success', true,
                'data', COALESCE(json_agg(row_to_json(t)), '[]'::json)
            ) INTO result
            FROM (
                SELECT
                    product_id,
                    page,
                    product_name,
                    unit,
                    current_quantity,
                    total_transactions,
                    last_updated
                FROM inventory_current
                WHERE (p_page IS NULL OR page = p_page)
                ORDER BY product_name ASC
            ) t;

        -- GET locations
        WHEN 'locations' THEN
            SELECT json_build_object(
                'success', true,
                'data', COALESCE(json_agg(row_to_json(t)), '[]'::json)
            ) INTO result
            FROM (
                SELECT id, page, name, description, created_at
                FROM locations
                WHERE (p_page IS NULL OR page = p_page)
                ORDER BY name ASC
            ) t;

        -- GET bandwidth_logs
        WHEN 'bandwidth_logs' THEN
            SELECT json_build_object(
                'success', true,
                'data', COALESCE(json_agg(row_to_json(t)), '[]'::json)
            ) INTO result
            FROM (
                SELECT
                    id, page, location, network_type, provider,
                    event_type, bandwidth_change, bandwidth_after,
                    note, "user", timestamp
                FROM bandwidth_logs
                WHERE (p_page IS NULL OR page = p_page)
                ORDER BY timestamp DESC
                LIMIT 500
            ) t;

        -- GET allowed_users (internal use)
        WHEN 'allowed_users' THEN
            SELECT json_build_object(
                'success', true,
                'data', COALESCE(json_agg(row_to_json(t)), '[]'::json)
            ) INTO result
            FROM (
                SELECT id, user_id, pages, created_at
                FROM allowed_users
                ORDER BY user_id ASC
            ) t;

        ELSE
            result := json_build_object(
                'success', false,
                'message', 'Unknown endpoint: ' || p_endpoint
            );
    END CASE;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function: api_post_product
-- Add or update product
-- ============================================
CREATE OR REPLACE FUNCTION api_post_product(
    p_id BIGINT DEFAULT NULL,
    p_page TEXT DEFAULT NULL,
    p_name TEXT DEFAULT NULL,
    p_unit TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_product_id BIGINT;
    v_is_update BOOLEAN;
BEGIN
    -- Validation
    IF p_page IS NULL OR p_name IS NULL OR p_unit IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Missing required fields: page, name, unit'
        );
    END IF;

    -- Check if update or insert
    v_is_update := (p_id IS NOT NULL);

    -- Upsert product
    INSERT INTO products (id, page, name, unit, description)
    VALUES (
        COALESCE(p_id, nextval('products_id_seq')),
        p_page,
        p_name,
        p_unit,
        COALESCE(p_description, '')
    )
    ON CONFLICT (page, name)
    DO UPDATE SET
        unit = EXCLUDED.unit,
        description = EXCLUDED.description
    RETURNING id INTO v_product_id;

    RETURN json_build_object(
        'success', true,
        'message', CASE WHEN v_is_update THEN 'Product updated' ELSE 'Product created' END,
        'data', json_build_object('id', v_product_id)
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function: api_post_transaction
-- Add transaction (nhap/xuat)
-- ============================================
CREATE OR REPLACE FUNCTION api_post_transaction(
    p_page TEXT,
    p_type TEXT,
    p_product_id BIGINT,
    p_quantity NUMERIC,
    p_note TEXT DEFAULT NULL,
    p_user TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_transaction_id BIGINT;
BEGIN
    -- Validation
    IF p_page IS NULL OR p_type IS NULL OR p_product_id IS NULL OR p_quantity IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Missing required fields'
        );
    END IF;

    IF p_type NOT IN ('nhap', 'xuat') THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Invalid type: must be nhap or xuat'
        );
    END IF;

    IF p_quantity = 0 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Quantity cannot be zero'
        );
    END IF;

    -- Check product exists
    IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id) THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Product not found'
        );
    END IF;

    -- Insert transaction
    INSERT INTO transactions (page, type, product_id, quantity, note, "user", timestamp)
    VALUES (
        p_page,
        p_type,
        p_product_id,
        p_quantity,
        COALESCE(p_note, ''),
        COALESCE(p_user, 'Unknown'),
        NOW()
    )
    RETURNING id INTO v_transaction_id;

    -- Refresh inventory
    PERFORM refresh_inventory();

    RETURN json_build_object(
        'success', true,
        'message', CASE p_type
            WHEN 'nhap' THEN 'Nhập hàng thành công'
            WHEN 'xuat' THEN 'Xuất hàng thành công'
        END,
        'data', json_build_object('id', v_transaction_id)
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function: api_post_location
-- Add, update, or delete location
-- ============================================
CREATE OR REPLACE FUNCTION api_post_location(
    p_action TEXT DEFAULT 'upsert', -- 'upsert' or 'delete'
    p_id BIGINT DEFAULT NULL,
    p_page TEXT DEFAULT NULL,
    p_name TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_location_id BIGINT;
BEGIN
    CASE p_action
        -- Delete action
        WHEN 'delete' THEN
            IF p_id IS NULL THEN
                RETURN json_build_object(
                    'success', false,
                    'message', 'Missing id for delete'
                );
            END IF;

            DELETE FROM locations WHERE id = p_id;

            RETURN json_build_object(
                'success', true,
                'message', 'Location deleted successfully'
            );

        -- Upsert action
        WHEN 'upsert' THEN
            IF p_page IS NULL OR p_name IS NULL THEN
                RETURN json_build_object(
                    'success', false,
                    'message', 'Missing required fields: page, name'
                );
            END IF;

            INSERT INTO locations (id, page, name, description)
            VALUES (
                COALESCE(p_id, nextval('locations_id_seq')),
                p_page,
                p_name,
                COALESCE(p_description, '')
            )
            ON CONFLICT (page, name)
            DO UPDATE SET
                description = EXCLUDED.description
            RETURNING id INTO v_location_id;

            RETURN json_build_object(
                'success', true,
                'message', CASE WHEN p_id IS NOT NULL THEN 'Location updated' ELSE 'Location created' END,
                'data', json_build_object('id', v_location_id)
            );

        ELSE
            RETURN json_build_object(
                'success', false,
                'message', 'Invalid action: must be upsert or delete'
            );
    END CASE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function: api_post_bandwidth
-- Add bandwidth log
-- ============================================
CREATE OR REPLACE FUNCTION api_post_bandwidth(
    p_page TEXT,
    p_location TEXT,
    p_network_type TEXT,
    p_provider TEXT,
    p_event_type TEXT,
    p_bandwidth_change NUMERIC,
    p_bandwidth_after NUMERIC,
    p_note TEXT DEFAULT NULL,
    p_user TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_log_id BIGINT;
BEGIN
    -- Validation
    IF p_page IS NULL OR p_location IS NULL OR p_network_type IS NULL OR
       p_provider IS NULL OR p_event_type IS NULL OR
       p_bandwidth_change IS NULL OR p_bandwidth_after IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Missing required fields'
        );
    END IF;

    IF p_network_type NOT IN ('doanh_nghiep', 'gia_dinh') THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Invalid network_type'
        );
    END IF;

    IF p_provider NOT IN ('ezecom', 'today', 'sinet', 'mekong', 'telnet', 'online', 'metfone', 'other') THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Invalid provider'
        );
    END IF;

    IF p_event_type NOT IN ('moi', 'tang', 'giam', 'chuyen') THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Invalid event_type'
        );
    END IF;

    -- Insert bandwidth log
    INSERT INTO bandwidth_logs (
        page, location, network_type, provider, event_type,
        bandwidth_change, bandwidth_after, note, "user", timestamp
    )
    VALUES (
        p_page,
        p_location,
        p_network_type,
        p_provider,
        p_event_type,
        p_bandwidth_change,
        p_bandwidth_after,
        COALESCE(p_note, ''),
        COALESCE(p_user, 'Unknown'),
        NOW()
    )
    RETURNING id INTO v_log_id;

    RETURN json_build_object(
        'success', true,
        'message', 'Bandwidth log created successfully',
        'data', json_build_object('id', v_log_id)
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function: api_check_user
-- Check if user is allowed
-- ============================================
CREATE OR REPLACE FUNCTION api_check_user(
    p_user_id TEXT,
    p_page TEXT
)
RETURNS JSON AS $$
DECLARE
    v_pages TEXT;
    v_allowed BOOLEAN;
BEGIN
    -- Get user pages
    SELECT pages INTO v_pages
    FROM allowed_users
    WHERE user_id = p_user_id;

    IF v_pages IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'allowed', false,
            'message', 'User not found'
        );
    END IF;

    -- Check if page is in allowed pages
    v_allowed := (v_pages LIKE '%' || p_page || '%');

    RETURN json_build_object(
        'success', true,
        'allowed', v_allowed,
        'pages', v_pages
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS: Auto-refresh inventory
-- ============================================
CREATE OR REPLACE FUNCTION auto_refresh_inventory()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM refresh_inventory();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_refresh_inventory ON transactions;

-- Create trigger
CREATE TRIGGER trigger_refresh_inventory
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH STATEMENT
EXECUTE FUNCTION auto_refresh_inventory();

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Insert sample user
INSERT INTO allowed_users (user_id, pages) VALUES
('123456789', 'RR88,XX88,MM88')
ON CONFLICT (user_id) DO NOTHING;

-- Insert sample products
INSERT INTO products (page, name, unit, description) VALUES
('RR88', 'Sản phẩm A', 'Thùng', 'Mô tả sản phẩm A'),
('RR88', 'Sản phẩm B', 'Cái', 'Mô tả sản phẩm B'),
('XX88', 'Sản phẩm C', 'Kg', 'Mô tả sản phẩm C')
ON CONFLICT (page, name) DO NOTHING;

-- Insert sample locations
INSERT INTO locations (page, name, description) VALUES
('RR88', 'Văn phòng tầng 8', 'Văn phòng chính'),
('RR88', 'KTX tầng 7', 'Ký túc xá sinh viên')
ON CONFLICT (page, name) DO NOTHING;

-- Refresh inventory
SELECT refresh_inventory();

-- ============================================
-- VERIFY INSTALLATION
-- ============================================

-- Check tables
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = t.table_name) as columns
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check functions
SELECT
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'api_%'
ORDER BY routine_name;

-- ============================================
-- TEST QUERIES (Optional)
-- ============================================

/*
-- Test GET products
SELECT api_get('products', 'RR88');

-- Test GET transactions
SELECT api_get('transactions', 'RR88');

-- Test GET inventory
SELECT api_get('inventory', 'RR88');

-- Test POST product
SELECT api_post_product(
    p_page := 'RR88',
    p_name := 'Test Product',
    p_unit := 'Piece',
    p_description := 'Test description'
);

-- Test POST transaction
SELECT api_post_transaction(
    p_page := 'RR88',
    p_type := 'nhap',
    p_product_id := 1,
    p_quantity := 10,
    p_note := 'Test import',
    p_user := 'Admin'
);

-- Test user check
SELECT api_check_user('123456789', 'RR88');
*/

-- ============================================
-- END OF SCRIPT
-- ============================================

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Supabase schema installed successfully!';
    RAISE NOTICE '📊 Tables: 5 (allowed_users, products, locations, transactions, bandwidth_logs)';
    RAISE NOTICE '🔧 Functions: 6 (api_get, api_post_product, api_post_transaction, api_post_location, api_post_bandwidth, api_check_user)';
    RAISE NOTICE '⚡ Triggers: 1 (auto_refresh_inventory)';
    RAISE NOTICE '📖 View SETUP_GUIDE_SUPABASE.md for n8n workflow setup';
END $$;
