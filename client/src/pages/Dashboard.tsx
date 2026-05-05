import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getQuota, getVideos } from "../services/api";
import type { Video } from "../types/video";
import {
    Box,
    Button,
    Card,
    CardContent,
    LinearProgress,
    Stack,
    Typography,
} from "@mui/material";
import Layout from "../components/layout/Layout";
export default function Dashboard() {
    const navigate = useNavigate();
    const [videos, setVideos] = useState<Video[]>([]);
    const [quota, setQuota] = useState({
        dailyUsed: 0,
        dailyLimit: 0,
        weeklyUsed: 0,
        weeklyLimit: 0,
        monthlyUsed: 0,
        monthlyLimit: 0,
    });
    useEffect(() => {
        void Promise.all([getVideos(), getQuota()]).then(([videosData, quotaData]) => {
            setVideos(videosData);
            setQuota(quotaData);
        });
    }, []);
    const total = videos.length;
    const processed = videos.filter((v) => v.status === "done").length;
    const processing = videos.filter((v) => v.status === "processing").length;
    const ready = videos.filter((v) => v.status === "ready").length;
    return (
        <Layout>
            <Stack spacing={3}>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 3, flexWrap: "wrap" }}>
                    <Box sx={{ maxWidth: 640 }}>
                        <Typography variant="h3" sx={{ color: "#f8fafc", fontWeight: 800, mb: 1 }}>
                            Tableau de bord des performances
                        </Typography>
                        <Typography sx={{ color: "#94a3b8" }}>
                            Révision des inférences d'analyse de la Semaine 24 sur les flux actifs et les nœuds de calcul.
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        sx={{
                            background: "#22c55e",
                            color: "#020617",
                            fontWeight: 700,
                            px: 4,
                            '&:hover': { background: '#16a34a' },
                        }}
                        onClick={() => navigate("/analysis")}
                    >
                        Commencer une nouvelle analyse
                    </Button>
                </Box>
                <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr 1fr" } }}>
                    <Card className="app-card">
                        <CardContent>
                            <Typography sx={{ color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", fontSize: 12, mb: 1 }}>
                                Vidéos totales
                            </Typography>
                            <Typography variant="h4" sx={{ color: "#f8fafc", fontWeight: 800 }}>
                                {total}
                            </Typography>
                        </CardContent>
                    </Card>
                    <Card className="app-card">
                        <CardContent>
                            <Typography sx={{ color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", fontSize: 12, mb: 1 }}>
                                Traité
                            </Typography>
                            <Typography variant="h4" sx={{ color: "#f8fafc", fontWeight: 800 }}>
                                {processed}
                            </Typography>
                        </CardContent>
                    </Card>
                    <Card className="app-card">
                        <CardContent>
                            <Typography sx={{ color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", fontSize: 12, mb: 1 }}>
                                En cours de traitement
                            </Typography>
                            <Typography variant="h4" sx={{ color: "#f8fafc", fontWeight: 800 }}>
                                {processing}
                            </Typography>
                        </CardContent>
                    </Card>
                    <Card className="app-card">
                        <CardContent>
                            <Typography sx={{ color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", fontSize: 12, mb: 1 }}>
                                Prêt / Quotidien
                            </Typography>
                            <Typography variant="h4" sx={{ color: "#f8fafc", fontWeight: 800 }}>
                                {ready} / {quota.dailyUsed}/{quota.dailyLimit}
                            </Typography>
                        </CardContent>
                    </Card>
                </Box>
                <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", lg: "3fr 1fr" } }}>
                    <Stack spacing={3}>
                        <Card className="app-card">
                            <CardContent>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, gap: 2, flexWrap: "wrap" }}>
                                    <Box>
                                        <Typography sx={{ color: "#94a3b8", fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase" }}>
                                            Utilisation du quota
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: "#cbd5e1" }}>
                                            Total des heures de calcul sur les sessions actives.
                                        </Typography>
                                    </Box>
                                    <Typography sx={{ color: "#f8fafc", fontWeight: 700, mt: 1 }}>142.5 hrs</Typography>
                                </Box>
                                <Box sx={{ display: "grid", gap: 1.5, mb: 3 }}>
                                    <Box sx={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: 13 }}>
                                        <span>Quota restant</span>
                                        <span>57,5 h</span>
                                    </Box>
                                    <LinearProgress variant="determinate" value={68} sx={{ height: 10, borderRadius: 5, background: "rgba(148, 163, 184, 0.18)", '& .MuiLinearProgress-bar': { background: '#22c55e' } }} />
                                </Box>
                                <Box sx={{ display: "grid", gap: 2 }}>
                                    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                                        <Box sx={{ p: 2, background: "rgba(255,255,255,0.04)", borderRadius: 2 }}>
                                            <Typography sx={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", mb: 1 }}>Utilisé aujourd'hui</Typography>
                                            <Typography sx={{ color: "#f8fafc", fontWeight: 700 }}>16 h</Typography>
                                        </Box>
                                        <Box sx={{ p: 2, background: "rgba(255,255,255,0.04)", borderRadius: 2 }}>
                                            <Typography sx={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", mb: 1 }}>Limite mensuelle</Typography>
                                            <Typography sx={{ color: "#f8fafc", fontWeight: 700 }}>200 h</Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Stack>
                </Box>
            </Stack>
        </Layout>
    );
}

