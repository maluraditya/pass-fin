import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Layout from '../../components/Layout';
import AuthGuard from '../../components/AuthGuard';

export default function ToolPage() {
  const router = useRouter();
  const { id } = router.query;
  const [creds, setCreds] = useState([]);
  const [label, setLabel] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [requireSecret, setRequireSecret] = useState(false);
  const [shareModal, setShareModal] = useState(null); // { url, secret }
  const [editCred, setEditCred] = useState(null); // { id, label, username, password }
  // For copied notification in modal
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  // For copied notification in credentials list (per credential)
  const [copiedCredId, setCopiedCredId] = useState(null);

  useEffect(() => { if (id) fetchCreds(); }, [id]);

  async function fetchCreds() {
    const token = (await supabase.auth.getSession()).data?.session?.access_token;
    const res = await fetch(`/api/credentials?tool_id=${id}`, { headers: { Authorization: `Bearer ${token}` } });
    const j = await res.json();
    setCreds(j.credentials || []);
  }

  async function addCred(e) {
    e.preventDefault();
    setLoading(true);

    const token = (await supabase.auth.getSession()).data?.session?.access_token;
    const res = await fetch('/api/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tool_id: id, label, username, password })
    });
    const j = await res.json();
    if (j.error) {
      alert(j.error);
    } else {
      setLabel('');
      setUsername('');
      setPassword('');
      fetchCreds();
    }

    setLoading(false);
  }

  async function createShare(credId) {
    const token = (await supabase.auth.getSession()).data?.session?.access_token;
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ credential_id: credId, expires_in_hours: 24, max_views: 1, one_time: true, require_secret: requireSecret })
    });
    const j = await res.json();
    if (j.share) {
      const link = `${location.origin}/s/${j.share.token}`;
      if (j.secret) {
        setShareModal({ url: link, secret: j.secret });
      } else {
        const copied = await copyToClipboard(link);
        if (!copied) prompt('Copy this link', link);
      }
    } else {
      alert(j.error || 'Error creating share link');
    }
  }

  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) {
      // continue to fallback
    }
    // Fallback: hidden textarea + execCommand
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      ta.style.left = '-1000px';
      ta.setAttribute('readonly', '');
      document.body.appendChild(ta);
      ta.select();
      const success = document.execCommand('copy');
      document.body.removeChild(ta);
      return success;
    } catch (e) {
      return false;
    }
  }

  return (
    <>
      <AuthGuard>
        <Layout>
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow mb-6 p-4 flex items-center gap-2">
              <input id="requireSecretTop" type="checkbox" checked={requireSecret} onChange={e => setRequireSecret(e.target.checked)} />
              <label htmlFor="requireSecretTop" className="text-sm text-gray-800">Require secret for new share links</label>
            </div>
            <div className="mb-6">
              <a href="/dashboard" className="text-blue-600 hover:underline">← Back to Dashboard</a>
            </div>

            <h1 className="text-3xl font-bold mb-8">Tool Management</h1>

            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Add New Credential</h2>
              <form onSubmit={addCred} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  placeholder="Label (e.g., Admin Account)"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  placeholder="Username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  type="password"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Credential'}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Credentials</h2>
                <div className="flex items-center gap-2">
                  <input id="requireSecret" type="checkbox" checked={requireSecret} onChange={e => setRequireSecret(e.target.checked)} />
                  <label htmlFor="requireSecret" className="text-sm text-gray-700">Require secret for new share links</label>
                </div>
              </div>
              {creds.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No credentials added yet. Add your first credential above!</p>
              ) : (
                <div className="space-y-4">
                  {creds.map(c => (
                    <div key={c.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg">{c.label}</h3>
                          <p className="text-gray-600">Username: {c.username}</p>
                          <p className="text-sm text-gray-500">Added: {new Date(c.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-2 items-center">
                          <button
                            onClick={() => setEditCred({ id: c.id, label: c.label, username: c.username, password: '' })}
                            className="px-3 py-2 border rounded hover:bg-gray-50"
                          >Edit</button>
                          <button
                            onClick={async () => {
                              if (!confirm('Delete this credential?')) return;
                              const token = (await supabase.auth.getSession()).data?.session?.access_token;
                              const res = await fetch(`/api/credentials?id=${c.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
                              const j = await res.json();
                              if (!res.ok) return alert(j.error || 'Delete failed');
                              fetchCreds();
                            }}
                            className="px-3 py-2 border rounded text-red-600 hover:bg-red-50"
                          >Delete</button>
                          {!requireSecret ? (
                            <>
                              <button
                                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                                onClick={async () => {
                                  // Copy link to clipboard and create share (without secret)
                                  const token = (await supabase.auth.getSession()).data?.session?.access_token;
                                  const res = await fetch('/api/share', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                    body: JSON.stringify({ credential_id: c.id, expires_in_hours: 24, max_views: 1, one_time: true, require_secret: false })
                                  });
                                  const j = await res.json();
                                  if (j.share) {
                                    const link = `${location.origin}/s/${j.share.token}`;
                                    await copyToClipboard(link);
                                    setCopiedCredId(c.id);
                                    setTimeout(() => setCopiedCredId(null), 1500);
                                  } else {
                                    alert(j.error || 'Error creating share link');
                                  }
                                }}
                              >
                                Copy
                              </button>
                              {copiedCredId === c.id && <span className="text-green-600 ml-2">✓ Copied!</span>}
                            </>
                          ) : (
                            <button
                              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                              onClick={() => createShare(c.id)}
                            >
                              Share
                            </button>
                          )}
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
      {shareModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4" onClick={() => setShareModal(null)}>
          <div className="w-full max-w-lg bg-white rounded-lg shadow p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-semibold mb-4">Share Created</h3>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-600 mb-1">URL</div>
                <div className="flex gap-2 items-center">
                  <input className="flex-1 px-3 py-2 border rounded" value={shareModal.url} readOnly />
                  <button
                    className="px-3 py-2 bg-gray-200 rounded"
                    onClick={async () => {
                      await copyToClipboard(shareModal.url);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 1500);
                    }}
                  >
                    Copy
                  </button>
                  {copiedLink && <span className="text-green-600 ml-2">✓ Copied!</span>}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Secret (share separately)</div>
                <div className="flex gap-2 items-center">
                  <input className="flex-1 px-3 py-2 border rounded" value={shareModal.secret} readOnly />
                  <button
                    className="px-3 py-2 bg-gray-200 rounded"
                    onClick={async () => {
                      await copyToClipboard(shareModal.secret);
                      setCopiedSecret(true);
                      setTimeout(() => setCopiedSecret(false), 1500);
                    }}
                  >
                    Copy
                  </button>
                  {copiedSecret && <span className="text-green-600 ml-2">✓ Copied!</span>}
                </div>
              </div>
            </div>
            <div className="mt-6 text-right">
              <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={() => setShareModal(null)}>Done</button>
            </div>
          </div>
        </div>
      )}
      {editCred && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditCred(null)}>
          <div className="w-full max-w-lg bg-white rounded-lg shadow p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-semibold mb-4">Edit Credential</h3>
            <div className="grid gap-3">
              <input className="px-3 py-2 border rounded" placeholder="Label" value={editCred.label} onChange={e => setEditCred({ ...editCred, label: e.target.value })} />
              <input className="px-3 py-2 border rounded" placeholder="Username" value={editCred.username} onChange={e => setEditCred({ ...editCred, username: e.target.value })} />
              <input className="px-3 py-2 border rounded" type="password" placeholder="Password (leave blank to keep)" value={editCred.password} onChange={e => setEditCred({ ...editCred, password: e.target.value })} />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button className="px-4 py-2 border rounded" onClick={() => setEditCred(null)}>Cancel</button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={async () => {
                const token = (await supabase.auth.getSession()).data?.session?.access_token;
                const body = { id: editCred.id, label: editCred.label };
                if (editCred.username) body.username = editCred.username;
                if (editCred.password) body.password = editCred.password;
                const res = await fetch('/api/credentials', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
                const j = await res.json();
                if (!res.ok) return alert(j.error || 'Update failed');
                setEditCred(null);
                fetchCreds();
              }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
