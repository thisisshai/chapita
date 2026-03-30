import { useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', reward_name: '', brand_colour: '#2E75B6' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { name: form.name, reward_name: form.reward_name, brand_colour: form.brand_colour } }
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.logo}>Chapita</h1>
        <p style={styles.subtitle}>Register your business</p>
        <form onSubmit={handleRegister}>
          {[
            { label: 'Business name', name: 'name', type: 'text', placeholder: 'e.g. The Coffee House' },
            { label: 'Email', name: 'email', type: 'email', placeholder: 'you@yourbusiness.com' },
            { label: 'Password', name: 'password', type: 'password', placeholder: '••••••••' },
            { label: 'Reward name', name: 'reward_name', type: 'text', placeholder: 'e.g. Free coffee' },
          ].map(field => (
            <div key={field.name} style={styles.field}>
              <label style={styles.label}>{field.label}</label>
              <input style={styles.input} type={field.type} name={field.name} value={form[field.name]} onChange={handleChange} placeholder={field.placeholder} required />
            </div>
          ))}
          <div style={styles.field}>
            <label style={styles.label}>Brand colour</label>
            <input style={{ ...styles.input, padding: '6px', height: '40px' }} type="color" name="brand_colour" value={form.brand_colour} onChange={handleChange} />
          </div>
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <p style={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' },
  card: { backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', width: '100%', maxWidth: '400px' },
  logo: { fontSize: '28px', fontWeight: '700', color: '#2E75B6', margin: '0 0 4px 0' },
  subtitle: { color: '#777', marginBottom: '28px', marginTop: '4px' },
  field: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '14px', fontWeight: '500', color: '#333', marginBottom: '6px' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' },
  error: { color: '#C0392B', fontSize: '14px', marginBottom: '12px' },
  button: { width: '100%', padding: '12px', backgroundColor: '#2E75B6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginTop: '8px' },
  footer: { textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#777' },
  link: { color: '#2E75B6', textDecoration: 'none', fontWeight: '500' },
};