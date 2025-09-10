import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';

export default function Home() {
  const [email, setEmail] = useState('');
  const router = useRouter();

  async function signIn(e){
    e.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) return alert(error.message);
    alert('Check email for magic link. After you sign in, come back and open /dashboard');
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-center mb-8">Startup Vault</h1>
        <p className="text-center text-gray-600 mb-6">
          Secure password and credential management for your startup
        </p>
        
        <form onSubmit={signIn} className="space-y-4">
          <input 
            type="email"
            placeholder="your@company.com" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button 
            type="submit" 
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Send Magic Link
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            After login, you'll be redirected to your dashboard
          </p>
        </div>
        
        <div className="mt-4 text-center">
          <a href="/login" className="text-blue-600 hover:underline">Or sign in with password</a>
        </div>
      </div>
    </Layout>
  );
}
