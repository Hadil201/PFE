export interface Video {
    _id: string;
    title: string;
    source: "upload" | "youtube" | "stream";
    url: string;
    thumbnail?: string;
    status: "ready" | "processing" | "done";
    createdAt?: string;
    startTime?: number;
    endTime?: number;
}

export interface ActionEvent {
    id: string;
    label: string;
    start: number;
    end: number;
    confidence: number;
}