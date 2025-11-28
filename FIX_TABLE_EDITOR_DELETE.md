# 🔧 Fix: Cannot Delete Data in Supabase Table Editor

## Problem

Khi bạn cố gắng xóa dữ liệu trong Supabase Table Editor, bạn gặp lỗi hoặc không thể xóa được.

## Root Causes

### 1. Row Level Security (RLS) Enabled
Supabase mặc định bật RLS cho tất cả tables. Khi RLS được bật mà chưa có policies → bạn không có quyền xóa dữ liệu.

### 2. Foreign Key Constraint với ON DELETE RESTRICT
Schema cũ dùng `ON DELETE RESTRICT` → không cho phép xóa product nếu có transactions tham chiếu đến nó.

---

## Solutions

### Quick Fix 1: Disable RLS (Development/Testing Only)

**Vào Supabase SQL Editor, chạy:**

```sql
-- Disable RLS cho tất cả tables
ALTER TABLE allowed_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE bandwidth_logs DISABLE ROW LEVEL SECURITY;
```

✅ **Kết quả:** Bạn có thể xóa/sửa dữ liệu tự do trong Table Editor

⚠️ **Lưu ý:** Chỉ dùng cho development/testing! Production nên enable RLS + tạo policies.

---

### Quick Fix 2: Change Foreign Key to CASCADE

**Vào Supabase SQL Editor, chạy:**

```sql
-- Drop old constraint
ALTER TABLE transactions
DROP CONSTRAINT transactions_product_id_fkey;

-- Add new constraint with CASCADE
ALTER TABLE transactions
ADD CONSTRAINT transactions_product_id_fkey
FOREIGN KEY (product_id)
REFERENCES products(id)
ON DELETE CASCADE;
```

✅ **Kết quả:** Khi xóa product → tự động xóa tất cả transactions liên quan

⚠️ **Lưu ý:** Cẩn thận khi xóa product vì sẽ mất hết lịch sử transactions!

---

### Recommended: Use Updated Schema

**File `supabase-schema.sql` mới (v3.0.1) đã fix cả 2 vấn đề:**

1. ✅ Tự động disable RLS (lines 108-112)
2. ✅ Dùng `ON DELETE CASCADE` (line 73)

**Nếu đã chạy schema cũ:**

**Option A: Drop & Recreate (nếu data không quan trọng)**

```sql
-- Drop tất cả tables
DROP TABLE IF EXISTS bandwidth_logs CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS allowed_users CASCADE;
DROP MATERIALIZED VIEW IF EXISTS inventory_current;

-- Sau đó chạy lại supabase-schema.sql mới
```

**Option B: Chỉ fix constraint (giữ nguyên data)**

```sql
-- 1. Disable RLS
ALTER TABLE allowed_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE bandwidth_logs DISABLE ROW LEVEL SECURITY;

-- 2. Change foreign key
ALTER TABLE transactions DROP CONSTRAINT transactions_product_id_fkey;
ALTER TABLE transactions ADD CONSTRAINT transactions_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
```

---

## Verify Fix

**Test xóa dữ liệu:**

1. Vào **Table Editor** → Chọn table `products`
2. Click vào row bất kỳ → Click **Delete**
3. Phải thấy confirmation dialog và xóa thành công

**Check RLS status:**

```sql
SELECT
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Expected result:
```
tablename          | rowsecurity
-------------------|-------------
allowed_users      | f (false)
bandwidth_logs     | f (false)
locations          | f (false)
products           | f (false)
transactions       | f (false)
```

**Check foreign key constraints:**

```sql
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, tc.constraint_name;
```

Expected for `transactions`:
```
constraint_name              | delete_rule
-----------------------------|-------------
transactions_product_id_fkey | CASCADE
```

---

## For Production

### Enable RLS với Policies

**Sau khi testing xong, enable RLS và tạo policies:**

```sql
-- 1. Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
-- ... (tương tự cho các tables khác)

-- 2. Create policies
-- Example: Allow service_role to do anything
CREATE POLICY "Service role can do anything"
ON products
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Example: Authenticated users can read
CREATE POLICY "Authenticated users can read products"
ON products
FOR SELECT
TO authenticated
USING (true);

-- ... (tạo thêm policies theo nhu cầu)
```

**Xem thêm:** [README_SUPABASE.md](README_SUPABASE.md) section "Security Best Practices"

---

## Summary

✅ **Development/Testing:** Disable RLS + use CASCADE
✅ **Production:** Enable RLS + create policies + consider RESTRICT

**Updated schema file:** [supabase-schema.sql](supabase-schema.sql) v3.0.1

---

**Last Updated:** 2025-11-28
