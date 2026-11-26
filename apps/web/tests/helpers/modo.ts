// Los tests corren por defecto contra la API falsa (MSW). Con TEST_API=real se saltea MSW y se usa la
// API verdadera de VITE_API_URL: sirve para comprobar que la API falsa sigue siendo fiel.
export const USANDO_API_REAL = import.meta.env.VITE_TEST_API === "real";
