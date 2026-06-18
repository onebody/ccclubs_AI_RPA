-- =====================================================
-- QiYun AI System - RLS 验证脚本
-- 用于验证 Row-Level Security 策略是否正常工作
-- =====================================================

-- 清理测试数据（如果存在）
DROP TABLE IF EXISTS test_scores;
DROP TABLE IF EXISTS test_participants;
DROP TABLE IF EXISTS test_competitions;
DROP TABLE IF EXISTS test_user_tenants;
DROP TABLE IF EXISTS test_users;
DROP TABLE IF EXISTS test_tenants;

-- =====================================================
-- 1. 创建测试数据
-- =====================================================

-- 创建测试租户
INSERT INTO tenants (id, name, slug, is_active) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Test Tenant A', 'tenant-a', true),
  ('22222222-2222-2222-2222-222222222222', 'Test Tenant B', 'tenant-b', true);

-- 创建测试用户
INSERT INTO users (id, email, password, first_name, last_name, role, is_active) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin@tenant-a.com', 'hash', 'Admin', 'A', 'tenant_admin', true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'admin@tenant-b.com', 'hash', 'Admin', 'B', 'tenant_admin', true),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'judge@tenant-a.com', 'hash', 'Judge', 'A', 'judge', true);

-- 创建用户-租户关联
INSERT INTO user_tenants (user_id, tenant_id, is_default) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', true),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', true);

-- 创建测试比赛
INSERT INTO competitions (id, tenant_id, name, start_date, end_date, status) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Competition A', NOW(), NOW() + INTERVAL '1 day', 'published'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Competition B', NOW(), NOW() + INTERVAL '1 day', 'published');

-- =====================================================
-- 2. 验证 RLS - 租户 A 的管理员
-- =====================================================

-- 设置租户 A 的上下文
SELECT set_tenant_context('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'tenant_admin');

-- 查询比赛（应该只看到 Tenant A 的比赛）
SELECT 'Test 1: Tenant A admin should see only Tenant A competitions' AS test;
SELECT id, name, tenant_id FROM competitions;

-- 验证结果
DO $$
DECLARE
  comp_count INT;
BEGIN
  SELECT COUNT(*) INTO comp_count FROM competitions;
  IF comp_count = 1 THEN
    RAISE NOTICE '✅ Test 1 PASSED: Tenant A admin can only see 1 competition';
  ELSE
    RAISE WARNING '❌ Test 1 FAILED: Expected 1 competition, got %', comp_count;
  END IF;
END $$;

-- =====================================================
-- 3. 验证 RLS - 租户 B 的管理员
-- =====================================================

-- 清除上下文并设置租户 B 的上下文
SELECT clear_tenant_context();
SELECT set_tenant_context('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'tenant_admin');

-- 查询比赛（应该只看到 Tenant B 的比赛）
SELECT 'Test 2: Tenant B admin should see only Tenant B competitions' AS test;
SELECT id, name, tenant_id FROM competitions;

-- 验证结果
DO $$
DECLARE
  comp_count INT;
BEGIN
  SELECT COUNT(*) INTO comp_count FROM competitions;
  IF comp_count = 1 THEN
    RAISE NOTICE '✅ Test 2 PASSED: Tenant B admin can only see 1 competition';
  ELSE
    RAISE WARNING '❌ Test 2 FAILED: Expected 1 competition, got %', comp_count;
  END IF;
END $$;

-- =====================================================
-- 4. 验证 RLS - 跨租户数据隔离
-- =====================================================

-- 尝试插入属于租户 A 的比赛（应该失败或被隔离）
SELECT 'Test 3: Should not be able to see Tenant A competitions from Tenant B context' AS test;

-- 验证结果
DO $$
DECLARE
  comp_name TEXT;
BEGIN
  SELECT name INTO comp_name FROM competitions WHERE tenant_id = '11111111-1111-1111-1111-111111111111';
  IF comp_name IS NULL THEN
    RAISE NOTICE '✅ Test 3 PASSED: Tenant B cannot see Tenant A competitions';
  ELSE
    RAISE WARNING '❌ Test 3 FAILED: Tenant B can see Tenant A competitions';
  END IF;
END $$;

-- =====================================================
-- 5. 验证 RLS - 超级管理员
-- =====================================================

-- 设置超级管理员上下文
SELECT clear_tenant_context();
SELECT set_tenant_context('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'super_admin');

-- 查询比赛（应该看到所有比赛）
SELECT 'Test 4: Super admin should see all competitions' AS test;
SELECT id, name, tenant_id FROM competitions;

-- 验证结果
DO $$
DECLARE
  comp_count INT;
BEGIN
  SELECT COUNT(*) INTO comp_count FROM competitions;
  IF comp_count = 2 THEN
    RAISE NOTICE '✅ Test 4 PASSED: Super admin can see all competitions';
  ELSE
    RAISE WARNING '❌ Test 4 FAILED: Expected 2 competitions, got %', comp_count;
  END IF;
END $$;

-- =====================================================
-- 6. 清理测试数据
-- =====================================================

SELECT clear_tenant_context();

DELETE FROM scores WHERE competition_id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
DELETE FROM participants WHERE competition_id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
DELETE FROM announcements WHERE competition_id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
DELETE FROM competitions WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
DELETE FROM user_tenants WHERE user_id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc');
DELETE FROM users WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc');
DELETE FROM tenants WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

-- =====================================================
-- 7. 验证完成
-- =====================================================

SELECT 'All RLS tests completed!' AS result;
