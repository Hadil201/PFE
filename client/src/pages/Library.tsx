// src/pages/Library.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Video } from "../types/video";
import { getVideos, deleteVideo } from "../services/api";
import { getUser } from "../services/authStorage";
import {
    Box,
    Typography,
    CircularProgress,
    Button,
    Card,
    CardContent,
    CardMedia,
    Stack,
} from "@mui/material";
import Layout from "../components/layout/Layout";

export default function Library() {
    const navigate = useNavigate();
    const user = getUser();
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchVideos = async () => {
        const data = await getVideos();
        setVideos(data);
        setLoading(false);
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchVideos();
    }, []);

    const handleDelete = async (id: string) => {
        setLoading(true);
        await deleteVideo(id);
        await fetchVideos();
    };

    if (loading) return <CircularProgress />;

    return (
        <Layout>
            <Box>
                <Typography variant="h4" sx={{ mb: 1 }}>
                    Video Library
                </Typography>

                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", mb: 3 }}>
                    <Button
                        variant="contained"
                        sx={{ background: "#22c55e", color: "#020617", '&:hover': { background: '#16a34a' } }}
                        onClick={() => navigate("/analysis")}
                    >
                        Upload Video
                    </Button>
                    <Button variant="outlined" onClick={() => void fetchVideos()}>
                        Refresh
                    </Button>
                    {user?.role === "admin" && (
                        <Button
                            variant="contained"
                            sx={{ background: "#2563eb", color: "#ffffff", '&:hover': { background: '#1d4ed8' } }}
                            onClick={() => navigate("/admin")}
                        >
                            Admin Panel
                        </Button>
                    )}
                </Box>

                <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
                    {videos.length === 0 && (
                        <Box>
                            <Typography color="text.secondary">No videos found</Typography>
                        </Box>
                    )}

                    {videos.map((video) => (
                        <Box key={video._id}>
                            <Card className="app-card">
                                <CardMedia
                                    component="img"
                                    height="180"
                                    image={
                                        video.thumbnail ||
                                        "https://via.placeholder.com/300x160"
                                    }
                                />

                                <CardContent>
                                    <Stack spacing={1.5}>
                                        <Typography variant="h6">{video.title}</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Status: {video.status}
                                        </Typography>

                                        <Box>
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                onClick={() => handleDelete(video._id)}
                                            >
                                                Delete
                                            </Button>
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Box>
                    ))}
                </Box>
            </Box>
        </Layout>
    );
}