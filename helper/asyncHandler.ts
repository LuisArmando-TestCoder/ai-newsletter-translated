import { RequestHandler } from "npm:express";

// Helper: Wrap async endpoints for error handling.
export default (fn: RequestHandler): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
