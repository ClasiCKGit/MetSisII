import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Toaster } from "@/components/ui/toast";
import { AuthBootstrap } from "@/features/auth/components/AuthBootstrap";
import { queryClient } from "@/lib/query-client";
import { routes } from "@/routes";
import "./index.css";

const router = createBrowserRouter(routes);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap>
        <RouterProvider router={router} />
      </AuthBootstrap>
      {/* Una sola vez en toda la app: toast.add() funciona desde cualquier lado */}
      <Toaster />
    </QueryClientProvider>
  </StrictMode>
);
