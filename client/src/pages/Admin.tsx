import Layout from "../components/layout/Layout";
import {
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { Activity, Database, Lock, Settings, Unlock, Users } from "lucide-react";
import { blockUser, getAdminOverview, getAdminUsers, unblockUser, setUserQuota, getAllQuotas } from "../services/api";
import type { AppUser } from "../types/auth";

interface Quota {
    email: string;
    dailyLimit: number;
    weeklyLimit: number;
    monthlyLimit: number;
    dailyUsed: number;
    weeklyUsed: number;
    monthlyUsed: number;
}

export default function Admin() {
    const [overview, setOverview] = useState({
        usersCount: 0,
        videosCount: 0,
        activeStreams: 0,
        processingVideos: 0,
    });
    const [users, setUsers] = useState<AppUser[]>([]);
    const [quotas, setQuotas] = useState<Quota[]>([]);
    const [quotaDialog, setQuotaDialog] = useState<{ open: boolean; user?: AppUser }>({ open: false });
    const [quotaValues, setQuotaValues] = useState({ dailyLimit: 0, weeklyLimit: 0, monthlyLimit: 0 });

    const loadAdminData = async () => {
        const [overviewData, usersData, quotasData] = await Promise.all([getAdminOverview(), getAdminUsers(), getAllQuotas()]);
        setOverview(overviewData);
        setUsers(usersData);
        setQuotas(quotasData);
    };

    useEffect(() => {
        void loadAdminData();
    }, []);

    const handleOpenQuotaDialog = (user: AppUser) => {
        const userQuota = quotas.find((q) => q.email.toLowerCase() === user.email.toLowerCase());
        setQuotaValues({
            dailyLimit: userQuota?.dailyLimit ?? 10,
            weeklyLimit: userQuota?.weeklyLimit ?? 40,
            monthlyLimit: userQuota?.monthlyLimit ?? 120,
        });
        setQuotaDialog({ open: true, user });
    };

    const handleSaveQuota = async () => {
        if (!quotaDialog.user) return;
        await setUserQuota(quotaDialog.user.email, quotaValues);
        setQuotaDialog({ open: false });
        await loadAdminData();
    };

    return (
        <Layout>
            <Box sx={{ display: "grid", gap: 4 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
                    <Box>
                        <Typography variant="h4" sx={{ color: "#f8fafc", fontWeight: 800 }}>
                            Admin Console
                        </Typography>
                        <Typography sx={{ color: "#94a3b8", mt: 1 }}>
                            Manage users, quotas, and platform health from a single analytics view.
                        </Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                        <Button
                            variant="contained"
                            sx={{ background: "#22c55e", color: "#020617", fontWeight: 700, '&:hover': { background: '#16a34a' } }}
                        >
                            Create User
                        </Button>
                        <Button
                            variant="outlined"
                            sx={{ borderColor: "rgba(148, 163, 184, 0.24)", color: "#e2e8f0" }}
                            onClick={() => void loadAdminData()}
                        >
                            Refresh
                        </Button>
                    </Box>
                </Box>

                <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" } }}>
                    {[
                        {
                            title: "Users",
                            value: overview.usersCount,
                            description: "Active accounts with access to the platform.",
                            icon: <Users size={20} />,
                            iconColor: "#22c55e",
                            bg: "rgba(34, 197, 94, 0.12)",
                        },
                        {
                            title: "Videos",
                            value: overview.videosCount,
                            description: "Uploads and stored footage across the library.",
                            icon: <Database size={20} />,
                            iconColor: "#60a5fa",
                            bg: "rgba(59, 130, 246, 0.12)",
                        },
                        {
                            title: "Live Streams",
                            value: overview.activeStreams,
                            description: "Live match feeds currently active.",
                            icon: <Activity size={20} />,
                            iconColor: "#38bdf8",
                            bg: "rgba(56, 189, 248, 0.12)",
                        },
                    ].map((card) => (
                        <Card key={card.title} className="app-card">
                            <CardContent>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                                    <Box sx={{ p: 2, borderRadius: 2, background: card.bg, color: card.iconColor }}>
                                        {card.icon}
                                    </Box>
                                    <Box>
                                        <Typography variant="overline" sx={{ color: "#94a3b8", letterSpacing: 1.5 }}>
                                            {card.title}
                                        </Typography>
                                        <Typography variant="h4" sx={{ color: "#f8fafc", fontWeight: 800 }}>
                                            {card.value}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Typography sx={{ color: "#94a3b8" }}>{card.description}</Typography>
                            </CardContent>
                        </Card>
                    ))}
                </Box>

                <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", lg: "3fr 1fr" } }}>
                    <Card className="app-card">
                        <CardContent>
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
                                <Box>
                                    <Typography variant="h6" sx={{ color: "#f8fafc", fontWeight: 700 }}>
                                        User Management
                                    </Typography>
                                    <Typography sx={{ color: "#94a3b8" }}>Block accounts and update quota allocations for each user.</Typography>
                                </Box>
                                <Chip label="Admin View" sx={{ background: "rgba(34, 197, 94, 0.12)", color: "#22c55e", fontWeight: 700 }} />
                            </Box>

                            <Box sx={{ display: "grid", gap: 2 }}>
                                {users.map((user) => {
                                    const userQuota = quotas.find((q) => q.email.toLowerCase() === user.email.toLowerCase());
                                    return (
                                        <Card key={user.email} sx={{ background: "rgba(15, 23, 42, 0.92)", border: "1px solid rgba(148, 163, 184, 0.12)" }}>
                                            <CardContent>
                                                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 3, flexWrap: "wrap" }}>
                                                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                                        <Avatar sx={{ bgcolor: "#0f172a", color: "#22c55e" }}>
                                                            {user.name?.charAt(0).toUpperCase() ?? "U"}
                                                        </Avatar>
                                                        <Box>
                                                            <Typography sx={{ color: "#f8fafc", fontWeight: 700 }}>{user.name}</Typography>
                                                            <Typography sx={{ color: "#94a3b8", fontSize: 13 }}>{user.email}</Typography>
                                                            <Typography sx={{ color: "#94a3b8", fontSize: 13 }}>Role: {user.role}</Typography>
                                                        </Box>
                                                    </Box>

                                                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
                                                        <Chip
                                                            label={user.blocked ? "Blocked" : "Active"}
                                                            sx={{
                                                                background: user.blocked ? "rgba(239, 68, 68, 0.12)" : "rgba(34, 197, 94, 0.12)",
                                                                color: user.blocked ? "#f87171" : "#22c55e",
                                                                fontWeight: 700,
                                                            }}
                                                        />
                                                        <Typography sx={{ color: "#94a3b8", fontSize: 13 }}>
                                                            {userQuota
                                                                ? `${userQuota.dailyUsed}/${userQuota.dailyLimit}d • ${userQuota.weeklyUsed}/${userQuota.weeklyLimit}w`
                                                                : "No quota data"}
                                                        </Typography>
                                                    </Box>
                                                </Box>

                                                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 3 }}>
                                                    <Button
                                                        variant="outlined"
                                                        size="small"
                                                        sx={{ borderColor: "rgba(148, 163, 184, 0.24)", color: "#e2e8f0" }}
                                                        onClick={() => handleOpenQuotaDialog(user)}
                                                    >
                                                        Manage Quota
                                                    </Button>
                                                    <Button
                                                        variant="contained"
                                                        size="small"
                                                        color={user.blocked ? "success" : "error"}
                                                        startIcon={user.blocked ? <Unlock size={16} /> : <Lock size={16} />}
                                                        onClick={() =>
                                                            void (user.blocked ? unblockUser(user.email) : blockUser(user.email)).then(loadAdminData)
                                                        }
                                                    >
                                                        {user.blocked ? "Unblock" : "Block"}
                                                    </Button>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </Box>
                        </CardContent>
                    </Card>

                    <Card className="app-card">
                        <CardContent>
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                                <Box>
                                    <Typography variant="h6" sx={{ color: "#f8fafc", fontWeight: 700 }}>
                                        Platform Status
                                    </Typography>
                                    <Typography sx={{ color: "#94a3b8" }}>Live metrics and admin alerts.</Typography>
                                </Box>
                                <Settings size={20} color="#94a3b8" />
                            </Box>

                            <Box sx={{ display: "grid", gap: 2 }}>
                                <Box sx={{ p: 2, borderRadius: 2, background: "rgba(255,255,255,0.04)" }}>
                                    <Typography sx={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", mb: 1 }}>
                                        Queue Load
                                    </Typography>
                                    <Typography variant="h5" sx={{ color: "#f8fafc", fontWeight: 700 }}>
                                        {overview.processingVideos}
                                    </Typography>
                                </Box>
                                <Box sx={{ p: 2, borderRadius: 2, background: "rgba(255,255,255,0.04)" }}>
                                    <Typography sx={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", mb: 1 }}>
                                        Health Check
                                    </Typography>
                                    <Typography variant="h5" sx={{ color: "#f8fafc", fontWeight: 700 }}>
                                        {overview.activeStreams > 0 ? "Live" : "Idle"}
                                    </Typography>
                                </Box>
                                <Box sx={{ p: 2, borderRadius: 2, background: "rgba(255,255,255,0.04)" }}>
                                    <Typography sx={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", mb: 1 }}>
                                        Admin Alerts
                                    </Typography>
                                    <Typography variant="h5" sx={{ color: "#f8fafc", fontWeight: 700 }}>
                                        {overview.activeStreams > 5 ? "High load" : "Normal"}
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Box>

                <Dialog open={quotaDialog.open} onClose={() => setQuotaDialog({ open: false })}>
                    <DialogTitle>Manage Quota for {quotaDialog.user?.name}</DialogTitle>
                    <DialogContent>
                        <Box sx={{ display: "grid", gap: 2, mt: 1 }}>
                            <TextField
                                label="Daily Limit"
                                type="number"
                                value={quotaValues.dailyLimit}
                                onChange={(e) => setQuotaValues((prev) => ({ ...prev, dailyLimit: Number(e.target.value) }))}
                            />
                            <TextField
                                label="Weekly Limit"
                                type="number"
                                value={quotaValues.weeklyLimit}
                                onChange={(e) => setQuotaValues((prev) => ({ ...prev, weeklyLimit: Number(e.target.value) }))}
                            />
                            <TextField
                                label="Monthly Limit"
                                type="number"
                                value={quotaValues.monthlyLimit}
                                onChange={(e) => setQuotaValues((prev) => ({ ...prev, monthlyLimit: Number(e.target.value) }))}
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setQuotaDialog({ open: false })}>Cancel</Button>
                        <Button onClick={() => void handleSaveQuota()}>Save</Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </Layout>
    );
}
