import Layout from "../components/layout/Layout";
import { Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { blockUser, getAdminOverview, getAdminUsers, unblockUser } from "../services/api";
import type { AppUser } from "../types/auth";

export default function Admin() {
    const [overview, setOverview] = useState({
        usersCount: 0,
        videosCount: 0,
        activeStreams: 0,
        processingVideos: 0,
    });
    const [users, setUsers] = useState<AppUser[]>([]);

    const loadAdminData = async () => {
        const [overviewData, usersData] = await Promise.all([getAdminOverview(), getAdminUsers()]);
        setOverview(overviewData);
        setUsers(usersData);
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadAdminData();
    }, []);

    return (
        <Layout>
            <Box>
                <Typography variant="h4">Admin Panel</Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                    Manage users, quotas, and platform level settings.
                </Typography>

                <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
                    <Box>
                        <Card className="app-card">
                            <CardContent>
                                <Typography variant="h6">Users</Typography>
                                <Typography color="text.secondary">
                                    Total users: {overview.usersCount}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Box>
                    <Box>
                        <Card className="app-card">
                            <CardContent>
                                <Typography variant="h6">Storage Quotas</Typography>
                                <Typography color="text.secondary">
                                    Total videos: {overview.videosCount}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Box>
                    <Box>
                        <Card className="app-card">
                            <CardContent>
                                <Typography variant="h6">System Health</Typography>
                                <Typography color="text.secondary">
                                    Active streams: {overview.activeStreams} | Processing: {overview.processingVideos}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Box>
                </Box>

                <Stack spacing={1.5} sx={{ mt: 3 }}>
                    {users.map((user) => (
                        <Card key={user.email} className="app-card">
                            <CardContent sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                                <Box>
                                    <Typography variant="subtitle1">{user.name}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {user.email} - role: {user.role} - {user.blocked ? "blocked" : "active"}
                                    </Typography>
                                </Box>
                                <Button
                                    variant="outlined"
                                    color={user.blocked ? "success" : "error"}
                                    onClick={() =>
                                        void (user.blocked ? unblockUser(user.email) : blockUser(user.email)).then(loadAdminData)
                                    }
                                >
                                    {user.blocked ? "Unblock" : "Block"}
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </Stack>
            </Box>
        </Layout>
    );
}