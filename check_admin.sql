-- Verificar si el usuario es admin
SELECT 
  p.email,
  p.display_name,
  au.user_id IS NOT NULL as is_admin,
  pu.tier as premium_tier
FROM profiles p
LEFT JOIN admin_users au ON p.user_id = au.user_id
LEFT JOIN premium_users pu ON p.user_id = pu.user_id
WHERE p.email = 'falcondaniel37@gmail.com';
