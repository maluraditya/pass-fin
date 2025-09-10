import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';

export default function Layout({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div style={{padding: 20, textAlign: 'center'}}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{minHeight: '100vh', backgroundColor: '#f5f5f5'}}>
      <nav style={{
        backgroundColor: '#fff',
        padding: '1rem 2rem',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <a href="/" style={{textDecoration: 'none', color: '#333', fontSize: '1.5rem', fontWeight: 'bold'}}>
            Startup Vault
          </a>
        </div>
        
        <div>
          {user ? (
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
              <span style={{color: '#666'}}>Welcome, {user.email}</span>
              <a href="/dashboard" style={{textDecoration: 'none', color: '#007bff'}}>Dashboard</a>
              <button 
                onClick={signOut}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div style={{display: 'flex', gap: '1rem'}}>
              <a href="/login" style={{textDecoration: 'none', color: '#007bff'}}>Login</a>
              <a href="/signup" style={{textDecoration: 'none', color: '#007bff'}}>Sign Up</a>
            </div>
          )}
        </div>
      </nav>
      
      <main style={{padding: '2rem'}}>
        {children}
      </main>
    </div>
  );
}
