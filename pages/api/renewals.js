// Called by a scheduled job to email owners about upcoming renewals
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import sendgrid from '@sendgrid/mail';
sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
  const daysAhead = parseInt(req.body.days || '7', 10);

  const { data: tools } = await supabaseAdmin
    .from('tools')
    .select('id, name, owner_id, renewal_date, spend_amount, spend_cycle')
    .gte('renewal_date', new Date().toISOString().slice(0,10))
    .lte('renewal_date', new Date(Date.now() + daysAhead*24*3600*1000).toISOString().slice(0,10));

  for (const t of tools || []) {
    // fetch owner email
    const { data: owner } = await supabaseAdmin.from('users').select('email').eq('id', t.owner_id).single().maybeSingle();
    if (!owner?.email) continue;
    const msg = {
      to: owner.email,
      from: process.env.SENDGRID_FROM,
      subject: `Renewal reminder: ${t.name}`,
      text: `${t.name} renews on ${t.renewal_date}. Cost: ${t.spend_amount} (${t.spend_cycle}).`,
    };
    try { await sendgrid.send(msg);} catch(e){ console.error('send fail', e?.response?.body || e); }
  }
  return res.json({ ok: true, count: (tools || []).length });
}
