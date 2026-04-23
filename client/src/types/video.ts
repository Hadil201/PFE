
export interface Video {
    _id: string;
    title: string;
    source: "upload" | "youtube" | "stream";
    url: string;
    thumbnail?: string;
    status: "ready" | "processing" | "done";
    createdAt?: string;
}