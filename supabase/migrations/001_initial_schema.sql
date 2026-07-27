-- Create certified_framers table
CREATE TABLE certified_framers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  ghl_contact_id TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create resources table
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('handout', 'guide', 'video', 'template', 'resource')),
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  google_drive_id TEXT,
  created_by UUID NOT NULL REFERENCES certified_framers(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_published BOOLEAN DEFAULT true
);

-- Create resource_access_logs table
CREATE TABLE resource_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framer_id UUID NOT NULL REFERENCES certified_framers(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('view', 'download')),
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create ghl_sync_log table
CREATE TABLE ghl_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ghl_contact_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  error_message TEXT
);

-- Create indexes for better query performance
CREATE INDEX idx_certified_framers_email ON certified_framers(email);
CREATE INDEX idx_certified_framers_ghl_id ON certified_framers(ghl_contact_id);
CREATE INDEX idx_resources_category ON resources(category);
CREATE INDEX idx_resources_created_by ON resources(created_by);
CREATE INDEX idx_resources_is_published ON resources(is_published);
CREATE INDEX idx_access_logs_framer ON resource_access_logs(framer_id);
CREATE INDEX idx_access_logs_resource ON resource_access_logs(resource_id);
CREATE INDEX idx_access_logs_accessed_at ON resource_access_logs(accessed_at);
CREATE INDEX idx_ghl_sync_contact_id ON ghl_sync_log(ghl_contact_id);

-- Enable RLS (Row Level Security)
ALTER TABLE certified_framers ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghl_sync_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for certified_framers
-- Users can only see their own profile
CREATE POLICY "Users can view their own profile"
  ON certified_framers FOR SELECT
  USING (auth.uid()::text = (SELECT id FROM certified_framers WHERE email = auth.jwt() ->> 'email')::text);

-- Admins can view all framers
CREATE POLICY "Admins can view all framers"
  ON certified_framers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM certified_framers WHERE is_admin = true AND email = auth.jwt() ->> 'email'
    )
  );

-- Admins can insert/update/delete framers
CREATE POLICY "Admins can manage framers"
  ON certified_framers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM certified_framers WHERE is_admin = true AND email = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM certified_framers WHERE is_admin = true AND email = auth.jwt() ->> 'email'
    )
  );

-- RLS Policies for resources
-- Anyone can view published resources
CREATE POLICY "Anyone can view published resources"
  ON resources FOR SELECT
  USING (is_published = true);

-- Admins can view all resources
CREATE POLICY "Admins can view all resources"
  ON resources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM certified_framers WHERE is_admin = true AND email = auth.jwt() ->> 'email'
    )
  );

-- Admins can insert/update/delete resources
CREATE POLICY "Admins can manage resources"
  ON resources FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM certified_framers WHERE is_admin = true AND email = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM certified_framers WHERE is_admin = true AND email = auth.jwt() ->> 'email'
    )
  );

-- RLS Policies for access_logs
-- Only admins can view logs
CREATE POLICY "Admins can view access logs"
  ON resource_access_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM certified_framers WHERE is_admin = true AND email = auth.jwt() ->> 'email'
    )
  );

-- Anyone can insert their own access log
CREATE POLICY "Framers can log their own access"
  ON resource_access_logs FOR INSERT
  WITH CHECK (
    framer_id = (SELECT id FROM certified_framers WHERE email = auth.jwt() ->> 'email')
  );

-- RLS Policies for ghl_sync_log
-- Only admins can view sync logs
CREATE POLICY "Admins can view GHL sync logs"
  ON ghl_sync_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM certified_framers WHERE is_admin = true AND email = auth.jwt() ->> 'email'
    )
  );
