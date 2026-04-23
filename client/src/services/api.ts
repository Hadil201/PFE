import axios from "axios";
import { getToken } from "./authStorage";

const API = "http://localhost:5000/api";
const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const getVideos = async () => {
    const res = await api.get("/videos");
    return res.data;
};

export const uploadVideo = async (payload: { title: string; url: string }) => {
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

export const startInference = async (payload: {
    videoId: string;
    selectedClasses: string[];
    modelName: string;
    chunkDuration: number;
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

export default api;