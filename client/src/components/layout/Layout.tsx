import { Box } from "@mui/material";
import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

interface LayoutProps {
    children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    return (
        <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#f3f4f6" }}>
            <Sidebar />
            <Box sx={{ flexGrow: 1, ml: { xs: 0, md: "240px" } }}>
                <Navbar />
                <Box sx={{ p: 3 }}>{children}</Box>
            </Box>
        </Box>
    );
}