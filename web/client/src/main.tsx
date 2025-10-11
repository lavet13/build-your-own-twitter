import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/styles.css";
import { App } from "@/App";
import type { router } from "@/router";

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
