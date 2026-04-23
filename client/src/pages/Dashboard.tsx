import { useEffect, useState } from "react";
import { getQuota, getVideos } from "../services/api";
import type { Video } from "../types/video";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Layout from "../components/layout/Layout";
export default function Dashboard() {
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
    const processed = videos.filter(v => v.status === "done").length;
    const processing = videos.filter(v => v.status === "processing").length;
    const ready = videos.filter(v => v.status === "ready").length;

    return (
        <Layout>
            <Box>
                <Typography variant="h4" sx={{ mb: 3 }}>
                    Dashboard
                </Typography>

                <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                    <Box>
                        <Card className="app-card">
                            <CardContent>
                                <Typography color="text.secondary">Total Videos</Typography>
                                <Typography variant="h5">{total}</Typography>
                            </CardContent>
                        </Card>
                    </Box>

                    <Box>
                        <Card className="app-card">
                            <CardContent>
                                <Typography color="text.secondary">Processed</Typography>
                                <Typography variant="h5">{processed}</Typography>
                            </CardContent>
                        </Card>
                    </Box>

                    <Box>
                        <Card className="app-card">
                            <CardContent>
                                <Typography color="text.secondary">Processing</Typography>
                                <Typography variant="h5">{processing}</Typography>
                            </CardContent>
                        </Card>
                    </Box>

                    <Box>
                        <Card className="app-card">
                            <CardContent>
                                <Typography color="text.secondary">Ready / Daily quota</Typography>
                                <Typography variant="h5">
                                    {ready} / {quota.dailyUsed}-{quota.dailyLimit}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Box>
                </Box>
            </Box>
        </Layout>
    );
}