import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./api";
import "./styles/globals.css";
import { applyBrandingFromConfig } from "./branding";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

void applyBrandingFromConfig();

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
