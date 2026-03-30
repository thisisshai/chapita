import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login');
      } else {
        setUser(session.user);
      }
    });
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  if (!user) return null;

  const meta = user.user_metadata;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.logo}>Chapita</h1>
        <button style={styles.logout} onClick={handleLogout}>Sign out</button>
      </div>
      <div style={styles.content}>
        <div style={styles.card}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: meta.brand_colour || '#2E75B6', display: 'inline-block', marginRight: 8 }} />
          <span style={styles.businessName}>{meta.name || 'Your business'}</span>
          <p style={styles.reward}>Reward: {meta.reward_name || 'Not set'}</p>
          <p style={styles.email}>{user.email}</p>
        </div>
        <div style={styles.statsRow}>
          <div style={styles.stat}>
            <p style={styles.statNumber}>0</p>
            <p style={styles.statLabel}>Customers</p>
          </div>
          <div style={styles.stat}>
            <p style={styles.statNumber}>0</p>
            <p style={styles.statLabel}>Stamps issued</p>
          </div>
          <div style={styles.stat}>
            <p style={styles.statNumber}>0</p>
            <p style={styles.statLabel}>Rewards redeemed</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f5f5f5' },
  header: { backgroundColor: 'white', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  logo: { fontSize: '22px', fontWeight: '700', color: '#2E75B6', margin: 0 },
  logout: { padding: '8px 16px', backgroundColor: 'transparent', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', color: '#555' },
  content: { padding: '32px', maxWidth: '800px', margin: '0 auto' },
  card: { backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '24px' },
  businessName: { fontSize: '20px', fontWeight: '600', color: '#1a1a1a' },
  reward: { color: '#555', margin: '8px 0 4px', fontSize: '14px' },
  email: { color: '#999', fontSize: '13px', margin: 0 },
  statsRow: { display: 'flex', gap: '16px' },
  stat: { flex: 1, backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center' },
  statNumber: { fontSize: '36px', fontWeight: '700', color: '#2E75B6', margin: '0 0 4px' },
  statLabel: { color: '#777', fontSize: '14px', margin: 0 },
};