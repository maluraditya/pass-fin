import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function signUp(e) {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    const normalizedEmail = (email || '').trim().toLowerCase();
    
    // Dev-only path: attempt server-admin signup to auto-confirm
    const adminRes = await fetch('/api/dev-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, password })
    });
    const adminJson = await adminRes.json();
    if (!adminRes.ok) {
      console.warn('Admin signup failed (falling back to client signup):', adminJson?.error);
    }

    // Fallback: client signup in case admin route is disabled
    const { data, error } = await supabase.auth.signUp({ email: normalizedEmail, password });
    
    if (error) {
      console.error('Signup error:', error);
      alert(error.message);
    } else {
      // If confirmations are disabled, session is present; otherwise try direct sign-in
      // Try sign-in (retry once in case of propagation delay)
      let { error: signInError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (signInError) {
        await new Promise(r => setTimeout(r, 500));
        ({ error: signInError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password }));
      }
      if (signInError) {
        alert(signInError.message);
        router.push('/login');
      } else {
        // After sign-in, upsert profile
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        const userEmail = sessionData?.session?.user?.email;
        if (userId) {
          await supabase.from('profiles').upsert(
            {
              id: userId,
              email: userEmail,
              full_name: fullName || null,
              updated_at: new Date().toISOString()
            },
            { onConflict: 'id' }
          );
        }
        router.push('/dashboard');
      }
    }
    
    setLoading(false);
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-center mb-8">Sign up for Startup Vault</h1>
        
        <form onSubmit={signUp} className="space-y-4">
          <input 
            type="text"
            placeholder="Full name (optional)" 
            value={fullName} 
            onChange={e => setFullName(e.target.value)} 
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input 
            type="email"
            placeholder="your@company.com" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input 
            type="password"
            placeholder="Password (min 6 characters)" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input 
            type="password"
            placeholder="Confirm Password" 
            value={confirmPassword} 
            onChange={e => setConfirmPassword(e.target.value)} 
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center mt-6">
          Already have an account? <a href="/login" className="text-blue-600 hover:underline">Sign in</a>
        </p>
      </div>
    </Layout>
  );
}
