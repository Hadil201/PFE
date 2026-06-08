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
                    Bibliothèque vidéo
                </Typography>

                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", mb: 3 }}>
                    

                    
                </Box>

                <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
                    {videos.length === 0 && (
                        <Box>
                            <Typography color="text.secondary">Aucune vidéo trouvée</Typography>
                        </Box>
                    )}

                    {videos.map((video) => (
                        <Box key={video._id}>
                            <Card className="app-card">
                                <CardMedia
                                    component="img"
                                    height="180"
                                    image={
                                        video.thumbnail ?
                                        (video.thumbnail.startsWith('http') ? video.thumbnail : `http://localhost:5000/${video.thumbnail}`) :
                                        "https://via.placeholder.com/300x160?text=No+Thumbnail"
                                    }
                                    sx={{ objectFit: 'cover' }}
                                />

                                <CardContent>
                                    <Stack spacing={1.5}>
                                        <Typography variant="h6" noWrap>{video.title}</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Statut: {video.status}
                                        </Typography>

                                        <Stack direction="row" spacing={1}>
                                            <Button
                                                variant="contained"
                                                size="small"
                                                onClick={() => navigate(`/analysis`, { state: { videoId: video._id } })}
                                                sx={{ background: "#3b82f6" }}
                                            >
                                                Resultat
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                size="small"
                                                onClick={() => handleDelete(video._id)}
                                            >
                                                Supprimer
                                            </Button>
                                        </Stack>
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