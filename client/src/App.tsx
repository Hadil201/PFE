import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { Box, Card, CardContent, Typography } from "@mui/material";
import type { ReactElement } from "react";
import Dashboard from "./pages/Dashboard";
import Library from "./pages/Library";
import Login from "./pages/Login";
import VideoAnalysis from "./pages/VideoAnalysis";
import Admin from "./pages/Admin";
import { createTheme } from "@mui/material/styles";
import { clearSession, getToken, getUser } from "./services/authStorage";

const theme = createTheme({
  palette: {
    mode: "dark"
  },
});

function RequireAuth({ children }: { children: ReactElement }) {
  const user = getUser();
  const token = getToken();
  if (!user || !token) {
    clearSession();
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RequireAdmin({ children }: { children: ReactElement }) {
  const user = getUser();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role?.toLowerCase() !== "admin") {
    return (
      <Box sx={{ minHeight: "100vh", px: 4, py: 8, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <Card className="app-card" sx={{ maxWidth: 600, width: "100%" }}>
          <CardContent>
            <Typography variant="h5" sx={{ color: "#f8fafc", fontWeight: 800, mb: 2 }}>
              Accès refusé
            </Typography>
            <Typography sx={{ color: "#94a3b8" }}>
              Vous n'avez pas le rôle d'administrateur. Connectez-vous avec un compte administrateur ou contactez votre administrateur système.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }
  return children;
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <Routes>
    -       <Route path="/login" element={<Login />} />
          <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/library" element={<RequireAuth><Library /></RequireAuth>} />
          <Route path="/analysis" element={<RequireAuth><VideoAnalysis /></RequireAuth>} />
          <Route path="/admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}