import api from "./api";

export const getVideos = () => api.get("/videos");

export const uploadVideo = (formData: FormData) =>
    api.post("/videos/upload", formData);

export const addYoutube = (url: string) =>
    api.post("/videos/youtube", { url });

export const addStream = (url: string) =>
    api.post("/videos/stream", { url });

export const deleteVideo = (id: string) =>
    api.delete(`/videos/${id}`);