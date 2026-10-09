import express from "express";
import {
  registerUser,
  updateUser,
  getUsers,
} from "../../controller/userController.js";

const router = express.Router();

router.post("/", registerUser);
router.get("/", getUsers);
router.put("/:id", updateUser);

export default router;
