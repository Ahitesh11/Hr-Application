import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { LogIn, ShieldCheck, Loader2, Eye, EyeOff, User, Users, TrendingUp, Clock, CheckCircle } from "lucide-react";

const features = [
  { icon: Users, text: "Employee Management" },
  { icon: Clock, text: "Attendance Tracking" },
  { icon: TrendingUp, text: "Salary & Increments" },
  { icon: CheckCircle, text: "Role-Based Approvals" },
];

export const Login = () => {
  const { login } = useAuth();
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const user = await api.login(employeeId, password);
      if (user) {
        login(user);
      } else {
        setError("Invalid Employee ID or Password. Please try again.");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-stone-50">

      {/* ── Left Panel ── */}
      <div
        className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, var(--color-pink-800) 0%, var(--color-pink-700) 40%, var(--color-pink-600) 75%, var(--color-pink-500) 100%)" }}
      >
        {/* Decorative circles */}
        <div className="absolute top-[-100px] right-[-100px] w-[380px] h-[380px] rounded-full bg-white/[0.04]" />
        <div className="absolute bottom-[-80px] left-[-80px] w-[320px] h-[320px] rounded-full bg-white/[0.04]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/[0.02]" />
        {/* Subtle dot-grid texture for depth */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)", backgroundSize: "28px 28px" }}
        />

        {/* Logo */}
        <div className="relative z-10 flex flex-col items-start gap-2 login-fade-in">
          <img src="/logo.png" alt="Logo" className="h-10 w-auto" />
          <div>
            <h1 className="text-white font-black text-2xl leading-none tracking-tight">Passary</h1>
            <p className="text-white/70 text-sm font-semibold tracking-wide">Refractories</p>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center login-fade-in">
          <p className="text-pink-200 text-xs font-bold uppercase tracking-[0.2em] mb-3">HR Management Platform</p>
          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            Manage Your<br />
            <span className="text-pink-300">Workforce</span><br />
            Efficiently
          </h2>
          <p className="text-white/60 text-sm font-medium leading-relaxed mb-10 max-w-xs">
            Complete HR solution for attendance, leaves, salary management, and real-time approvals — all in one place.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {features.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 rounded-2xl px-4 py-3 bg-white/[0.08] backdrop-blur-sm transition-colors hover:bg-white/[0.12]"
              >
                <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 bg-white/15">
                  <f.icon className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-white text-xs font-bold">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-white/30 text-[11px] font-medium">© 2026 Ahitesh Tandan. All Rights Reserved.</p>
        </div>
      </div>

      {/* ── Right Panel (login form) ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 bg-white">

        {/* Mobile logo */}
        <div className="lg:hidden flex flex-col items-center mb-10 login-fade-in">
          <img src="/logo.png" alt="Logo" className="h-12 w-auto mb-3" />
          <p className="font-black text-slate-900 text-base leading-none">Passary Refractories</p>
          <p className="text-slate-400 text-[10px] font-medium mt-1">HR Management System</p>
        </div>

        <div className="w-full max-w-sm login-fade-in-delay">

          {/* Desktop header */}
          <div className="hidden lg:flex flex-col mb-8 items-start">
            <img src="/logo.png" alt="Logo" className="h-10 w-auto mb-3" />
            <p className="font-black text-slate-900 text-sm leading-none">Passary Refractories</p>
            <p className="text-slate-400 text-[10px] font-medium mt-1">HR Management System</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-black text-slate-900 mb-1">Welcome back</h2>
            <p className="text-slate-400 text-sm font-medium">Sign in with your Employee ID to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Employee ID */}
            <div className="space-y-1.5">
              <label htmlFor="employeeId" className="text-xs font-black text-slate-600 uppercase tracking-wider block">
                Employee ID
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-500/60 pointer-events-none" />
                <input
                  id="employeeId"
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-pink-50 border-2 border-pink-100 rounded-2xl text-sm font-bold text-slate-900 placeholder:text-slate-300 placeholder:font-normal outline-none transition-all focus:bg-white focus:border-pink-600 focus:ring-4 focus:ring-pink-600/10"
                  placeholder="e.g. PMMPL-320"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-black text-slate-600 uppercase tracking-wider block">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-4 pr-12 py-3.5 bg-pink-50 border-2 border-pink-100 rounded-2xl text-sm font-bold text-slate-900 placeholder:text-slate-300 placeholder:font-normal outline-none transition-all focus:bg-white focus:border-pink-600 focus:ring-4 focus:ring-pink-600/10"
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-pink-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-2xl">
                <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-red-600 text-[10px] font-black">!</span>
                </div>
                <p className="text-red-600 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 text-white font-black text-sm rounded-2xl transition-all flex items-center justify-center gap-2.5 bg-pink-600 hover:bg-pink-700 disabled:bg-pink-700 disabled:cursor-not-allowed mt-2 active:scale-[0.98] shadow-lg shadow-pink-200"
            >
              {isLoading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Signing in...</>
              ) : (
                <><LogIn className="w-5 h-5" /> Login</>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 font-medium mt-5">
            Forgot your password? <span className="text-slate-500 font-semibold">Contact your HR administrator.</span>
          </p>

          <div className="flex items-center gap-2.5 mt-8">
            <div className="flex-1 h-px bg-slate-100" />
            <ShieldCheck className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Role-Based Secure Access</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>
          <p className="text-center text-[11px] text-slate-300 font-medium mt-3">
            © 2026 Ahitesh Tandan. All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  );
};
