import "dotenv/config";
import { app } from "../app";

// Vercel's Node runtime invokes an Express app directly — it's just a
// (req, res) request handler. No serverless-http wrapper needed.
export default app;
