const SUPABASE_URL = "https://qjbhflpoelgusfhymipi.supabase.co";
const SUPABASE_ANON_KEY =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYmhmbHBvZWxndXNmaHltaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NzEzODMsImV4cCI6MjA4MDQ0NzM4M30.OUBE062cKr4p4KpKlZlWIYCmqCBpXK43tQq9m-laDfg";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);