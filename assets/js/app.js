// ============================================================
//  KONSELERIN — SUPABASE CLIENT
//  File: assets/js/supabase-client.js
//  Taruh di semua halaman SEBELUM script lainnya:
//  <script src="../assets/js/supabase-client.js"></script>
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL  = 'https://bsurzilwkafbqibrumcf.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzdXJ6aWx3a2FmYnFpYnJ1bWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjIxNzUsImV4cCI6MjA5NTI5ODE3NX0.47jGgbsAMq60QaGMgMbW8RqapeIImePH9ditsdNLFHs'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)
