import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import crypto from 'crypto';
import { decryptText } from '../../../crypto';

function timingSafeEqual(a, b) {
  try {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { token, secret } = req.body || {};
  if (!token) return res.status(400).json({ error: 'token required' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
  const userAgent = req.headers['user-agent'] || null;

  const { data: t } = await supabaseAdmin.from('share_tokens').select('*').eq('token', token).single().maybeSingle();
  if (!t) {
    return res.status(404).json({ error: 'not found' });
  }
  if (t.revoked || new Date(t.expires_at) < new Date()) {
    return res.status(410).json({ error: 'expired' });
  }
  if (t.require_secret) {
    if (!secret) {
      await supabaseAdmin.from('share_access_logs').insert([{ share_token_id: t.id, ip_address: ip, success: false }]);
      return res.status(401).json({ error: 'secret required' });
    }
    const salt = Buffer.from(t.secret_key_salt, 'base64');
    const hash = crypto.scryptSync(secret, salt, 32).toString('base64');
    const ok = timingSafeEqual(hash, t.secret_key_hash);
    if (!ok) {
      await supabaseAdmin.from('share_access_logs').insert([{ share_token_id: t.id, ip_address: ip, success: false }]);
      return res.status(403).json({ error: 'invalid secret' });
    }
  }

  const { data: cred } = await supabaseAdmin.from('credentials').select('*').eq('id', t.credential_id).single().maybeSingle();
  if (!cred) return res.status(404).json({ error: 'credential missing' });

  // Fetch tool for context
  const { data: tool } = await supabaseAdmin.from('tools').select('name, url').eq('id', cred.tool_id).single().maybeSingle();

  // increment view count & revoke if one_time
  await supabaseAdmin.from('share_tokens').update({ views: (t.views || 0) + 1, revoked: t.one_time ? true : t.revoked }).eq('id', t.id);
  await supabaseAdmin.from('share_access_logs').insert([{ share_token_id: t.id, ip_address: ip, success: true }]);

  const username = await decryptText(cred.encrypted_username);
  const password = await decryptText(cred.encrypted_password);
  return res.json({ ok: true, label: cred.label, username, password, toolName: tool?.name || null, toolUrl: tool?.url || null });
}


