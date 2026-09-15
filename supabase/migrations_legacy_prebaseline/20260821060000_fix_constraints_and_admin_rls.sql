-- 1. Fix the check constraint on profiles.button_style to support premium layout styles
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_button_style_check;

ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_button_style_check 
  CHECK (button_style IN (
    'solid', 'outline', 'soft', 'pill', 'minimal', 'line', 'card',
    'premium_image_right', 'premium_image_left', 'premium_detail_arrow', 
    'premium_classic_card', 'premium_minimal_badge'
  ));

-- 2. Fix infinite recursion loop in admin_users RLS policies
-- Create a security definer helper function to check super admin status safely bypassing RLS
CREATE OR REPLACE FUNCTION public.check_is_super_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = p_user_id AND role = 'super_admin'
  );
END;
$$;

-- Drop the old self-referential recursive policy
DROP POLICY IF EXISTS "Super admin can read all admin users" ON public.admin_users;

-- Recreate SELECT policy using the helper function and allowing users to check their own status
CREATE POLICY "Super admin can read all admin users"
ON public.admin_users FOR SELECT
USING (
  public.check_is_super_admin(auth.uid()) OR user_id = auth.uid()
);

-- Recreate INSERT policy to prevent recursion
DROP POLICY IF EXISTS "Super admin can insert admin users" ON public.admin_users;
CREATE POLICY "Super admin can insert admin users"
ON public.admin_users FOR INSERT
WITH CHECK (
  public.check_is_super_admin(auth.uid())
);
