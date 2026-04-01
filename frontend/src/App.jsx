import { useEffect, useState } from "react";
import Login from "./Login";
import Register from "./Register";
import Dashboard from "./Dashboard";

function App() {
  const [token, setToken] = useState(null);
  const [showRegister, setShowRegister] =
    useState(false);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (t) setToken(t);
  }, []);

  if (token) {
    return <Dashboard setToken={setToken} />;
  }

  return showRegister ? (
    <Register
      setToken={setToken}
      setShowRegister={setShowRegister}
    />
  ) : (
    <Login
      setToken={setToken}
      setShowRegister={setShowRegister}
    />
  );
}

export default App;
