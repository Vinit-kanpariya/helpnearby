import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Mail, Lock, Users, CheckCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { getStats } from "../services/api";

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

export default function Login() {
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [stats, setStats] = useState<{ userCount: number; completedCount: number } | null>(null);

  useEffect(() => {
    getStats()
      .then((res) => setStats(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) return;
    if (window.google) { setGoogleReady(true); return; }
    const interval = setInterval(() => {
      if (window.google) { clearInterval(interval); setGoogleReady(true); }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const handleGoogleClick = () => {
    if (!window.google) return;
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      scope: "openid email profile",
      callback: async (response) => {
        if (response.error || !response.access_token) {
          setError("Google sign-in failed. Please try again.");
          return;
        }
        setError("");
        setLoading(true);
        try {
          await googleLogin({ accessToken: response.access_token });
          navigate("/browse");
        } catch (err: any) {
          setError(err.response?.data?.message || "Google login failed.");
        } finally {
          setLoading(false);
        }
      },
    });
    client.requestAccessToken();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/browse");
    } catch (err: any) {
      setError(err.response?.data?.message || "Login failed. Check your email and password.");
    } finally {
      setLoading(false);
    }
  };

  const userCount = stats ? `${stats.userCount.toLocaleString()}+` : "—";
  const completedCount = stats ? `${stats.completedCount.toLocaleString()}+` : "—";

  return (
    <div className="h-full flex max-md:flex-col max-md:overflow-y-auto">
      {/* Left Panel */}
      <div className="w-[560px] max-lg:w-[400px] max-md:w-full max-md:py-10 bg-brand-dark flex flex-col justify-between p-16 max-md:p-8">
        <div>
          <Link to="/" className="flex items-center gap-2.5 mb-16 max-md:mb-6">
            <MapPin className="w-6 h-6 text-brand-light" />
            <span className="text-white text-[20px] font-bold">HelpNearby</span>
          </Link>
          <h2 className="text-white text-[36px] max-md:text-[24px] font-extrabold leading-tight mb-4">
            Your neighbours
            <br />
            are here to help.
          </h2>
          <p className="text-green-200 text-[14px] leading-relaxed max-w-sm">
            Connect with people nearby for small tasks — carrying groceries,
            proofreading, tech help and more.
          </p>
        </div>
        <div className="flex flex-col gap-4 max-md:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-light/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-brand-light" />
            </div>
            <div>
              <div className="text-white text-[14px] font-semibold">
                {userCount} helpers in your community
              </div>
              <div className="text-green-300 text-[12px]">
                Real people, real help, every day
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-light/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-brand-light" />
            </div>
            <div>
              <div className="text-white text-[14px] font-semibold">
                {completedCount} tasks completed
              </div>
              <div className="text-green-300 text-[12px]">
                Trusted community, verified profiles
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-10 max-md:p-6 bg-white overflow-y-auto max-md:overflow-visible max-md:flex-none max-md:items-start">
        <div className="w-full max-w-md">
          <h1 className="text-[28px] font-extrabold text-gray-text mb-2">
            Welcome back
          </h1>
          <p className="text-[14px] text-gray-muted mb-8">
            Sign in to your HelpNearby account
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 text-[13px] px-4 py-3 rounded-lg mb-4 border border-red-200">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleClick}
            disabled={!googleReady || loading}
            className="w-full flex items-center justify-center gap-3 border border-brand-card-border rounded-[10px] px-4 py-3 bg-white text-[14px] font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 mb-6"
          >
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="text-center text-gray-placeholder text-[13px] mb-6">
            or
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-[13px] font-semibold text-gray-secondary mb-1.5 block">
                Email address
              </label>
              <div className="flex items-center gap-2 border border-brand-card-border rounded-[10px] px-4 py-3 bg-white focus-within:ring-2 focus-within:ring-brand-dark/20">
                <Mail className="w-4 h-4 text-gray-placeholder" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="flex-1 text-[14px] outline-none text-gray-text placeholder-gray-placeholder"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[13px] font-semibold text-gray-secondary">
                  Password
                </label>
                <a href="#" className="text-[12px] text-brand-dark font-semibold hover:underline">
                  Forgot password?
                </a>
              </div>
              <div className="flex items-center gap-2 border border-brand-card-border rounded-[10px] px-4 py-3 bg-white focus-within:ring-2 focus-within:ring-brand-dark/20">
                <Lock className="w-4 h-4 text-gray-placeholder" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="flex-1 text-[14px] outline-none text-gray-text placeholder-gray-placeholder"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-dark text-white text-[15px] font-semibold py-3.5 rounded-[10px] hover:bg-green-800 transition-colors disabled:opacity-60 mt-2"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-[13px] text-gray-muted mt-6">
            Don't have an account?{" "}
            <Link to="/signup" className="text-brand-dark font-semibold hover:underline">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
