import { useState } from "react";
import API from "./api";
import "./App.css";

function Register({ setToken, setShowRegister }) {
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow]         = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await API.post("/auth/register", { name, email, password });
      localStorage.setItem("token", res.data.token);
      setToken(res.data.token);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
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

        <h2 className="auth-title">Create account</h2>
        <p className="auth-subtitle">Join and start chatting instantly</p>

        {error && <div className="auth-error">⚠️ {error}</div>}

        <form onSubmit={handleRegister} autoComplete="on">
          <div className="field">
            <label className="field-label">Full Name</label>
            <div className="field-wrap">
              <input
                className="field-input"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          </div>

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

          <div className="field">
            <label className="field-label">Password</label>
            <div className="field-wrap">
              <input
                className="field-input"
                type={show ? "text" : "password"}
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
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
            {loading ? "Creating account…" : "Create Account →"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <b onClick={() => setShowRegister(false)}>Sign in</b>
        </p>
      </div>
    </div>
  );
}

export default Register;
