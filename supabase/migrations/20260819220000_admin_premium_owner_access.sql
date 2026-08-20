-- Ensure the project owner can test every premium/admin feature.
-- This is intentionally limited to the known owner email.

INSERT INTO admin_users (user_id, email, role)
SELECT id, email, 'super_admin'
FROM auth.users
WHERE lower(email) = 'falcondaniel37@gmail.com'
ON CONFLICT (email) DO UPDATE
SET role = 'super_admin',
    user_id = EXCLUDED.user_id;

INSERT INTO premium_users (user_id, email, tier, source, expires_at)
SELECT id, email, 'premium_pro', 'admin_grant', NULL
FROM auth.users
WHERE lower(email) = 'falcondaniel37@gmail.com'
ON CONFLICT (user_id) DO UPDATE
SET tier = 'premium_pro',
    source = 'admin_grant',
    expires_at = NULL;

CREATE POLICY "Owner email can read admin users"
ON admin_users FOR SELECT
USING (lower(auth.jwt() ->> 'email') = 'falcondaniel37@gmail.com');

CREATE POLICY "Owner email can manage premium users"
ON premium_users FOR ALL
USING (lower(auth.jwt() ->> 'email') = 'falcondaniel37@gmail.com')
WITH CHECK (lower(auth.jwt() ->> 'email') = 'falcondaniel37@gmail.com');

CREATE POLICY "Owner email can manage invitation codes"
ON invitation_codes FOR ALL
USING (lower(auth.jwt() ->> 'email') = 'falcondaniel37@gmail.com')
WITH CHECK (lower(auth.jwt() ->> 'email') = 'falcondaniel37@gmail.com');

CREATE POLICY "Owner email can manage demo logos"
ON demo_logos FOR ALL
USING (lower(auth.jwt() ->> 'email') = 'falcondaniel37@gmail.com')
WITH CHECK (lower(auth.jwt() ->> 'email') = 'falcondaniel37@gmail.com');
