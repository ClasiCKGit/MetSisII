import { waitFor } from "@testing-library/react";
import { expect } from "vitest";

// Espera a que no quede ningún diálogo abierto. Se identifica por data-slot porque
// los avisos (toast) también usan role="dialog" y siguen en pantalla unos segundos.
export async function esperarQueSeCierreElDialogo() {
  await waitFor(() => expect(document.querySelector('[data-slot="dialog-content"]')).toBeNull());
}
