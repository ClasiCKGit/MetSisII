import { describe, expect, it } from "vitest";
import { escaparHtml } from "../../src/utils/html";

describe("escaparHtml", () => {
  it("escapa los caracteres especiales de HTML", () => {
    expect(escaparHtml(`<a href="x">Tom & 'Jerry'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;"
    );
  });

  it("deja igual el texto sin caracteres especiales, tildes incluidas", () => {
    expect(escaparHtml("José Pérez")).toBe("José Pérez");
  });
});
