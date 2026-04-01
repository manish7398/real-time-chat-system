import { useState } from "react";
import API from "./api";
import "./App.css";

function Login({ setToken, setShowRegister }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow]         = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await API.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      setToken(res.data.token);
    } catch (err) {
      setError(
        err.response?.data?.message || "Invalid email or password"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Brand */}
        <div className="auth-brand">
          <div className="auth-brand-icon">💬</div>
          <span className="auth-brand-name">NotifyX</span>
        </div>

        <h2 className="auth-title">Welcome back</h2>
        <p className="auth-subtitle">Sign in to continue chatting</p>

        {error && <div className="auth-error">⚠️ {error}</div>}

        <form onSubmit={handleLogin} autoComplete="on">
          {/* Email */}
          <div className="field">
            <label className="field-label">Email</label>
            <div className="field-wrap">
              <input
                className="field-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div className="field">
            <label className="field-label">Password</label>
            <div className="field-wrap">
              <input
                className="field-input"
                type={show ? "text" : "password"}
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <span
                className="field-icon"
                onClick={() => setShow(!show)}
                title={show ? "Hide" : "Show"}
              >
                {show ? "🙈" : "👁️"}
              </span>
            </div>
          </div>

          <button className="auth-btn" disabled={loading}>
            {loading ? "Signing in…" : "Sign In →"}
          </button>
        </form>

        <p className="auth-switch">
          New here?{" "}
          <b onClick={() => setShowRegister(true)}>Create an account</b>
        </p>

        <p className="auth-footer">Secure · Fast · Real-time</p>
      </div>
    </div>
  );
}

export default Login;
