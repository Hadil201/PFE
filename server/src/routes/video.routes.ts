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
    listSummarizationModels,
    startInference,
    setUserQuota,
    getAllQuotas,
} from "../controllers/video.controller";
import { requireAdmin, requireAuth } from "../middlewares/auth";
import { uploadVideo as uploadMiddleware } from "../middlewares/upload";

const router = Router();

router.get("/", requireAuth, getVideos);
router.post("/upload", requireAuth, uploadMiddleware, uploadVideo);
router.post("/youtube", requireAuth, addYoutube);
router.post("/stream", requireAuth, addStream);
router.delete("/:id", requireAuth, deleteVideo);
router.get("/actions/classes", requireAuth, listActionClasses);
router.get("/summarization/models", requireAuth, listSummarizationModels);
router.post("/inference/start", requireAuth, startInference);
router.get("/quota", requireAuth, getQuotaStatus);
router.get("/admin/overview", requireAuth, requireAdmin, getAdminOverview);
router.put("/admin/quota/:email", requireAuth, requireAdmin, setUserQuota);
router.get("/admin/quotas", requireAuth, requireAdmin, getAllQuotas);

export default router;