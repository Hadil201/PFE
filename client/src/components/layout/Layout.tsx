import { Box } from "@mui/material";
import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

interface LayoutProps {
    children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    return (
        <Box sx={{ display: "flex", minHeight: "100vh", background: "#04060f" }}>
            <Sidebar />
            <Box sx={{ flexGrow: 1, ml: "280px", minHeight: "100vh", background: "#070b18" }}>
                <Navbar />
                <Box sx={{ p: { xs: 2, md: 4 } }}>{children}</Box>
            </Box>
        </Box>
    );
}
