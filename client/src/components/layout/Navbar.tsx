import { Box, Typography } from "@mui/material";

export default function Navbar() {
    return (
        <Box
            sx={{
                height: 60,
                background: "#ffffff",
                color: "#111827",
                display: "flex",
                alignItems: "center",
                px: 3,
                borderBottom: "1px solid #e5e7eb",
            }}
        >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Dashboard</Typography>
        </Box>
    );
}