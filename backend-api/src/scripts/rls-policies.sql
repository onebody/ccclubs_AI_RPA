-- =====================================================
-- QiYun AI System - Row Level Security (RLS) Policies
-- PostgreSQL Multi-Tenant Data Isolation
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. TENANTS TABLE - RLS Policies
-- =====================================================

-- Enable RLS on tenants table
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Policy: Super admins can see all tenants
CREATE POLICY tenants_super_admin_policy ON tenants
  FOR ALL
  TO authenticated
  USING (
    current_setting('app.current_user_role', true) = 'super_admin'
  );

-- Policy: Users can only see their own tenant(s)
CREATE POLICY tenants_user_policy ON tenants
  FOR SELECT
  TO authenticated
  USING (
    id::text = current_setting('app.current_tenant_id', true)
    OR EXISTS (
      SELECT 1 FROM user_tenants ut
      WHERE ut.tenant_id = tenants.id
      AND ut.user_id::text = current_setting('app.current_user_id', true)
    )
  );

-- =====================================================
-- 2. COMPETITIONS TABLE - RLS Policies
-- =====================================================

ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see competitions in their tenant
CREATE POLICY competitions_tenant_policy ON competitions
  FOR ALL
  TO authenticated
  USING (
    tenant_id::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.current_user_role', true) = 'super_admin'
  );

-- =====================================================
-- 3. PARTICIPANTS TABLE - RLS Policies
-- =====================================================

ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see participants in their tenant's competitions
CREATE POLICY participants_tenant_policy ON participants
  FOR ALL
  TO authenticated
  USING (
    competition_id IN (
      SELECT c.id FROM competitions c
      WHERE c.tenant_id::text = current_setting('app.current_tenant_id', true)
    )
    OR current_setting('app.current_user_role', true) = 'super_admin'
  );

-- =====================================================
-- 4. SCORES TABLE - RLS Policies
-- =====================================================

ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see scores in their tenant's competitions
CREATE POLICY scores_tenant_policy ON scores
  FOR ALL
  TO authenticated
  USING (
    competition_id IN (
      SELECT c.id FROM competitions c
      WHERE c.tenant_id::text = current_setting('app.current_tenant_id', true)
    )
    OR current_setting('app.current_user_role', true) = 'super_admin'
  );

-- =====================================================
-- 5. ANNOUNCEMENTS TABLE - RLS Policies
-- =====================================================

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see announcements in their tenant's competitions
CREATE POLICY announcements_tenant_policy ON announcements
  FOR ALL
  TO authenticated
  USING (
    competition_id IN (
      SELECT c.id FROM competitions c
      WHERE c.tenant_id::text = current_setting('app.current_tenant_id', true)
    )
    OR current_setting('app.current_user_role', true) = 'super_admin'
  );

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Function to set tenant context
CREATE OR REPLACE FUNCTION set_tenant_context(
  tenant_id TEXT,
  user_id TEXT,
  user_role TEXT
) RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_id, false);
  PERFORM set_config('app.current_user_id', user_id, false);
  PERFORM set_config('app.current_user_role', user_role, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear tenant context
CREATE OR REPLACE FUNCTION clear_tenant_context() RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', '', false);
  PERFORM set_config('app.current_user_id', '', false);
  PERFORM set_config('app.current_user_role', '', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. INDEXES FOR PERFORMANCE
-- =====================================================

-- Tenants
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_is_active ON tenants(is_active);

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- UserTenants
CREATE INDEX IF NOT EXISTS idx_user_tenants_user_id ON user_tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant_id ON user_tenants(tenant_id);

-- Competitions
CREATE INDEX IF NOT EXISTS idx_competitions_tenant_id ON competitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_competitions_status ON competitions(status);
CREATE INDEX IF NOT EXISTS idx_competitions_start_date ON competitions(start_date);

-- Participants
CREATE INDEX IF NOT EXISTS idx_participants_competition_id ON participants(competition_id);
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_status ON participants(status);

-- Scores
CREATE INDEX IF NOT EXISTS idx_scores_competition_id ON scores(competition_id);
CREATE INDEX IF NOT EXISTS idx_scores_participant_id ON scores(participant_id);
CREATE INDEX IF NOT EXISTS idx_scores_judge_id ON scores(judge_id);
CREATE INDEX IF NOT EXISTS idx_scores_is_published ON scores(is_published);

-- Announcements
CREATE INDEX IF NOT EXISTS idx_announcements_competition_id ON announcements(competition_id);
CREATE INDEX IF NOT EXISTS idx_announcements_is_active ON announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_published_at ON announcements(published_at);

-- =====================================================
-- 8. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE tenants IS 'Multi-tenant isolation root - each tenant represents a separate organization';
COMMENT ON TABLE competitions IS 'Row Level Security applied - users can only access competitions in their tenant';
COMMENT ON TABLE participants IS 'Row Level Security applied - users can only access participants in their tenant competitions';
COMMENT ON TABLE scores IS 'Row Level Security applied - users can only access scores in their tenant competitions';
COMMENT ON TABLE announcements IS 'Row Level Security applied - users can only access announcements in their tenant competitions';

-- =====================================================
-- END OF RLS POLICIES
-- =====================================================
