import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://foninekcwwkepyqtwwtk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_BOnnRZFv04ME31Joh8zWaw_GSaf6i2g';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
