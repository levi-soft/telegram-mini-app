-- =====================================================
-- FIX SEQUENCES SAU KHI IMPORT DỮ LIỆU CŨ
-- Chạy script này trong Supabase Dashboard → SQL Editor
-- SAU KHI đã import xong dữ liệu
-- =====================================================

-- 1. Fix sequence cho bảng PRODUCTS
SELECT setval(
  pg_get_serial_sequence('products', 'id'),
  COALESCE((SELECT MAX(id) FROM products), 0) + 1,
  false
);

-- 2. Fix sequence cho bảng TRANSACTIONS
SELECT setval(
  pg_get_serial_sequence('transactions', 'id'),
  COALESCE((SELECT MAX(id) FROM transactions), 0) + 1,
  false
);

-- 3. Fix sequence cho bảng LOCATIONS
SELECT setval(
  pg_get_serial_sequence('locations', 'id'),
  COALESCE((SELECT MAX(id) FROM locations), 0) + 1,
  false
);

-- 4. Fix sequence cho bảng BANDWIDTH_LOGS
SELECT setval(
  pg_get_serial_sequence('bandwidth_logs', 'id'),
  COALESCE((SELECT MAX(id) FROM bandwidth_logs), 0) + 1,
  false
);

-- 5. Fix sequence cho bảng ALLOWED_USERS
SELECT setval(
  pg_get_serial_sequence('allowed_users', 'id'),
  COALESCE((SELECT MAX(id) FROM allowed_users), 0) + 1,
  false
);

-- =====================================================
-- KIỂM TRA KẾT QUẢ
-- =====================================================
-- Hiển thị MAX(id) và giá trị sequence tiếp theo của từng bảng
SELECT
  'products' as table_name,
  (SELECT MAX(id) FROM products) as max_id,
  (SELECT last_value FROM products_id_seq) as next_id
UNION ALL
SELECT
  'transactions',
  (SELECT MAX(id) FROM transactions),
  (SELECT last_value FROM transactions_id_seq)
UNION ALL
SELECT
  'locations',
  (SELECT MAX(id) FROM locations),
  (SELECT last_value FROM locations_id_seq)
UNION ALL
SELECT
  'bandwidth_logs',
  (SELECT MAX(id) FROM bandwidth_logs),
  (SELECT last_value FROM bandwidth_logs_id_seq)
UNION ALL
SELECT
  'allowed_users',
  (SELECT MAX(id) FROM allowed_users),
  (SELECT last_value FROM allowed_users_id_seq);
