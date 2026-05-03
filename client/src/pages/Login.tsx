import { Box, Button, Paper, Stack, Typography, TextField } from "@mui/material";
import { GoogleLogin, googleLogout } from "@react-oauth/google";
import type { CredentialResponse } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithGoogleProfile } from "../services/api";
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
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");

    const handleTestLogin = async () => {
        if (!email || !name) {
            setError("Email and name are required");
            return;
        }
        try {
            const data = await loginWithGoogleProfile({
                email,
                name,
                picture: "",
            });
            setSession(data.token, data.user);
            navigate("/");
        } catch (err) {
            setError("Test login failed");
        }
    };

    return (
        <Box className="login-page">
            <Paper className="login-card" elevation={0}>
                <Stack spacing={2.5} sx={{ alignItems: "center" }}>
                    <Typography variant="h4">Soccer Analysis</Typography>
                    <Typography color="text.secondary" sx={{ textAlign: "center" }}>
                        Sign in to manage your videos, analysis jobs, and platform settings.
                    </Typography>

                    {credentials.name && (
                        <>
                            <Typography>Welcome {credentials.name}</Typography>
                            <img className="login-avatar" src={credentials.picture} alt="profile" />
                        </>
                    )}

                    {!credentials.name && (
                        <>
                            <Typography variant="h6">Test Login (for development)</Typography>
                            <TextField
                                label="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                fullWidth
                            />
                            <TextField
                                label="Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                fullWidth
                            />
                            <Button variant="outlined" onClick={handleTestLogin}>
                                Test Login
                            </Button>

                            <Typography>OR</Typography>

                            <GoogleLogin
                                onSuccess={(credentialResponse: CredentialResponse) => {
                                    if (!credentialResponse.credential) {
                                        return;
                                    }
                                    const profile = jwtDecode<GoogleProfile>(credentialResponse.credential);
                                    if (!profile.email || !profile.name) {
                                        setError("Google profile is missing email or name.");
                                        return;
                                    }
                                    void loginWithGoogleProfile({
                                        email: profile.email,
                                        name: profile.name,
                                        picture: profile.picture,
                                    })
                                        .then((data) => {
                                            setSession(data.token, data.user);
                                            setCredentials(profile);
                                            navigate("/");
                                        })
                                        .catch((requestError) => {
                                            setError(requestError?.response?.data?.message ?? "Login failed");
                                        });
                                }}
                                onError={() => {
                                    setError("Login Failed");
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
                            }}
                        >
                            Logout
                        </Button>
                    )}
                    {error && <Typography color="error">{error}</Typography>}
                </Stack>
            </Paper>
        </Box>
    );
};

export default Login;