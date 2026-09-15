-- Create analytics table for detailed QR tracking
-- Tracks views, link clicks, geolocation, device info

CREATE TABLE IF NOT EXISTS qr_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Event data
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'link_click')),
  link_id UUID REFERENCES profile_links(id) ON DELETE SET NULL,

  -- Geolocation (approximate, IP-based)
  country TEXT,
  city TEXT,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),

  -- Technical context
  user_agent TEXT,
  device_type TEXT CHECK (device_type IN ('mobile', 'desktop', 'tablet', 'unknown')),
  browser TEXT,
  os TEXT,

  -- Temporal
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Additional metadata
  referrer TEXT,
  session_id TEXT, -- For grouping clicks from same session
  ip_hash TEXT -- Hashed IP for privacy
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_qr_analytics_profile_id ON qr_analytics(profile_id);
CREATE INDEX IF NOT EXISTS idx_qr_analytics_created_at ON qr_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qr_analytics_event_type ON qr_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_qr_analytics_profile_event ON qr_analytics(profile_id, event_type);
CREATE INDEX IF NOT EXISTS idx_qr_analytics_session_id ON qr_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_qr_analytics_link_id ON qr_analytics(link_id) WHERE link_id IS NOT NULL;

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_qr_analytics_profile_date ON qr_analytics(profile_id, created_at DESC);

-- RLS Policies
ALTER TABLE qr_analytics ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own analytics
CREATE POLICY "Users can read their own analytics"
ON qr_analytics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = qr_analytics.profile_id
    AND profiles.user_id = auth.uid()
  )
);

-- Policy: System can insert analytics (public access for tracking)
CREATE POLICY "Anyone can insert analytics"
ON qr_analytics FOR INSERT
WITH CHECK (true); -- Tracking es público, RPC manejará validación

-- Policy: Admin can read all analytics
CREATE POLICY "Admin can read all analytics"
ON qr_analytics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = auth.uid()
    AND admin_users.role IN ('admin', 'super_admin')
  )
);

-- Function to track page view
CREATE OR REPLACE FUNCTION track_page_view(
  p_profile_id UUID,
  p_country TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_latitude NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_device_type TEXT DEFAULT 'unknown',
  p_browser TEXT DEFAULT NULL,
  p_os TEXT DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_ip_hash TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_analytics_id UUID;
BEGIN
  INSERT INTO qr_analytics (
    profile_id,
    event_type,
    country,
    city,
    latitude,
    longitude,
    user_agent,
    device_type,
    browser,
    os,
    referrer,
    session_id,
    ip_hash
  )
  VALUES (
    p_profile_id,
    'view',
    p_country,
    p_city,
    p_latitude,
    p_longitude,
    p_user_agent,
    p_device_type,
    p_browser,
    p_os,
    p_referrer,
    p_session_id,
    p_ip_hash
  )
  RETURNING id INTO v_analytics_id;

  RETURN v_analytics_id;
END;
$$;

-- Function to track link click
CREATE OR REPLACE FUNCTION track_link_click(
  p_profile_id UUID,
  p_link_id UUID,
  p_country TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_latitude NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_device_type TEXT DEFAULT 'unknown',
  p_browser TEXT DEFAULT NULL,
  p_os TEXT DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_ip_hash TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_analytics_id UUID;
BEGIN
  INSERT INTO qr_analytics (
    profile_id,
    event_type,
    link_id,
    country,
    city,
    latitude,
    longitude,
    user_agent,
    device_type,
    browser,
    os,
    referrer,
    session_id,
    ip_hash
  )
  VALUES (
    p_profile_id,
    'link_click',
    p_link_id,
    p_country,
    p_city,
    p_latitude,
    p_longitude,
    p_user_agent,
    p_device_type,
    p_browser,
    p_os,
    p_referrer,
    p_session_id,
    p_ip_hash
  )
  RETURNING id INTO v_analytics_id;

  RETURN v_analytics_id;
END;
$$;

-- View for aggregated daily analytics
CREATE OR REPLACE VIEW qr_analytics_daily AS
SELECT
  profile_id,
  DATE(created_at) as date,
  event_type,
  COUNT(*) as count,
  COUNT(DISTINCT session_id) as unique_sessions,
  COUNT(DISTINCT ip_hash) as unique_visitors
FROM qr_analytics
GROUP BY profile_id, DATE(created_at), event_type;

-- View for top clicked links
CREATE OR REPLACE VIEW qr_top_links AS
SELECT
  qa.profile_id,
  qa.link_id,
  pl.label as link_label,
  pl.url as link_url,
  COUNT(*) as click_count,
  COUNT(DISTINCT qa.session_id) as unique_clicks
FROM qr_analytics qa
JOIN profile_links pl ON qa.link_id = pl.id
WHERE qa.event_type = 'link_click'
GROUP BY qa.profile_id, qa.link_id, pl.label, pl.url
ORDER BY click_count DESC;

-- Comments
COMMENT ON TABLE qr_analytics IS 'Detailed analytics for QR code tracking';
COMMENT ON COLUMN qr_analytics.event_type IS 'Type of event: view (page view) or link_click';
COMMENT ON COLUMN qr_analytics.session_id IS 'Session identifier to group events from same visit';
COMMENT ON COLUMN qr_analytics.ip_hash IS 'Hashed IP address for privacy-preserving unique visitor count';
COMMENT ON FUNCTION track_page_view IS 'Track a page view event with geolocation and device info';
COMMENT ON FUNCTION track_link_click IS 'Track a link click event with geolocation and device info';
