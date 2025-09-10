// POST: create credential (requires Authorization: Bearer <access_token>)
// GET?tool_id=<uuid> : list credentials for a tool (requires token)
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { encryptText, decryptText } from '../../crypto';

export default async function handler(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Missing token' });

  const { data: userResp, error: userErr } = await supabaseAdmin.auth.getUser(token);
  const user = userResp?.user;
  if (userErr || !user) return res.status(401).json({ error: 'Invalid token' });

  if (req.method === 'POST') {
    const { tool_id, label, username, password } = req.body;
    if (!tool_id || !username || !password) return res.status(400).json({ error: 'Missing fields' });

    // check owner or explicit access
    const { data: tool } = await supabaseAdmin.from('tools').select('owner_id').eq('id', tool_id).single();
    const { data: access } = await supabaseAdmin.from('user_access').select('*').eq('tool_id', tool_id).eq('user_id', user.id).maybeSingle();

    if (!tool) return res.status(404).json({ error: 'Tool not found' });
    if (tool.owner_id !== user.id && !access) return res.status(403).json({ error: 'No access' });

    const eUser = await encryptText(username);
    const ePass = await encryptText(password);
    const { data, error } = await supabaseAdmin
      .from('credentials')
      .insert([{ tool_id, label, encrypted_username: eUser, encrypted_password: ePass, created_by: user.id }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ credential: data });
  }

  if (req.method === 'PUT') {
    const { id, label, username, password } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id required' });
    // Fetch cred to get tool_id and check access
    const { data: cred } = await supabaseAdmin.from('credentials').select('id, tool_id').eq('id', id).single().maybeSingle();
    if (!cred) return res.status(404).json({ error: 'Not found' });
    const { data: tool } = await supabaseAdmin.from('tools').select('owner_id').eq('id', cred.tool_id).single();
    const { data: access } = await supabaseAdmin.from('user_access').select('*').eq('tool_id', cred.tool_id).eq('user_id', user.id).maybeSingle();
    if (!tool) return res.status(404).json({ error: 'Tool not found' });
    if (tool.owner_id !== user.id && !access) return res.status(403).json({ error: 'No access' });

    const update = { label };
    if (typeof username === 'string') update.encrypted_username = await encryptText(username);
    if (typeof password === 'string') update.encrypted_password = await encryptText(password);
    const { error } = await supabaseAdmin.from('credentials').update(update).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const id = req.query.id || req.body?.id;
    if (!id) return res.status(400).json({ error: 'id required' });
    const { data: cred } = await supabaseAdmin.from('credentials').select('id, tool_id').eq('id', id).single().maybeSingle();
    if (!cred) return res.status(404).json({ error: 'Not found' });
    const { data: tool } = await supabaseAdmin.from('tools').select('owner_id').eq('id', cred.tool_id).single();
    const { data: access } = await supabaseAdmin.from('user_access').select('*').eq('tool_id', cred.tool_id).eq('user_id', user.id).maybeSingle();
    if (!tool) return res.status(404).json({ error: 'Tool not found' });
    if (tool.owner_id !== user.id && !access) return res.status(403).json({ error: 'No access' });
    const { error } = await supabaseAdmin.from('credentials').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  if (req.method === 'GET') {
    const tool_id = req.query.tool_id;
    if (!tool_id) return res.status(400).json({ error: 'tool_id required' });

    // check access
    const { data: tool } = await supabaseAdmin.from('tools').select('owner_id').eq('id', tool_id).single();
    const { data: access } = await supabaseAdmin.from('user_access').select('*').eq('tool_id', tool_id).eq('user_id', user.id).maybeSingle();

    if (!tool) return res.status(404).json({ error: 'Tool not found' });
    if (tool.owner_id !== user.id && !access) return res.status(403).json({ error: 'No access' });

    const { data } = await supabaseAdmin.from('credentials').select('*').eq('tool_id', tool_id);
    const out = await Promise.all((data || []).map(async r => ({
      id: r.id,
      label: r.label,
      username: await decryptText(r.encrypted_username),
      password: await decryptText(r.encrypted_password),
      created_at: r.created_at
    })));
    return res.json({ credentials: out });
  }

  res.status(405).end();
}
