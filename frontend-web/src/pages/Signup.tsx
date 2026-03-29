import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { mockStore } from '../store/mockStore';
import { Building2, Mail, Lock, User as UserIcon, Globe, ArrowRight } from 'lucide-react';

interface Country {
  name: { common: string };
  currencies: Record<string, { name: string; symbol: string }>;
}

export default function Signup() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    country: '',
  });
  const [countries, setCountries] = useState<Country[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios
      .get<Country[]>('https://restcountries.com/v3.1/all?fields=name,currencies')
      .then(res => {
        const sorted = res.data.sort((a, b) =>
          a.name.common.localeCompare(b.name.common)
        );
        setCountries(sorted);
      })
      .catch(() => {});
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const getSelectedCurrency = (): string => {
    const found = countries.find(c => c.name.common === form.country);
    if (!found || !found.currencies) return '';
    const currencyCode = Object.keys(found.currencies)[0];
    return currencyCode ?? '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    
    // Simulate network delay
    setTimeout(() => {
      try {
        const currency = getSelectedCurrency();
        
        // 1. Create Company
        const companyId = 'comp_' + Date.now();
        mockStore.createCompany({
          id: companyId,
          name: form.name + "'s Company",
          currency: currency || 'USD',
          country: form.country
        });

        // 2. Create Admin User
        const userId = 'usr_' + Date.now();
        const newUser = {
          id: userId,
          name: form.name,
          email: form.email,
          role: 'admin' as const,
          companyId: companyId
        };
        mockStore.createUser(newUser);

        // 3. Login
        login(newUser, 'mock_token_' + userId);
        navigate('/admin');
        
      } catch (err: unknown) {
        setError('Signup failed. Try again.');
      } finally {
        setLoading(false);
      }
    }, 800);
  };

  const currency = getSelectedCurrency();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-[40%] h-[40%] bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>

      <div className="w-full max-w-[1000px] bg-white rounded-3xl shadow-2xl flex overflow-hidden relative z-10 border border-slate-100">
        
        {/* Left Side: Brand & Visual */}
        <div className="hidden lg:flex w-5/12 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-12 flex-col justify-between text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/always-grey.png')] opacity-10 mix-blend-overlay"></div>
          
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl mb-6 shadow-inner border border-white/30">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-4xl font-black mb-4 tracking-tight">ReimburseFlow</h1>
            <p className="text-indigo-100 text-lg font-medium leading-relaxed max-w-sm">
              The smartest way to manage team expenses and approval workflows globally.
            </p>
          </div>
          
          <div className="relative z-10">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-6 rounded-2xl">
              <p className="text-sm font-medium italic text-indigo-50 leading-relaxed mb-4">
                "We set up our entire approval matrix in minutes. It handles multiple currencies flawlessly."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-400 rounded-full border-2 border-indigo-200"></div>
                <div>
                  <p className="text-sm font-bold">Sarah Jenkins</p>
                  <p className="text-xs text-indigo-200">VP of Finance, TechCorp</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full lg:w-7/12 p-10 lg:p-14 bg-white relative">
          <div className="max-w-md mx-auto">
            <div className="mb-10 text-center lg:text-left">
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Create workspace</h2>
              <p className="text-slate-500 mt-2 font-medium">Set up your company's admin account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Full name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text" name="name" value={form.name} onChange={handleChange} required
                    placeholder="John Doe"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:bg-white transition-all duration-200 shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Email address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email" name="email" value={form.email} onChange={handleChange} required
                    placeholder="admin@company.com"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:bg-white transition-all duration-200 shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Company Location</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Globe className="h-5 w-5 text-slate-400" />
                  </div>
                  <select
                    name="country" value={form.country} onChange={handleChange} required
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:bg-white transition-all duration-200 shadow-sm appearance-none"
                  >
                    <option value="" disabled>Select base country</option>
                    {countries.map(c => (
                      <option key={c.name.common} value={c.name.common}>
                        {c.name.common}
                      </option>
                    ))}
                  </select>
                </div>
                {currency && (
                  <p className="text-xs text-indigo-600 font-medium pl-1 animate-fade-in">
                    Base currency set to: <span className="font-bold">{currency}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="password" name="password" value={form.password} onChange={handleChange} required
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:bg-white transition-all duration-200 shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Confirm</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} required
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:bg-white transition-all duration-200 shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100 flex items-center animate-shake">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:bg-slate-300 disabled:shadow-none disabled:translate-y-0 flex items-center justify-center gap-2 group mt-2"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating workspace...
                  </span>
                ) : (
                  <>
                    Create Workspace
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 font-medium mt-8">
              Already have an account?{' '}
              <Link to="/login" className="text-indigo-600 hover:text-indigo-800 hover:underline font-bold transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}