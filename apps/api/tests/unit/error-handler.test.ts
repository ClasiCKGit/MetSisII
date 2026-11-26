import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { errorHandler } from "../../src/middlewares/error.middleware";

function responder(err: unknown) {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  errorHandler(err, {} as Request, res as unknown as Response, (() => {}) as NextFunction);
  return { status: res.status.mock.calls[0]?.[0], body: res.json.mock.calls[0]?.[0] };
}

describe("errorHandler", () => {
  it("responde 409 cuando una transacción choca con otra simultánea (P2034)", () => {
    const { status, body } = responder({ code: "P2034", message: "write conflict" });

    expect(status).toBe(409);
    expect(body).toEqual({ error: "La operación chocó con otra simultánea, volvé a intentarlo" });
  });

  it("sigue respondiendo 500 ante un error desconocido", () => {
    const { status } = responder(new Error("algo se rompió"));

    expect(status).toBe(500);
  });
});
