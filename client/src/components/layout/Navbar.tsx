import { Box, Button, Typography } from "@mui/material";
import { Sparkles } from "lucide-react";

export default function Navbar() {
    return (
        <Box
            sx={{
                height: 86,
                background: "#020617",
                color: "#f8fafc",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: { xs: 2, md: 3 },
                borderBottom: "1px solid rgba(148, 163, 184, 0.08)",
            }}
        >
            <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 0.3 }}>
                    Performance Dashboard
                </Typography>
                <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                    Real-time match insights and inference health.
                </Typography>
            </Box>
            <Button
                variant="contained"
                startIcon={<Sparkles size={18} />}
                sx={{
                    background: "#22c55e",
                    color: "#020617",
                    fontWeight: 700,
                    px: 3,
                    boxShadow: "none",
                    '&:hover': { background: '#16a34a' },
                }}
            >
                New Project
            </Button>
        </Box>
    );
}
