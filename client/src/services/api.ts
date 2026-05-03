import axios from "axios";
import { clearSession, getToken } from "./authStorage";

const API = "http://localhost:5000/api";
const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            clearSession();
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);

export const getVideos = async () => {
    const res = await api.get("/videos");
    return res.data;
};

export const uploadVideo = async (payload: { title: string; url: string; startTime?: number; endTime?: number }) => {
    const res = await api.post("/videos/upload", payload);
    return res.data;
};

export const addYoutube = async (url: string) => {
    const res = await api.post("/videos/youtube", { url });
    return res.data;
};

export const addStream = async (url: string) => {
    const res = await api.post("/videos/stream", { url });
    return res.data;
};

export const deleteVideo = async (id: string) => {
    return api.delete(`/videos/${id}`);
};

export const loginWithGoogleProfile = async (payload: {
    email: string;
    name: string;
    picture?: string;
}) => {
    const res = await api.post("/auth/google", payload);
    return res.data;
};

export const getMe = async () => {
    const res = await api.get("/auth/me");
    return res.data;
};

export const getActionClasses = async (): Promise<string[]> => {
    const res = await api.get("/videos/actions/classes");
    return res.data;
};

export const getSummarizationModels = async (): Promise<string[]> => {
    const res = await api.get("/videos/summarization/models");
    return res.data;
};

export const startInference = async (payload: {
    videoId: string;
    selectedClasses: string[];
    modelName: string;
    chunkDuration: number;
    inferenceType?: "action-spotting" | "summarization";
}) => {
    const res = await api.post("/videos/inference/start", payload);
    return res.data;
};

export const getQuota = async () => {
    const res = await api.get("/videos/quota");
    return res.data;
};

export const getAdminOverview = async () => {
    const res = await api.get("/videos/admin/overview");
    return res.data;
};

export const getAdminUsers = async () => {
    const res = await api.get("/auth/users");
    return res.data;
};

export const blockUser = async (email: string) => {
    const res = await api.patch(`/auth/users/${encodeURIComponent(email)}/block`);
    return res.data;
};

export const unblockUser = async (email: string) => {
    const res = await api.patch(`/auth/users/${encodeURIComponent(email)}/unblock`);
    return res.data;
};

export const setUserQuota = async (email: string, quota: { dailyLimit?: number; weeklyLimit?: number; monthlyLimit?: number }) => {
    const res = await api.put(`/videos/admin/quota/${encodeURIComponent(email)}`, quota);
    return res.data;
};

export const getAllQuotas = async () => {
    const res = await api.get("/videos/admin/quotas");
    return res.data;
};

export default api;