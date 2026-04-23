import { Router } from "express";
import {
    getVideos,
    uploadVideo,
    addYoutube,
    addStream,
    deleteVideo,
    getAdminOverview,
    getQuotaStatus,
    listActionClasses,
    startInference,
} from "../controllers/video.controller";
import { requireAdmin, requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/", requireAuth, getVideos);
router.post("/upload", requireAuth, uploadVideo);
router.post("/youtube", requireAuth, addYoutube);
router.post("/stream", requireAuth, addStream);
router.delete("/:id", requireAuth, deleteVideo);
router.get("/actions/classes", requireAuth, listActionClasses);
router.post("/inference/start", requireAuth, startInference);
router.get("/quota", requireAuth, getQuotaStatus);
router.get("/admin/overview", requireAuth, requireAdmin, getAdminOverview);

export default router;