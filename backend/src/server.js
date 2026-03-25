import dotenv from "dotenv";
import http from "http";

import app from "./app.js";
import connectDatabase from "./config/db.js";
import { initializeSocketServer } from "./sockets/chatSocket.js";

dotenv.config();

const port = Number(process.env.PORT || 4000);
const server = http.createServer(app);

initializeSocketServer(server);

connectDatabase()
  .then(() => {
    server.listen(port, () => {
      console.log(`Backend listening on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start backend", error);
    process.exit(1);
  });
