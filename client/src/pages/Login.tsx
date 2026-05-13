import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { GoogleLogin, googleLogout } from "@react-oauth/google";
import type { CredentialResponse } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { setSession, getUser, clearSession } from "../services/authStorage";
import { loginWithGoogleProfile } from "../services/api";

interface GoogleProfile {
    email?: string;
    name?: string;
    picture?: string;
}

const Login = () => {
    const navigate = useNavigate();
    const [credentials, setCredentials] = useState<GoogleProfile>({});
    const [error, setError] = useState("");
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        if (!isInitialized) {
            const existingUser = getUser();
            if (existingUser && existingUser.name) {
                setCredentials({
                    email: existingUser.email,
                    name: existingUser.name,
                    picture: existingUser.picture,
                });

                if (window.location.pathname === "/login") {
                    navigate("/", { replace: true });
                }
            }
            setIsInitialized(true);
        }
    }, [isInitialized, navigate]);

    const handleGoogleLogin = async (credentialResponse: CredentialResponse) => {
        if (!credentialResponse.credential) {
            return;
        }

        const profile = jwtDecode<GoogleProfile>(credentialResponse.credential);
        if (!profile.email || !profile.name) {
            setError("Google profile is missing email or name.");
            return;
        }

        setIsLoggingIn(true);
        setError("");

        try {
            const session = await loginWithGoogleProfile({
                email: profile.email,
                name: profile.name,
                picture: profile.picture,
            });

            setSession(session.token, session.user);
            setCredentials(profile);
            navigate("/", { replace: true });
        } catch (loginError: any) {
            setError(loginError?.response?.data?.message ?? "Connexion refusee par le serveur.");
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <Box className="login-page">
            <Paper className="login-card" elevation={0}>
                <Stack spacing={2.5} sx={{ alignItems: "center" }}>
                    <Typography variant="h4">Analyse de Football</Typography>
                    <Typography color="text.secondary" sx={{ textAlign: "center" }}>
                        Connectez-vous pour gerer vos videos, vos taches d'analyse et les parametres de la plateforme.
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
                                onSuccess={(response) => void handleGoogleLogin(response)}
                                onError={() => {
                                    setError("Connexion Google echouee");
                                }}
                            />
                            {isLoggingIn && (
                                <Typography color="text.secondary">Connexion en cours...</Typography>
                            )}
                        </>
                    )}

                    {credentials.name && (
                        <Button
                            variant="outlined"
                            onClick={() => {
                                googleLogout();
                                clearSession();
                                setCredentials({});
                                setError("");
                                navigate("/login");
                            }}
                        >
                            Deconnexion
                        </Button>
                    )}
                    {error && <Typography color="error">{error}</Typography>}
                </Stack>
            </Paper>
        </Box>
    );
};

export default Login;
