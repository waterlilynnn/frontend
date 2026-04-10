import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { Mail, Lock, Eye, EyeOff, User, AlertCircle, CheckCircle } from 'lucide-react';

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPassword, setShowPw]   = useState(false);
  const [loading, setLoading]       = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginSuccess, setLoginSuccess] = useState(false);

  useEffect(() => {
    if (loginError) {
      const timer = setTimeout(() => {
        setLoginError('');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [loginError]);

  useEffect(() => {
    if (loginSuccess) {
      const timer = setTimeout(() => {
        setLoginSuccess(false);
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            navigate(user.role === 'admin' ? '/admin' : '/staff');
          } catch {
            navigate('/staff');
          }
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [loginSuccess, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');
    setLoginSuccess(false);
    
    const result = await login(email, password);
    
    if (result.success) {
      setLoginSuccess(true);
    } else {
      setLoginError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#edf3f0] flex flex-col relative overflow-hidden">

      <div className="absolute top-[-60px] right-[-60px] w-64 h-64 rounded-full bg-[#9fe1cb] opacity-20 pointer-events-none" />
      <div className="absolute bottom-[-40px] left-[-40px] w-48 h-48 rounded-full bg-[#5dcaa5] opacity-15 pointer-events-none" />
      <div className="absolute bottom-[-80px] right-[-30px] w-80 h-80 rounded-full bg-[#9fe1cb] opacity-10 pointer-events-none" />

      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20" style={{ backgroundImage: `url('/cityhall.jpg')` }} />

      <div className="lg:hidden relative z-10 flex flex-col items-center px-4 pt-6 pb-4">
        <img src="/cenro-logo.png" alt="CENRO Logo" className="h-12 w-auto object-contain mb-2" />
        <div className="w-60 h-0.5 bg-[#107e45] rounded-full mb-2" />
        <div className="text-center">
          <h1 className="text-base font-bold text-[#0e7641] leading-tight">
            Environmental Management Clearance System
          </h1>
          <p className="text-sm italic text-[#138a4c] mt-1">Better, Cleaner &amp; Greener Tagaytay</p>
        </div>
      </div>

      <div className="hidden lg:flex relative z-10 items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-0.5 h-12 bg-[#107e45] rounded-full" />
          <div>
            <h1 className="text-lg font-bold text-[#0e7641] leading-tight">
              Environmental Management Clearance System
            </h1>
            <p className="text-md italic text-[#138a4c] mt-0.5">Better, Cleaner, &amp; Greener Tagaytay</p>
          </div>
        </div>
        <img src="/cenro-logo.png" alt="CENRO Logo" className="h-14 w-auto object-contain" />
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center lg:items-start lg:pt-16">
        <div className="w-full max-w-sm mx-4 lg:min-w-[450px] lg:max-w-md">

          <div className="flex justify-center">
            <div className="relative z-10 mb-[-48px] lg:min-w-20 w-24 h-24 rounded-full bg-[#0a6045] border-4 border-[#edf3f0] shadow-xl flex items-center justify-center">
              <User className="h-10 w-10 text-white" strokeWidth={1.5} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-black/[0.07] pt-16 pb-6 px-6 lg:pb-8 lg:px-8 shadow-lg">

            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-[#0a6045]">Welcome!</h2>
              <p className="text-xs text-gray-500 mt-1">Sign in to your account to continue</p>
            </div>

            {/* SUCCESS ALERT */}
            {loginSuccess && (
              <div className="mb-5 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg flex items-center gap-3 shadow-sm transition-all duration-300">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Login Successful!</p>
                  <p className="text-xs text-green-700">Redirecting to dashboard...</p>
                </div>
              </div>
            )}

            {/* ERROR ALERT */}
            {loginError && (
              <div className="mb-5 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-center gap-3 shadow-sm transition-all duration-300">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-800">Login Failed</p>
                  <p className="text-xs text-red-700">{loginError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5 lg:space-y-6">

              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-600 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1d9e75]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-3 lg:py-3.5 text-sm bg-gray-50 border border-gray-200 rounded-xl
                               text-gray-800 placeholder-gray-400
                               focus:outline-none focus:ring-2 focus:ring-[#1d9e75]/30 focus:border-[#1d9e75]
                               transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="block text-xs lg:text-sm font-medium text-gray-600">Password</label>
                  <Link to="/forgot-password"
                    className="text-[11px] lg:text-xs text-[#0f6e50] hover:text-[#09563e] hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1d9e75]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-3 lg:py-3.5 text-sm bg-gray-50 border border-gray-200 rounded-xl
                               text-gray-800 placeholder-gray-400
                               focus:outline-none focus:ring-2 focus:ring-[#1d9e75]/30 focus:border-[#1d9e75]
                               transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 lg:py-3.5 bg-[#0f6e53] hover:bg-[#0a6045] text-white text-sm lg:text-base font-medium
                           rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : 'Sign In'}
              </button>
            </form>

          </div>
        </div>
      </div>

      <div className="relative z-10 text-center py-7">
        <p className="text-[11px] lg:text-[13px] text-[#6a8a72] italic max-w-md mx-auto px-4">
          A Web-Based System to Optimize Environmental Management Clearance at Tagaytay City Environment and Natural Resources Office
        </p>
      </div>

    </div>
  );
}

export default Login;