import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getQuota, getVideos } from "../services/api";
import type { Video } from "../types/video";
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    LinearProgress,
    Stack,
    Typography,
} from "@mui/material";
import { ArrowRight, Cloud, Cpu, Wifi, Zap } from "lucide-react";
import Layout from "../components/layout/Layout";

interface StreamItem {
    title: string;
    subtitle: string;
    status: "ready" | "processing" | "failed";
    progress: number;
}

const sampleStreams: StreamItem[] = [
    {
        title: "Manchester City vs Real Madrid",
        subtitle: "UEFA CL · 84m",
        status: "ready",
        progress: 100,
    },
    {
        title: "Liverpool vs Arsenal",
        subtitle: "PL · LIVE FEED",
        status: "processing",
        progress: 74,
    },
    {
        title: "PSG vs Dortmund",
        subtitle: "UEFA CL · 80m",
        status: "ready",
        progress: 100,
    },
    {
        title: "Inter vs Milan",
        subtitle: "M3U Timeout",
        status: "failed",
        progress: 0,
    },
];

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

    const recentStreams = useMemo<StreamItem[]>(
        () =>
            videos.length > 0
                ? videos.slice(-4).reverse().map((video) => ({
                    title: video.title,
                    subtitle: video.createdAt ? new Date(video.createdAt).toLocaleDateString() : "Live feed",
                    status: video.status === "done" ? "ready" : video.status,
                    progress: video.status === "processing" ? 60 : 100,
                }))
                : sampleStreams,
        [videos]
    );

    return (
        <Layout>
            <Stack spacing={3}>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 3, flexWrap: "wrap" }}>
                    <Box sx={{ maxWidth: 640 }}>
                        <Typography variant="h3" sx={{ color: "#f8fafc", fontWeight: 800, mb: 1 }}>
                            Performance Dashboard
                        </Typography>
                        <Typography sx={{ color: "#94a3b8" }}>
                            Reviewing Match Week 24 analysis inferences across active streams and compute nodes.
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
                        Start New Analysis
                    </Button>
                </Box>

                <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr 1fr" } }}>
                    <Card className="app-card">
                        <CardContent>
                            <Typography sx={{ color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", fontSize: 12, mb: 1 }}>
                                Total Videos
                            </Typography>
                            <Typography variant="h4" sx={{ color: "#f8fafc", fontWeight: 800 }}>
                                {total}
                            </Typography>
                        </CardContent>
                    </Card>
                    <Card className="app-card">
                        <CardContent>
                            <Typography sx={{ color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", fontSize: 12, mb: 1 }}>
                                Processed
                            </Typography>
                            <Typography variant="h4" sx={{ color: "#f8fafc", fontWeight: 800 }}>
                                {processed}
                            </Typography>
                        </CardContent>
                    </Card>
                    <Card className="app-card">
                        <CardContent>
                            <Typography sx={{ color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", fontSize: 12, mb: 1 }}>
                                Processing
                            </Typography>
                            <Typography variant="h4" sx={{ color: "#f8fafc", fontWeight: 800 }}>
                                {processing}
                            </Typography>
                        </CardContent>
                    </Card>
                    <Card className="app-card">
                        <CardContent>
                            <Typography sx={{ color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", fontSize: 12, mb: 1 }}>
                                Ready / Daily
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
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3, gap: 2, flexWrap: "wrap" }}>
                                    <Box>
                                        <Typography sx={{ color: "#94a3b8", fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase" }}>
                                            Inference Usage
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: "#cbd5e1" }}>
                                            Total compute hours across active sessions.
                                        </Typography>
                                    </Box>
                                    <Typography sx={{ color: "#f8fafc", fontWeight: 700, fontSize: 32 }}>
                                        142.5 hrs
                                    </Typography>
                                </Box>
                                <Box sx={{ display: "grid", gap: 1.5, mb: 3 }}>
                                    <Box sx={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: 13 }}>
                                        <span>Remaining quota</span>
                                        <span>57.5 hrs</span>
                                    </Box>
                                    <LinearProgress variant="determinate" value={68} sx={{ height: 10, borderRadius: 5, background: "rgba(148, 163, 184, 0.18)", '& .MuiLinearProgress-bar': { background: '#22c55e' } }} />
                                </Box>
                                <Box sx={{ display: "grid", gap: 2 }}>
                                    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                                        <Box sx={{ p: 2, background: "rgba(255,255,255,0.04)", borderRadius: 2 }}>
                                            <Typography sx={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", mb: 1 }}>Daily Used</Typography>
                                            <Typography sx={{ color: "#f8fafc", fontWeight: 700 }}>16 hrs</Typography>
                                        </Box>
                                        <Box sx={{ p: 2, background: "rgba(255,255,255,0.04)", borderRadius: 2 }}>
                                            <Typography sx={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", mb: 1 }}>Monthly Limit</Typography>
                                            <Typography sx={{ color: "#f8fafc", fontWeight: 700 }}>200 hrs</Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>

                        <Card className="app-card">
                            <CardContent>
                                <Typography sx={{ color: "#94a3b8", fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", mb: 3 }}>
                                    Recent Streams
                                </Typography>
                                <Stack spacing={2}>
                                    {recentStreams.map((stream) => (
                                        <Box key={stream.title} sx={{ p: 2, background: "rgba(255,255,255,0.04)", borderRadius: 3 }}>
                                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                                                <Box>
                                                    <Typography sx={{ color: "#f8fafc", fontWeight: 700 }}>{stream.title}</Typography>
                                                    <Typography sx={{ color: "#94a3b8", fontSize: 13 }}>{stream.subtitle}</Typography>
                                                </Box>
                                                <Chip
                                                    label={stream.status.toUpperCase()}
                                                    sx={{
                                                        background: stream.status === "ready" ? "#0f766e" : stream.status === "processing" ? "#1d4ed8" : "#b91c1c",
                                                        color: "#f8fafc",
                                                        fontWeight: 700,
                                                    }}
                                                />
                                            </Box>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }}>
                                                <Box sx={{ flexGrow: 1, background: "rgba(148, 163, 184, 0.12)", borderRadius: 999, overflow: "hidden", height: 10 }}>
                                                    <Box sx={{ width: `${stream.progress}%`, height: 10, background: stream.status === "failed" ? "#f97316" : "#22c55e" }} />
                                                </Box>
                                                <Typography sx={{ color: "#94a3b8", fontSize: 13 }}>{stream.progress}%</Typography>
                                            </Box>
                                        </Box>
                                    ))}
                                </Stack>
                            </CardContent>
                        </Card>
                    </Stack>

                    <Stack spacing={3}>
                        <Card className="app-card">
                            <CardContent>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                                    <Box>
                                        <Typography sx={{ color: "#94a3b8", fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase" }}>
                                            Storage Usage
                                        </Typography>
                                        <Typography sx={{ color: "#f8fafc", fontWeight: 700, mt: 1 }}>4.2 TB</Typography>
                                    </Box>
                                    <Box sx={{ bgcolor: "rgba(34,197,94,0.16)", color: "#22c55e", p: 1.5, borderRadius: 2 }}>
                                        <Cloud size={18} />
                                    </Box>
                                </Box>
                                <LinearProgress variant="determinate" value={68} sx={{ height: 10, borderRadius: 5, background: "rgba(148, 163, 184, 0.18)", '& .MuiLinearProgress-bar': { background: '#22c55e' } }} />
                                <Typography sx={{ color: "#94a3b8", fontSize: 13, mt: 2 }}>Google Drive · 68% used</Typography>
                            </CardContent>
                        </Card>
                        <Card className="app-card">
                            <CardContent>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                                    <Box>
                                        <Typography sx={{ color: "#94a3b8", fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase" }}>
                                            Active Nodes
                                        </Typography>
                                        <Typography sx={{ color: "#f8fafc", fontWeight: 700, mt: 1 }}>32 / 40</Typography>
                                    </Box>
                                    <Box sx={{ bgcolor: "rgba(56,189,248,0.16)", color: "#38bdf8", p: 1.5, borderRadius: 2 }}>
                                        <Cpu size={18} />
                                    </Box>
                                </Box>
                                <LinearProgress variant="determinate" value={80} sx={{ height: 10, borderRadius: 5, background: "rgba(148, 163, 184, 0.18)", '& .MuiLinearProgress-bar': { background: '#38bdf8' } }} />
                                <Typography sx={{ color: "#94a3b8", fontSize: 13, mt: 2 }}>Inference clusters active</Typography>
                            </CardContent>
                        </Card>
                        <Card className="app-card">
                            <CardContent>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                                    <Box>
                                        <Typography sx={{ color: "#94a3b8", fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase" }}>
                                            Avg Latency
                                        </Typography>
                                        <Typography sx={{ color: "#f8fafc", fontWeight: 700, mt: 1 }}>42 ms</Typography>
                                    </Box>
                                    <Box sx={{ bgcolor: "rgba(34,197,94,0.16)", color: "#22c55e", p: 1.5, borderRadius: 2 }}>
                                        <ArrowRight size={18} />
                                    </Box>
                                </Box>
                                <Typography sx={{ color: "#94a3b8", fontSize: 13 }}>Real-time tracking delay</Typography>
                            </CardContent>
                        </Card>
                        <Card className="app-card">
                            <CardContent>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                                    <Box>
                                        <Typography sx={{ color: "#94a3b8", fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase" }}>
                                            Network In
                                        </Typography>
                                        <Typography sx={{ color: "#f8fafc", fontWeight: 700, mt: 1 }}>1.2 GB/s</Typography>
                                    </Box>
                                    <Box sx={{ bgcolor: "rgba(56,189,248,0.16)", color: "#38bdf8", p: 1.5, borderRadius: 2 }}>
                                        <Wifi size={18} />
                                    </Box>
                                </Box>
                                <Typography sx={{ color: "#94a3b8", fontSize: 13 }}>Global throughput</Typography>
                            </CardContent>
                        </Card>
                        <Card className="app-card" sx={{ background: "#071018" }}>
                            <CardContent sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
                                <Box>
                                    <Typography sx={{ color: "#94a3b8", fontSize: 13, textTransform: "uppercase", letterSpacing: 1.2, mb: 1 }}>
                                        System Status
                                    </Typography>
                                    <Typography sx={{ color: "#f8fafc", fontWeight: 700 }}>
                                        AI Processing: 14 Nodes Idle
                                    </Typography>
                                </Box>
                                <Zap size={24} color="#22c55e" />
                            </CardContent>
                        </Card>
                    </Stack>
                </Box>
            </Stack>
        </Layout>
    );
}
