import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { COUNTRY_CODES } from '../data/countryCodes';
import './Auth.css';
import { Briefcase } from 'lucide-react';

export default function Signup() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    company_name: '',
    country_code: 'IN',
  });
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryList, setShowCountryList] = useState(false);
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const signup    = useAuthStore((s) => s.signup);
  const navigate  = useNavigate();

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const filteredCountries = COUNTRY_CODES.filter(
    (c) =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const selectedCountry = COUNTRY_CODES.find((c) => c.code === formData.country_code);

  const handleSelectCountry = (code) => {
    setFormData({ ...formData, country_code: code });
    setShowCountryList(false);
    setCountrySearch('');
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(formData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Signup failed');
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

        <div className="auth-form-wrapper" style={{ marginTop: '20px' }}>
          <div className="auth-header" style={{ marginBottom: '24px' }}>
            <h1>Create your company</h1>
            <p>Admin account setup in minutes</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSignup}>
            <Input
              label="Full Name"
              name="full_name"
              placeholder="Elon Musk"
              value={formData.full_name}
              onChange={handleChange}
              required
            />
            <Input
              label="Work Email"
              name="email"
              type="email"
              placeholder="elon@spacex.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
            <Input
              label="Company Name"
              name="company_name"
              placeholder="SpaceX"
              value={formData.company_name}
              onChange={handleChange}
              required
            />

            {/* Country Code Searchable Dropdown */}
            <div className="input-group" style={{ position: 'relative', marginBottom: 16 }}>
              <label className="input-label">Country</label>
              <div
                className="country-selector"
                onClick={() => setShowCountryList((v) => !v)}
              >
                <span className="country-flag-code">{formData.country_code}</span>
                <span className="country-name-display">
                  {selectedCountry?.name || 'Select country'}
                </span>
                <span className="country-chevron">▾</span>
              </div>

              {showCountryList && (
                <div className="country-dropdown">
                  <input
                    autoFocus
                    className="country-search-input"
                    placeholder="Search country…"
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <ul className="country-list">
                    {filteredCountries.map((c) => (
                      <li
                        key={c.code}
                        className={`country-item ${c.code === formData.country_code ? 'selected' : ''}`}
                        onClick={() => handleSelectCountry(c.code)}
                      >
                        <span className="country-code-pill">{c.code}</span>
                        {c.name}
                      </li>
                    ))}
                    {filteredCountries.length === 0 && (
                      <li className="country-empty">No results</li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            <Input
              label="Password"
              name="password"
              type="password"
              placeholder="Min 8 characters"
              value={formData.password}
              onChange={handleChange}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={loading}
              style={{ marginTop: '16px' }}
            >
              Register Company
            </Button>
          </form>

          <div className="auth-footer">
            <p>
              Already have an account?{' '}
              <Link to="/login" className="auth-link">Sign in</Link>
            </p>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-testimonial">
          <h2>"The fastest way to manage business expenditure seamlessly across geographies."</h2>
          <p>— Global Finance Leaders</p>
        </div>
      </div>
    </div>
  );
}
