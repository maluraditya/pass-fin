import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  // Safety: disable in production
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not available in production' });
  }

  if (req.method !== 'POST') return res.status(405).end();

  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  try {
    // Try to create a confirmed user (no email confirmation required)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ ok: true, user: data.user });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'internal error' });
  }
}


