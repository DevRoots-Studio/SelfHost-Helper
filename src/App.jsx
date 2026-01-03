import { useState, useEffect } from "react";
import Dashboard from "./pages/Dashboard";
// import TitleBar from "./components/ui/titleBar";
import { HashRouter as Router, Routes, Route } from "react-router-dom";

import Settings from "./pages/Settings";
import ShutdownOverlay from "./components/ShutdownOverlay";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  const [isShuttingDown, setIsShuttingDown] = useState(false);

  useEffect(() => {
    const unsub = window.api.onShutdown(() => {
      setIsShuttingDown(true);
    });
    return unsub;
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-indigo-900/20 via-background to-background">
        <ShutdownOverlay isVisible={isShuttingDown} />
        <title>
          {import.meta.env.DEV ? "SelfHost Helper Dev" : "SelfHost Helper"}
        </title>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
        <ToastContainer
          position="bottom-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
      </div>
    </Router>
  );
}
export default App;
