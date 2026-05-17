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
    MenuItem,
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
import { blockUser, getAdminUsers, unblockUser, setUserQuota, getAllQuotas, createUser } from "../services/api";
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
    const [showAddUserForm, setShowAddUserForm] = useState(false);
    const [newUser, setNewUser] = useState({ name: "", email: "", role: "user" });
    const [isAddingUser, setIsAddingUser] = useState(false);
    const [addUserError, setAddUserError] = useState("");

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

    const handleAddUser = async () => {
        if (!newUser.name || !newUser.email) {
            setAddUserError("Le nom et l'email sont requis");
            return;
        }

        setIsAddingUser(true);
        setAddUserError("");

        try {
            await createUser({
                name: newUser.name,
                email: newUser.email,
                role: newUser.role as "admin" | "user"
            });

            // Refresh the users list
            await loadAdminData();

            // Reset form and close dialog
            setShowAddUserForm(false);
            setNewUser({ name: "", email: "", role: "user" });
            setAddUserError("");
        } catch (error: any) {
            setAddUserError(error?.response?.data?.message || "Erreur lors de l'ajout de l'utilisateur");
        } finally {
            setIsAddingUser(false);
        }
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
                            Console d'administration
                        </Typography>
                        <Typography sx={{ color: "#94a3b8", mt: 1 }}>
                            Gérez les utilisateurs et les paramètres de quota à partir d'un tableau d'administration unique.
                        </Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                        <Button
                            variant="outlined"
                            startIcon={<Download size={16} />}
                            sx={{ borderColor: "rgba(148, 163, 184, 0.24)", color: "#e2e8f0" }}
                            onClick={exportCsv}
                        >
                            Exporter CSV
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<Plus size={16} />}
                            sx={{ background: "#22c55e", color: "#020617", fontWeight: 700, '&:hover': { background: '#16a34a' } }}
                            onClick={() => setShowAddUserForm(true)}
                        >
                            Ajouter un utilisateur
                        </Button>
                    </Box>
                </Box>

                <Card className="app-card">
                    <CardContent>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2, mb: 3 }}>
                            <Box>
                                <Typography variant="h6" sx={{ color: "#f8fafc", fontWeight: 700 }}>
                                    Gestion des utilisateurs
                                </Typography>
                                <Typography sx={{ color: "#94a3b8" }}>
                                    Consultez les détails des comptes, le statut et les contrôles d'accès.
                                </Typography>
                            </Box>
                        </Box>

                        <TableContainer sx={{ background: "transparent" }}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ color: "#94a3b8", fontWeight: 700, borderBottom: "1px solid rgba(148, 163, 184, 0.16)" }}>
                                            NOM D'UTILISATEUR
                                        </TableCell>
                                        <TableCell sx={{ color: "#94a3b8", fontWeight: 700, borderBottom: "1px solid rgba(148, 163, 184, 0.16)" }}>
                                            EMAIL
                                        </TableCell>
                                        <TableCell sx={{ color: "#94a3b8", fontWeight: 700, borderBottom: "1px solid rgba(148, 163, 184, 0.16)" }}>
                                            RÔLE
                                        </TableCell>
                                        <TableCell sx={{ color: "#94a3b8", fontWeight: 700, borderBottom: "1px solid rgba(148, 163, 184, 0.16)" }}>
                                            STATUT
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
                                                    label={user.blocked ? "Bloqué" : "Actif"}
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
                                    Configuration des quotas
                                </Typography>
                                <Typography sx={{ color: "#94a3b8" }}>
                                    Appliquez des quotas globaux pour tous les utilisateurs actifs.
                                </Typography>
                            </Box>
                            <Chip label="Global" sx={{ background: "rgba(59, 130, 246, 0.12)", color: "#60a5fa", fontWeight: 700 }} />
                        </Box>

                        <Box sx={{ display: "grid", gap: 3 }}>
                            <TextField
                                label="Limite quotidienne (Heures)"
                                type="number"
                                value={globalQuotaValues.dailyLimit}
                                onChange={(e) => setGlobalQuotaValues((prev) => ({ ...prev, dailyLimit: Number(e.target.value) }))}
                            />
                            <TextField
                                label="Limite hebdomadaire (GB)"
                                type="number"
                                value={globalQuotaValues.weeklyLimit}
                                onChange={(e) => setGlobalQuotaValues((prev) => ({ ...prev, weeklyLimit: Number(e.target.value) }))}
                            />
                            <TextField
                                label="Flux simultanés"
                                type="number"
                                value={globalQuotaValues.simultaneousStreams}
                                onChange={(e) => setGlobalQuotaValues((prev) => ({ ...prev, simultaneousStreams: Number(e.target.value) }))}
                            />
                        </Box>

                        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap", mt: 4 }}>
                            <Button
                                variant="outlined"
                                sx={{ borderColor: "rgba(148, 163, 184, 0.24)", color: "#e2e8f0" }}
                                onClick={handleRestoreDefaults}
                            >
                                Restaurer les valeurs par défaut
                            </Button>
                            <Button
                                variant="contained"
                                sx={{ background: "#22c55e", color: "#020617", fontWeight: 700, '&:hover': { background: '#16a34a' } }}
                                onClick={handleApplyGlobalQuotas}
                                disabled={isApplyingGlobal}
                            >
                                Appliquer les quotas globaux
                            </Button>
                        </Box>
                    </CardContent>
                </Card>

                <Dialog open={showAddUserForm} onClose={() => setShowAddUserForm(false)} maxWidth="md">
                    <DialogTitle>Ajouter un nouvel utilisateur</DialogTitle>
                    <DialogContent>
                        <Box sx={{ display: "grid", gap: 2, mt: 1 }}>
                            <TextField
                                label="NOM D'UTILISATEUR"
                                value={newUser.name}
                                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                fullWidth
                                required
                            />
                            <TextField
                                label="EMAIL"
                                type="email"
                                value={newUser.email}
                                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                fullWidth
                                required
                            />
                            <TextField
                                label="RÔLE"
                                select
                                value={newUser.role}
                                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                fullWidth
                            >
                                <MenuItem value="user">Utilisateur</MenuItem>
                                <MenuItem value="admin">Administrateur</MenuItem>
                            </TextField>
                            {addUserError && (
                                <Typography color="error" variant="body2">
                                    {addUserError}
                                </Typography>
                            )}
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setShowAddUserForm(false)}>Annuler</Button>
                        <Button 
                            onClick={handleAddUser}
                            variant="contained"
                            disabled={isAddingUser}
                        >
                            {isAddingUser ? "Ajout en cours..." : "Ajouter"}
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog open={quotaDialog.open} onClose={() => setQuotaDialog({ open: false })} maxWidth="sm" fullWidth>
                    <DialogTitle>Modifier les quotas</DialogTitle>
                    <DialogContent>
                        <Box sx={{ display: "grid", gap: 2, mt: 1 }}>
                            <Typography sx={{ color: "#94a3b8" }}>
                                {quotaDialog.user?.name} - {quotaDialog.user?.email}
                            </Typography>
                            <TextField
                                label="Limite quotidienne"
                                type="number"
                                value={quotaValues.dailyLimit}
                                onChange={(e) => setQuotaValues((prev) => ({ ...prev, dailyLimit: Number(e.target.value) }))}
                                fullWidth
                            />
                            <TextField
                                label="Limite hebdomadaire"
                                type="number"
                                value={quotaValues.weeklyLimit}
                                onChange={(e) => setQuotaValues((prev) => ({ ...prev, weeklyLimit: Number(e.target.value) }))}
                                fullWidth
                            />
                            <TextField
                                label="Limite mensuelle"
                                type="number"
                                value={quotaValues.monthlyLimit}
                                onChange={(e) => setQuotaValues((prev) => ({ ...prev, monthlyLimit: Number(e.target.value) }))}
                                fullWidth
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setQuotaDialog({ open: false })}>Annuler</Button>
                        <Button onClick={() => void handleSaveQuota()} variant="contained" disabled={isSavingQuota}>
                            {isSavingQuota ? "Enregistrement..." : "Enregistrer"}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </Layout>
    );
}