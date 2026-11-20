import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { Toaster } from "@/components/ui/toast";
import { AuthBootstrap } from "@/features/auth/components/AuthBootstrap";
import { queryClient } from "@/lib/query-client";
import { routes } from "@/routes";

// Monta la app completa (mismo árbol que main.tsx) en la ruta indicada
export function renderApp(path = "/") {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const user = userEvent.setup();

  render(
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap>
        <RouterProvider router={router} />
      </AuthBootstrap>
      <Toaster />
    </QueryClientProvider>
  );

  return { router, user };
}

export type Usuario = ReturnType<typeof userEvent.setup>;
