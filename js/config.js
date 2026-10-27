// Supabase project settings.
// Find both values in Supabase -> Project Settings -> API.
// The anon (public) key is safe to ship in the browser because Row Level Security
// (see supabase/schema.sql) restricts every user to their own rows.
// NEVER put the service_role key here.
window.APP_CONFIG = {
  SUPABASE_URL: "YOUR_SUPABASE_URL",
  SUPABASE_ANON_KEY: "sb_publishable_IHaf5HyFe6SQeZzMv5tCoA_xJgJTaMK"
};
