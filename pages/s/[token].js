import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { useState } from 'react';

export async function getServerSideProps(ctx) {
  const { token } = ctx.params;
  const { data: tokenRow } = await supabaseAdmin.from('share_tokens').select('*').eq('token', token).single().maybeSingle();
  if (!tokenRow || tokenRow.revoked) return { notFound: true };
  if (new Date(tokenRow.expires_at) < new Date()) return { props: { expired: true } };
  return { props: { tokenMeta: tokenRow, expired: false } };
}

export default function Page({ tokenMeta, expired }) {
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  if (expired) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Link Expired</h1>
          <p className="text-gray-600">This sharing link has expired and is no longer valid.</p>
        </div>
      </div>
    );
  }

  async function resolve() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/share/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenMeta.token, secret: tokenMeta.require_secret ? secret : undefined })
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || 'Unable to resolve');
      setData(j);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        {!data ? (
          <>
            <h1 className="text-2xl font-bold mb-6 text-center">Access Shared Credential</h1>
            {tokenMeta.require_secret ? (
              <div className="space-y-4">
                <p className="text-gray-600 text-sm">This link requires a secret to view. Enter the secret provided by the sender.</p>
                <input 
                  type="password"
                  placeholder="Enter secret"
                  value={secret}
                  onChange={e=>setSecret(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {error && <div className="text-red-600 text-sm">{error}</div>}
                <button 
                  onClick={resolve}
                  disabled={loading || (tokenMeta.require_secret && !secret)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Verifying…' : 'View'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600 text-sm">Click below to reveal credential.</p>
                {error && <div className="text-red-600 text-sm">{error}</div>}
                <button 
                  onClick={resolve}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Loading…' : 'Reveal'}
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-1 text-center">{data.label}</h1>
            {(data.toolName || data.toolUrl) && (
              <p className="text-center text-gray-600 mb-6">
                {data.toolName ? <span className="font-medium">{data.toolName}</span> : null}
                {data.toolName && data.toolUrl ? ' · ' : null}
                {data.toolUrl ? <a className="text-blue-600 hover:underline" href={data.toolUrl} target="_blank" rel="noreferrer">{data.toolUrl}</a> : null}
              </p>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <div className="bg-gray-50 border border-gray-300 rounded-md p-3 font-mono text-sm">
                  {data.username}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="bg-gray-50 border border-gray-300 rounded-md p-3 font-mono text-sm">
                  {data.password}
                </div>
              </div>
            </div>
          </>
        )}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">This link was generated via Startup Vault</p>
        </div>
      </div>
    </div>
  );
}
