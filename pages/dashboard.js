import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Layout from '../components/Layout';
import AuthGuard from '../components/AuthGuard';

export default function Dashboard(){
  const [tools, setTools] = useState([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [cost, setCost] = useState('');
  const [billing, setBilling] = useState('monthly'); // 'monthly' | 'yearly'
  const [loading, setLoading] = useState(false);
  const totalMonthly = tools.reduce((sum, t) => sum + Number(t.spend_amount || 0), 0);
  const totalYearly = totalMonthly * 12;

  useEffect(() => { fetchTools(); }, []);

  async function fetchTools(){
    const { data } = await supabase.from('tools').select('*').order('created_at', {ascending: false});
    setTools(data || []);
  }

  async function addTool(e){
    e.preventDefault();
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    // Normalize yearly to monthly when storing
    const normalizedCost = billing === 'yearly' ? (Number(cost || 0) / 12) : Number(cost || 0);
    const { error } = await supabase.from('tools').insert([{ 
      name, 
      url, 
      spend_amount: normalizedCost,
      owner_id: user.id 
    }]);
    
    if (error) {
      alert(error.message);
    } else {
      setName(''); 
      setUrl(''); 
      setCost('');
      fetchTools();
    }
    
    setLoading(false);
  }

  return (
    <AuthGuard>
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end justify-between mb-8">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <div className="text-right">
              <div className="text-sm text-gray-500">Total Monthly Spend</div>
              <div className="text-2xl font-semibold">${totalMonthly.toFixed(2)}</div>
              <div className="text-sm text-gray-500 mt-1">Total Yearly Spend</div>
              <div className="text-lg font-medium">${totalYearly.toFixed(2)}</div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Add New Tool</h2>
            <form onSubmit={addTool} className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <input 
                placeholder="Tool Name" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input 
                placeholder="URL" 
                value={url} 
                onChange={e => setUrl(e.target.value)} 
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input 
                placeholder="Monthly cost ($)" 
                value={cost} 
                onChange={e => setCost(e.target.value)} 
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                type="number"
                step="0.01"
              />
              <select
                value={billing}
                onChange={e=>setBilling(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
              <button 
                type="submit" 
                disabled={loading}
                className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Tool'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Your Tools</h2>
            {tools.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No tools added yet. Add your first tool above!</p>
            ) : (
              <div className="space-y-4">
                {tools.map(t => (
                  <div key={t.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{t.name}</h3>
                        <p className="text-gray-600">{t.url}</p>
                        <p className="text-green-600 font-medium">${t.spend_amount || 0}/month</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <a 
                          href={`/tool/${t.id}`}
                          className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          Manage
                        </a>
                        <button
                          className="px-3 py-2 border rounded hover:bg-gray-50"
                          onClick={async()=>{
                            const name = prompt('Edit name', t.name);
                            if (name == null) return;
                            const url = prompt('Edit URL', t.url || '');
                            if (url == null) return;
                            const cost = prompt('Edit monthly cost', String(t.spend_amount || 0));
                            if (cost == null) return;
                            const token = (await supabase.auth.getSession()).data?.session?.access_token;
                            const res = await fetch('/api/tools', { method:'PUT', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify({ id: t.id, name, url, spend_amount: Number(cost) }) });
                            const j = await res.json();
                            if (!res.ok) return alert(j.error || 'Update failed');
                            fetchTools();
                          }}
                        >Edit</button>
                        <button
                          className="px-3 py-2 border rounded text-red-600 hover:bg-red-50"
                          onClick={async()=>{
                            if (!confirm('Delete this tool?')) return;
                            const token = (await supabase.auth.getSession()).data?.session?.access_token;
                            const res = await fetch(`/api/tools?id=${t.id}`, { method:'DELETE', headers:{ Authorization:`Bearer ${token}` } });
                            const j = await res.json();
                            if (!res.ok) return alert(j.error || 'Delete failed');
                            fetchTools();
                          }}
                        >Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
