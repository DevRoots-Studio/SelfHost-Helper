import Dashboard from "./pages/Dashboard";
// import TitleBar from "./components/ui/titleBar";
import { HashRouter as Router, Routes, Route } from "react-router-dom";

import Settings from "./pages/Settings";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background text-text">
        <title>
          {import.meta.env.DEV ? "SelfHost Helper Dev" : "SelfHost Helper"}
        </title>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
    </Router>
  );
}
export default App;
