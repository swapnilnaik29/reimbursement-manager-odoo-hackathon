import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import './Auth.css';
import { Briefcase } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const login = useAuthStore(state => state.login);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-left">
        <div className="auth-brand">
          <Briefcase size={32} color="var(--primary)" />
          <span>ReimburseApp</span>
        </div>
        
        <div className="auth-form-wrapper">
          <div className="auth-header">
            <h1>Welcome back</h1>
            <p>Log in to manage your company expenses</p>
          </div>
          
          {error && <div className="auth-error">{error}</div>}
          
          <form onSubmit={handleLogin}>
            <Input 
              label="Email Address" 
              type="email" 
              placeholder="jane@acme.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input 
              label="Password" 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            
            <div className="auth-actions">
              <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
            </div>
            
            <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={loading}>
              Sign In
            </Button>
          </form>
          
          <div className="auth-footer">
            <p>Don't have a company account? <Link to="/signup" className="auth-link">Sign up</Link></p>
          </div>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-testimonial">
          <h2>"Approval speed increased by 300% since moving away from manual Excel reports."</h2>
          <p>— Acme Corp Finance Team</p>
        </div>
      </div>
    </div>
  );
}
