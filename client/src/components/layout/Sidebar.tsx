import {
    Avatar,
    Box,
    Button,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Toolbar,
    Typography,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { clearSession, getUser } from "../../services/authStorage";
import { Archive, Home, ShieldCheck, Sparkles } from "lucide-react";

const drawerWidth = 280;

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const user = getUser();

    const menu = [
        { text: "Tableau de bord", path: "/", icon: <Home size={18} /> },
        { text: "Analyse", path: "/analysis", icon: <Sparkles size={18} /> },
        { text: "Bibliothèque", path: "/library", icon: <Archive size={18} /> },
        { text: "Admin", path: "/admin", icon: <ShieldCheck size={18} /> },
    ];

    return (
        <Drawer
            variant="permanent"
            sx={{
                width: drawerWidth,
                flexShrink: 0,
                "& .MuiDrawer-paper": {
                    width: drawerWidth,
                    boxSizing: "border-box",
                    background: "#040812",
                    color: "#e2e8f0",
                    borderRight: "1px solid rgba(148, 163, 184, 0.12)",
                    display: "flex",
                    flexDirection: "column",
                    px: 2,
                },
            }}
        >
            <Toolbar sx={{ px: 0, py: 3 }}>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 1.1, mb: 1 }}>
                        PITCHLENS PRO
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                        Analyse de soccer d'élite
                    </Typography>
                </Box>
            </Toolbar>

            <List sx={{ mt: 2, gap: 1 }}>
                {menu.map((item) => (
                    <ListItem key={item.text} disablePadding>
                        <ListItemButton
                            selected={location.pathname === item.path}
                            onClick={() => navigate(item.path)}
                            sx={{
                                borderRadius: 2,
                                mb: 1,
                                color: "#e2e8f0",
                                "&.Mui-selected": {
                                    backgroundColor: "rgba(34, 197, 94, 0.18)",
                                    color: "#22c55e",
                                },
                                "&:hover": {
                                    backgroundColor: "rgba(148, 163, 184, 0.08)",
                                },
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 40, color: "inherit" }}>
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText primary={<Typography sx={{ fontWeight: 600 }}>{item.text}</Typography>} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>

            <Box sx={{ mt: "auto", px: 1, py: 3, borderTop: "1px solid rgba(148, 163, 184, 0.12)" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                    <Avatar sx={{ bgcolor: "#0f172a", color: "#22c55e" }}>
                        {user?.name?.charAt(0).toUpperCase() ?? "H"}
                    </Avatar>
                    <Box>
                        <Typography variant="subtitle2" sx={{ color: "#f8fafc", fontWeight: 700 }}>
                            {user?.name ?? "Head Scout"}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                            {user?.role === "admin" ? "Admin" : "Division d'élite"}
                        </Typography>
                    </Box>
                </Box>
                <Button
                    variant="contained"
                    fullWidth
                    sx={{
                        background: "#22c55e",
                        color: "#020617",
                        fontWeight: 700,
                        boxShadow: "none",
                        '&:hover': { background: '#16a34a' },
                    }}
                    onClick={() => {
                        clearSession();
                        navigate("/login");
                    }}
                >
                    Logout
                </Button>
            </Box>
        </Drawer>
    );
}
