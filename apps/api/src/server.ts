import "./lib/env.js";

import { app } from "./app.js";
import { ensureAdminUser } from "./lib/ensureAdminUser.js";

const port = Number(process.env.PORT ?? 4000);

app.listen(port, async () => {
  console.log(`API running on http://localhost:${port}`);
  await ensureAdminUser();
});
