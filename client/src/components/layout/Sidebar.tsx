import {
    Box,
    Button,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Toolbar,
    Typography,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { clearSession, getUser } from "../../services/authStorage";

const drawerWidth = 240;

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const user = getUser();

    const menu = [
        { text: "Dashboard", path: "/" },
        { text: "Library", path: "/library" },
        { text: "Analysis", path: "/analysis" },
        ...(user?.role === "admin" ? [{ text: "Admin", path: "/admin" }] : []),
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
                    background: "#111827",
                    color: "#fff",
                    borderRight: "none",
                    display: "flex",
                    flexDirection: "column",
                },
            }}
        >
            <Toolbar>
                <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Soccer Analysis
                    </Typography>
                </Box>
            </Toolbar>

            <List>
                {menu.map((item) => (
                    <ListItem key={item.text} disablePadding>
                        <ListItemButton
                            selected={location.pathname === item.path}
                            onClick={() => navigate(item.path)}
                            sx={{
                                "&.Mui-selected": {
                                    backgroundColor: "#2a2a40",
                                },
                                "&:hover": {
                                    backgroundColor: "#2a2a40",
                                },
                            }}
                        >
                            <ListItemText primary={item.text} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
            <Box sx={{ mt: "auto", p: 2 }}>
                <Typography variant="body2" sx={{ opacity: 0.8, mb: 1 }}>
                    {user?.name ?? "Unknown user"}
                </Typography>
                <Button
                    variant="outlined"
                    color="inherit"
                    fullWidth
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