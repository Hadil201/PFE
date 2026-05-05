import { Box, Typography } from "@mui/material";

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
           
        </Box>
    );
}
