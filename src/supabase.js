/**
 * supabase.js - Supabase Client Initialization
 * 
 * This file initializes and exports the Supabase client used throughout the app.
 * Supabase provides:
 * - PostgreSQL database for task storage
 * - Authentication (email/password, password reset)
 * - Real-time subscriptions for live updates
 * 
 * Environment variables required:
 * - VITE_SUPABASE_URL: Project URL from Supabase dashboard
 * - VITE_SUPABASE_ANON_KEY: Public anonymous key for client-side auth
 * 
 * These must be set in:
 * - .env file (local development)
 * - Vercel Settings > Environment Variables (production)
 */

import { createClient } from "@supabase/supabase-js";

// Read environment variables injected by Vite during build
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate that required environment variables are set
// Throw error early if missing to avoid runtime failures
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

/**
 * supabase - Configured Supabase client
 * 
 * Usage examples:
 * - supabase.auth.signUp() - Create new user account
 * - supabase.auth.signInWithPassword() - Login
 * - supabase.auth.signOut() - Logout
 * - supabase.from('tasks').select() - Fetch tasks
 * - supabase.from('tasks').insert() - Create task
 * - supabase.channel('tasks').subscribe() - Real-time updates
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);



