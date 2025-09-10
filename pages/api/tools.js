import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Missing token' });

  const { data: userResp } = await supabaseAdmin.auth.getUser(token);
  const user = userResp?.user;
  if (!user) return res.status(401).json({ error: 'Invalid token' });

  if (req.method === 'PUT') {
    const { id, name, url, spend_amount } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id required' });
    const { data: tool } = await supabaseAdmin.from('tools').select('owner_id').eq('id', id).single().maybeSingle();
    if (!tool) return res.status(404).json({ error: 'Not found' });
    if (tool.owner_id !== user.id) return res.status(403).json({ error: 'No access' });
    const { error } = await supabaseAdmin.from('tools').update({ name, url, spend_amount }).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const id = req.query.id || req.body?.id;
    if (!id) return res.status(400).json({ error: 'id required' });
    const { data: tool } = await supabaseAdmin.from('tools').select('owner_id').eq('id', id).single().maybeSingle();
    if (!tool) return res.status(404).json({ error: 'Not found' });
    if (tool.owner_id !== user.id) return res.status(403).json({ error: 'No access' });
    const { error } = await supabaseAdmin.from('tools').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  return res.status(405).end();
}


