import Dashboard from "./pages/Dashboard";
// import TitleBar from "./components/ui/titleBar";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Settings from "./pages/Settings";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background text-text">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
    </Router>
  );
}
export default App;
