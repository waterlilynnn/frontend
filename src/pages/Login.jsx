import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      toast.success('Login successful!');
      const role = result.user.role;
      if (role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/staff');
      }
    } else {
      toast.error(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 relative">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('/cityhall.jpg')` }}
      />
      <div className="absolute inset-0 bg-water-100/30"/>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-start justify-between px-4 py-4 z-10">
        <div className="flex items-start gap-3">
          <div className="w-0.5 self-stretch bg-forest-400 rounded-full" />
          <div>
            <h1 className="text-lg font-bold text-forest-400 leading-tight">
              Environmental Management Clearance System
            </h1>
            <p className="text-sm italic text-forest-400">
              Better, Cleaner, &amp; Greener Tagaytay
            </p>
          </div>
        </div>

        <img 
          src="/cenro-logo.png" 
          alt="CENRO Logo" 
          className="h-12 w-auto object-contain"
        />
      </div>

      {/* Form */}
      <div className="max-w-sm w-full space-y-6 relative z-10 mx-auto mt-40">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-forest-700">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-forest-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-forest-200 rounded-lg focus:border-forest-500 focus:ring-1 focus:ring-forest-500 outline-none text-sm text-forest-800 placeholder-forest-300"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-forest-700">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-forest-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 bg-white border border-forest-200 rounded-lg focus:border-forest-500 focus:ring-1 focus:ring-forest-500 outline-none text-sm text-forest-800 placeholder-forest-300"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-forest-400 hover:text-forest-600" />
                  ) : (
                    <Eye className="h-4 w-4 text-forest-400 hover:text-forest-600" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-forest-600 hover:bg-forest-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;

