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
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { Download, Pencil, Plus, Slash, Unlock } from "lucide-react";
import { blockUser, getAdminUsers, unblockUser, setUserQuota, getAllQuotas } from "../services/api";
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
    const [users, setUsers] = useState<AppUser[]>([]);
    const [quotas, setQuotas] = useState<Quota[]>([]);
    const [quotaDialog, setQuotaDialog] = useState<{ open: boolean; user?: AppUser }>({ open: false });
    const [quotaValues, setQuotaValues] = useState({ dailyLimit: 12, weeklyLimit: 500, monthlyLimit: 5 });
    const [globalQuotaValues, setGlobalQuotaValues] = useState({ dailyLimit: 12, weeklyLimit: 500, simultaneousStreams: 5 });
    const [isSavingQuota, setIsSavingQuota] = useState(false);
    const [isApplyingGlobal, setIsApplyingGlobal] = useState(false);

    const loadAdminData = async () => {
        const [usersData, quotasData] = await Promise.all([getAdminUsers(), getAllQuotas()]);
        setUsers(usersData);
        setQuotas(quotasData);
    };

    useEffect(() => {
        void loadAdminData();
    }, []);

    const formatCsvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

    const exportCsv = () => {
        const headers = ["Username", "Email", "Role", "Status"];
        const rows = users.map((user) => [
            formatCsvCell(user.name),
            formatCsvCell(user.email),
            formatCsvCell(user.role),
            formatCsvCell(user.blocked ? "Blocked" : "Active"),
        ]);
        const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "admin-users.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

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
        setIsSavingQuota(true);
        await setUserQuota(quotaDialog.user.email, quotaValues);
        setIsSavingQuota(false);
        setQuotaDialog({ open: false });
        await loadAdminData();
    };

    const handleApplyGlobalQuotas = async () => {
        setIsApplyingGlobal(true);
        await Promise.all(
            users.map((user) =>
                setUserQuota(user.email, {
                    dailyLimit: globalQuotaValues.dailyLimit,
                    weeklyLimit: globalQuotaValues.weeklyLimit,
                })
            )
        );
        setIsApplyingGlobal(false);
        await loadAdminData();
    };

    const handleRestoreDefaults = () => {
        setGlobalQuotaValues({ dailyLimit: 12, weeklyLimit: 500, simultaneousStreams: 5 });
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
                            Manage users and quota settings from a single administrator dashboard.
                        </Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                        <Button
                            variant="outlined"
                            startIcon={<Download size={16} />}
                            sx={{ borderColor: "rgba(148, 163, 184, 0.24)", color: "#e2e8f0" }}
                            onClick={exportCsv}
                        >
                            Export CSV
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<Plus size={16} />}
                            sx={{ background: "#22c55e", color: "#020617", fontWeight: 700, '&:hover': { background: '#16a34a' } }}
                        >
                            Add User
                        </Button>
                    </Box>
                </Box>

                <Card className="app-card">
                    <CardContent>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2, mb: 3 }}>
                            <Box>
                                <Typography variant="h6" sx={{ color: "#f8fafc", fontWeight: 700 }}>
                                    User Management
                                </Typography>
                                <Typography sx={{ color: "#94a3b8" }}>
                                    Review account details, status, and access controls.
                                </Typography>
                            </Box>
                        </Box>

                        <TableContainer sx={{ background: "transparent" }}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ color: "#94a3b8", fontWeight: 700, borderBottom: "1px solid rgba(148, 163, 184, 0.16)" }}>
                                            USERNAME
                                        </TableCell>
                                        <TableCell sx={{ color: "#94a3b8", fontWeight: 700, borderBottom: "1px solid rgba(148, 163, 184, 0.16)" }}>
                                            EMAIL
                                        </TableCell>
                                        <TableCell sx={{ color: "#94a3b8", fontWeight: 700, borderBottom: "1px solid rgba(148, 163, 184, 0.16)" }}>
                                            ROLE
                                        </TableCell>
                                        <TableCell sx={{ color: "#94a3b8", fontWeight: 700, borderBottom: "1px solid rgba(148, 163, 184, 0.16)" }}>
                                            STATUS
                                        </TableCell>
                                        <TableCell align="right" sx={{ color: "#94a3b8", fontWeight: 700, borderBottom: "1px solid rgba(148, 163, 184, 0.16)" }}>
                                            ACTIONS
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {users.map((user) => (
                                        <TableRow key={user.email}>
                                            <TableCell sx={{ borderBottom: "1px solid rgba(148, 163, 184, 0.08)" }}>
                                                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                                    <Avatar sx={{ bgcolor: "#0f172a", color: "#22c55e" }}>
                                                        {user.name?.charAt(0).toUpperCase() ?? "U"}
                                                    </Avatar>
                                                    <Box>
                                                        <Typography sx={{ color: "#f8fafc", fontWeight: 700 }}>{user.name}</Typography>
                                                        <Typography sx={{ color: "#94a3b8", fontSize: 13 }}>{user.email}</Typography>
                                                    </Box>
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={{ color: "#94a3b8", borderBottom: "1px solid rgba(148, 163, 184, 0.08)" }}>
                                                {user.email}
                                            </TableCell>
                                            <TableCell sx={{ color: "#f8fafc", borderBottom: "1px solid rgba(148, 163, 184, 0.08)" }}>
                                                {user.role}
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: "1px solid rgba(148, 163, 184, 0.08)" }}>
                                                <Chip
                                                    label={user.blocked ? "Blocked" : "Active"}
                                                    sx={{
                                                        background: user.blocked ? "rgba(239, 68, 68, 0.12)" : "rgba(34, 197, 94, 0.12)",
                                                        color: user.blocked ? "#f87171" : "#22c55e",
                                                        fontWeight: 700,
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell align="right" sx={{ borderBottom: "1px solid rgba(148, 163, 184, 0.08)" }}>
                                                <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                                                    <IconButton
                                                        size="small"
                                                        sx={{
                                                            color: "#94a3b8",
                                                            border: "1px solid rgba(148, 163, 184, 0.16)",
                                                            '&:hover': { background: 'rgba(255,255,255,0.06)' },
                                                        }}
                                                        onClick={() => handleOpenQuotaDialog(user)}
                                                    >
                                                        <Pencil size={16} />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        sx={{
                                                            color: user.blocked ? "#22c55e" : "#f87171",
                                                            border: "1px solid rgba(148, 163, 184, 0.16)",
                                                            '&:hover': { background: 'rgba(255,255,255,0.06)' },
                                                        }}
                                                        onClick={() => void (user.blocked ? unblockUser(user.email) : blockUser(user.email)).then(loadAdminData)}
                                                    >
                                                        {user.blocked ? <Unlock size={16} /> : <Slash size={16} />}
                                                    </IconButton>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>

                <Card className="app-card">
                    <CardContent>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2, mb: 3 }}>
                            <Box>
                                <Typography variant="h6" sx={{ color: "#f8fafc", fontWeight: 700 }}>
                                    Quota Configuration
                                </Typography>
                                <Typography sx={{ color: "#94a3b8" }}>
                                    Apply global quotas for all active users.
                                </Typography>
                            </Box>
                            <Chip label="Global" sx={{ background: "rgba(59, 130, 246, 0.12)", color: "#60a5fa", fontWeight: 700 }} />
                        </Box>

                        <Box sx={{ display: "grid", gap: 3 }}>
                            <TextField
                                label="Daily Limit (Hours)"
                                type="number"
                                value={globalQuotaValues.dailyLimit}
                                onChange={(e) => setGlobalQuotaValues((prev) => ({ ...prev, dailyLimit: Number(e.target.value) }))}
                                InputLabelProps={{ shrink: true }}
                            />
                            <TextField
                                label="Weekly Limit (GB)"
                                type="number"
                                value={globalQuotaValues.weeklyLimit}
                                onChange={(e) => setGlobalQuotaValues((prev) => ({ ...prev, weeklyLimit: Number(e.target.value) }))}
                                InputLabelProps={{ shrink: true }}
                            />
                            <TextField
                                label="Simultaneous Streams"
                                type="number"
                                value={globalQuotaValues.simultaneousStreams}
                                onChange={(e) => setGlobalQuotaValues((prev) => ({ ...prev, simultaneousStreams: Number(e.target.value) }))}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Box>

                        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap", mt: 4 }}>
                            <Button
                                variant="outlined"
                                sx={{ borderColor: "rgba(148, 163, 184, 0.24)", color: "#e2e8f0" }}
                                onClick={handleRestoreDefaults}
                            >
                                Restore Defaults
                            </Button>
                            <Button
                                variant="contained"
                                sx={{ background: "#22c55e", color: "#020617", fontWeight: 700, '&:hover': { background: '#16a34a' } }}
                                onClick={handleApplyGlobalQuotas}
                                disabled={isApplyingGlobal}
                            >
                                Apply Global Quotas
                            </Button>
                        </Box>
                    </CardContent>
                </Card>

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
                        <Button onClick={() => void handleSaveQuota()} disabled={isSavingQuota}>
                            Save
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </Layout>
    );
}
