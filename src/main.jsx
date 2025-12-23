import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

if (import.meta.env.DEV) {
  const script = document.createElement("script");
  script.src = "https://unpkg.com/react-scan/dist/auto.global.js";
  script.async = true;
  document.head.appendChild(script);
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
