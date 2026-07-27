-- Fixes "infinite recursion detected in policy for relation certified_framers".
--
-- The policies in 001 checked admin status with a subquery against
-- certified_framers from inside certified_framers' own policies, which
-- recurses forever. These helpers are SECURITY DEFINER, so they run as the
-- function owner and bypass RLS on that lookup, breaking the cycle.
--
-- This migration also tightens resources: 001 let ANYONE (including signed-out
-- visitors) read published resources, which defeats the point of a gated portal.

CREATE OR REPLACE FUNCTION public.is_portal_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.certified_framers
    WHERE email = (auth.jwt() ->> 'email') AND is_admin = true
  );
$$;

CREATE OR REPLACE FUNCTION public.current_framer_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id FROM public.certified_framers
  WHERE email = (auth.jwt() ->> 'email')
  LIMIT 1;
$$;

-- certified_framers
DROP POLICY IF EXISTS "Users can view their own profile" ON certified_framers;
DROP POLICY IF EXISTS "Admins can view all framers" ON certified_framers;
DROP POLICY IF EXISTS "Admins can manage framers" ON certified_framers;

CREATE POLICY "Framer reads own row, admin reads all"
  ON certified_framers FOR SELECT
  TO authenticated
  USING (email = (auth.jwt() ->> 'email') OR public.is_portal_admin());

CREATE POLICY "Admins manage framers"
  ON certified_framers FOR ALL
  TO authenticated
  USING (public.is_portal_admin())
  WITH CHECK (public.is_portal_admin());

-- resources: certified framers only
DROP POLICY IF EXISTS "Anyone can view published resources" ON resources;
DROP POLICY IF EXISTS "Admins can view all resources" ON resources;
DROP POLICY IF EXISTS "Admins can manage resources" ON resources;

CREATE POLICY "Certified framers view published resources"
  ON resources FOR SELECT
  TO authenticated
  USING (
    (is_published = true AND public.current_framer_id() IS NOT NULL)
    OR public.is_portal_admin()
  );

CREATE POLICY "Admins manage resources"
  ON resources FOR ALL
  TO authenticated
  USING (public.is_portal_admin())
  WITH CHECK (public.is_portal_admin());

-- access logs
DROP POLICY IF EXISTS "Admins can view access logs" ON resource_access_logs;
DROP POLICY IF EXISTS "Framers can log their own access" ON resource_access_logs;

CREATE POLICY "Admins view access logs"
  ON resource_access_logs FOR SELECT
  TO authenticated
  USING (public.is_portal_admin());

CREATE POLICY "Framers log own access"
  ON resource_access_logs FOR INSERT
  TO authenticated
  WITH CHECK (framer_id = public.current_framer_id());

-- ghl sync log
DROP POLICY IF EXISTS "Admins can view GHL sync logs" ON ghl_sync_log;

CREATE POLICY "Admins view GHL sync logs"
  ON ghl_sync_log FOR SELECT
  TO authenticated
  USING (public.is_portal_admin());
