import { Router } from "express";

import {
  createInvite,
  getPublicInvite,
  validateInvite
} from "../controllers/inviteController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/:code/public", getPublicInvite);
router.post("/:code/validate", requireAuth, validateInvite);
router.post("/", requireAuth, createInvite);

export default router;