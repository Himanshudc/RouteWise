import { Eye,EyeOff,Loader2,Truck } from 'lucide-react';
import { useState } from 'react';
import { Navigate,useNavigate } from 'react-router-dom';
import { Button,Input } from '../components/ui';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isAdmin } = useAuth();
  const [email, setEmail] = useState('admin@routewise.com');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthenticated) {
    return <Navigate to={isAdmin ? "/shipments" : "/track"} replace />;
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary-900 flex items-center justify-center">
            <Truck className="w-7 h-7 text-white" />
          </div>
          <span className="text-2xl font-bold text-primary-900">RouteWise</span>
        </div>

        <div className="card">
          <div className="card-header text-center">
            <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
            <p className="text-gray-500 mt-1">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="card-body space-y-5">
            {error && (
              <div className="p-3 bg-danger-50 border border-danger-100 rounded-md text-danger-600 text-sm">
                {error}
              </div>
            )}

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@routewise.com"
              required
              autoComplete="email"
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <Button type="submit" className="w-full" size="lg" loading={isLoading}>
              {isLoading ? <Loader2 className="w-5 h-5" /> : 'Sign In'}
            </Button>
          </form>

          <div className="card-footer">
            <p className="text-sm text-gray-500 text-center">
              Demo credentials:
              <br />
              <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">admin@routewise.com / admin123</span>
              {' '}
              <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">customer@routewise.com / customer123</span>
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Smart Delivery & Logistics Monitor
        </p>
      </div>
    </div>
  );
}