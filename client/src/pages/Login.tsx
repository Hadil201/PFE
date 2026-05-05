import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { GoogleLogin, googleLogout } from "@react-oauth/google";
import type { CredentialResponse } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setSession } from "../services/authStorage";

interface GoogleProfile {
    email?: string;
    name?: string;
    picture?: string;
}

const Login = () => {
    const navigate = useNavigate();
    const [credentials, setCredentials] = useState<GoogleProfile>({});
    const [error, setError] = useState("");

    const handleGoogleLogin = (credentialResponse: CredentialResponse) => {
        if (!credentialResponse.credential) {
            return;
        }
        const profile = jwtDecode<GoogleProfile>(credentialResponse.credential);
        if (!profile.email || !profile.name) {
            setError("Google profile is missing email or name.");
            return;
        }

        // Create a local token (mimicking backend behavior)
        const token = btoa(JSON.stringify({ email: profile.email, role: "user" }));

        const user = {
            email: profile.email,
            name: profile.name,
            picture: profile.picture,
            role: "user" as const,
            blocked: false,
        };

        setSession(token, user);
        setCredentials(profile);
        navigate("/");
    };

    return (
        <Box className="login-page">
            <Paper className="login-card" elevation={0}>
                <Stack spacing={2.5} sx={{ alignItems: "center" }}>
                    <Typography variant="h4">Analyse de Football</Typography>
                    <Typography color="text.secondary" sx={{ textAlign: "center" }}>
                        Connectez-vous pour gérer vos vidéos, vos tâches d'analyse et les paramètres de la plateforme.
                    </Typography>

                    {credentials.name && (
                        <>
                            <Typography>Bienvenue {credentials.name}</Typography>
                            <img className="login-avatar" src={credentials.picture} alt="profile" />
                        </>
                    )}

                    {!credentials.name && (
                        <>
                            <GoogleLogin
                                onSuccess={handleGoogleLogin}
                                onError={() => {
                                    setError("Connexion Google échouée");
                                }}
                            />
                        </>
                    )}

                    {credentials.name && (
                        <Button
                            variant="outlined"
                            onClick={() => {
                                googleLogout();
                                setCredentials({});
                                setError("");
                            }}
                        >
                            Déconnexion
                        </Button>
                    )}
                    {error && <Typography color="error">{error}</Typography>}
                </Stack>
            </Paper>
        </Box>
    );
};

export default Login;