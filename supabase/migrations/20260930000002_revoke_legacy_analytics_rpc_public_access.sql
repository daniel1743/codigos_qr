-- CRIPQER — retire public access to obsolete analytics RPCs
--
-- The production routes use track_child_page_event or
-- track_analytics_event. Keep the legacy functions available for controlled
-- service-role compatibility, but stop anonymous/authenticated execution so a
-- client cannot choose the profile identity recorded by those functions.

REVOKE EXECUTE ON FUNCTION public.track_page_view(
  uuid,
  text,
  text,
  numeric,
  numeric,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.track_link_click(
  uuid,
  uuid,
  text,
  text,
  numeric,
  numeric,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) FROM anon, authenticated;
