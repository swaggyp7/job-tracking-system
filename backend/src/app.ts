import express from "express";
import apiRouter from "./routes";
import { initDatabase } from "./db/database";

const app = express();
app.use(express.json());

app.use("/api", apiRouter);

const PORT = 3000;

async function startServer(): Promise<void> {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
