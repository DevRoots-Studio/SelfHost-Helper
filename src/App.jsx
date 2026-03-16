import { useState, useEffect } from "react";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import GeneralSection from "./pages/settings/GeneralSection";
import DataSection from "./pages/settings/DataSection";
import RuntimesSection from "./pages/settings/RuntimesSection";
import UpdatesSection from "./pages/settings/UpdatesSection";
import AboutSection from "./pages/settings/AboutSection";
import ProjectLayout from "./components/ProjectLayout";
import EmptyState from "./components/EmptyState";
import LogViewer from "./components/LogViewer";
import EditorView from "./components/EditorView";
import TunnelView from "./components/TunnelView";
import ResourcesTab from "./components/ResourcesTab";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";

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
        <title>{import.meta.env.DEV ? "SelfHost Helper Dev" : "SelfHost Helper"}</title>
        <Routes>
          <Route path="/" element={<Dashboard />}>
            <Route index element={<EmptyState />} />
            <Route path="project/:projectId" element={<ProjectLayout />}>
              <Route index element={<Navigate to="console" replace />} />
              <Route path="console" element={<LogViewer />} />
              <Route path="editor" element={<EditorView />} />
              <Route path="tunnel" element={<TunnelView />} />
              <Route path="resources" element={<ResourcesTab />} />
            </Route>
          </Route>
          <Route path="/settings" element={<Settings />}>
            <Route index element={<Navigate to="general" replace />} />
            <Route path="general"  element={<GeneralSection />} />
            <Route path="data"     element={<DataSection />} />
            <Route path="runtimes" element={<RuntimesSection />} />
            <Route path="updates"  element={<UpdatesSection />} />
            <Route path="about"    element={<AboutSection />} />
          </Route>
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
