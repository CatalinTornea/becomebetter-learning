import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, "../../../.env") });
import "./lib/env.js";

import { app } from "./app.js";
import { ensureAdminUser } from "./lib/ensureAdminUser.js";

const port = Number(process.env.PORT ?? 4000);

app.listen(port, async () => {
  console.log(`API running on http://localhost:${port}`);
  await ensureAdminUser();
});
