import "dotenv/config";
import { app } from "./app";
import { logger } from "./utils/logger";

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.listen(PORT, () => {
  logger.info(`HR AI backend listening on port ${PORT}`);
});
