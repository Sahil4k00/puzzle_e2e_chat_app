import { Router } from "express";

import { getRoom, listRooms, saveEnvelope, uploadAttachment } from "../controllers/roomController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/", listRooms);
router.get("/:roomId", getRoom);
router.post("/:roomId/key-envelope", saveEnvelope);
router.post("/:roomId/attachments", uploadAttachment);

export default router;
