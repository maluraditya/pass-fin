// POST: create a share token for a credential (requires Authorization)
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { customAlphabet } from 'nanoid';
import crypto from 'crypto';
const nano = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);

export default async function handler(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Missing token' });

  const { data: userResp } = await supabaseAdmin.auth.getUser(token);
  const user = userResp?.user;
  if (!user) return res.status(401).json({ error: 'Invalid token' });

  if (req.method !== 'POST') return res.status(405).end();
  const { credential_id, expires_in_hours = 24, max_views = 1, one_time = true, require_secret = false } = req.body;
  if (!credential_id) return res.status(400).json({ error: 'credential_id required' });

  // You might add access checks here (owner or created_by)
  const tokenStr = nano();
  const expires_at = new Date(Date.now() + expires_in_hours * 3600 * 1000).toISOString();

  let secretPlain = null;
  let secret_key_salt = null;
  let secret_key_hash = null;
  if (require_secret) {
    // generate a human-friendly 10-char secret
    secretPlain = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', 10)();
    const salt = crypto.randomBytes(16);
    const hash = crypto.scryptSync(secretPlain, salt, 32);
    secret_key_salt = salt.toString('base64');
    secret_key_hash = hash.toString('base64');
  }

  const { data, error } = await supabaseAdmin
    .from('share_tokens')
    .insert([{
      token: tokenStr,
      credential_id,
      created_by: user.id,
      expires_at,
      max_views,
      one_time,
      revoked: false,
      require_secret,
      secret_key_salt,
      secret_key_hash
    }]).select().single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ share: { token: data.token, expires_at: data.expires_at, require_secret }, secret: require_secret ? secretPlain : null });
}
