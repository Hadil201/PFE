import Layout from "../components/layout/Layout";
import VideoPlayer from "../components/VideoPlayer";
import Timeline from "../components/Timeline";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Checkbox,
    FormControl,
    FormControlLabel,
    MenuItem,
    Radio,
    RadioGroup,
    Select,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { addStream, addYoutube, getActionClasses, getSummarizationModels, getVideos, startInference, uploadVideo } from "../services/api";
import type { Video, ActionEvent } from "../types/video";

const GENERATED_SPOTTINGS = [
    {
        "id": "evt_1",
        "label": "kick-off",
        "start": 0,
        "end": 2,
        "confidence": 0.99
    },
    {
        "id": "evt_2",
        "label": "foul",
        "start": 145,
        "end": 150,
        "confidence": 0.88
    },
    {
        "id": "evt_3",
        "label": "yellow-card",
        "start": 155,
        "end": 160,
        "confidence": 0.95
    },
    {
        "id": "evt_4",
        "label": "free-kick",
        "start": 180,
        "end": 185,
        "confidence": 0.92
    },
    {
        "id": "evt_5",
        "label": "corner",
        "start": 310,
        "end": 320,
        "confidence": 0.85
    },
    {
        "id": "evt_6",
        "label": "shot-on-target",
        "start": 322,
        "end": 324,
        "confidence": 0.78
    },
    {
        "id": "evt_7",
        "label": "goal",
        "start": 324,
        "end": 335,
        "confidence": 0.99
    },
    {
        "id": "evt_8",
        "label": "substitution",
        "start": 450,
        "end": 465,
        "confidence": 0.91
    },
    {
        "id": "evt_9",
        "label": "offside",
        "start": 520,
        "end": 525,
        "confidence": 0.74
    },
    {
        "id": "evt_10",
        "label": "full-time",
        "start": 598,
        "end": 600,
        "confidence": 1.0
    }
]

export default function VideoAnalysis() {
    const [videos, setVideos] = useState<Video[]>([]);
    const [classes, setClasses] = useState<string[]>([]);
    const [summarizationModels, setSummarizationModels] = useState<string[]>([]);
    const [selectedVideoId, setSelectedVideoId] = useState("");
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
    const [modelName, setModelName] = useState("action-spotting-v1");
    const [chunkDuration, setChunkDuration] = useState(5);
    const [inferenceType, setInferenceType] = useState<"action-spotting" | "summarization">("action-spotting");
    const [sourceType, setSourceType] = useState<"youtube" | "stream" | "upload">("youtube");
    const [sourceUrl, setSourceUrl] = useState("");
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(0);
    const [timeline, setTimeline] = useState<ActionEvent[]>(GENERATED_SPOTTINGS);
    const [playhead, setPlayhead] = useState(0);
    const [statusMessage, setStatusMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [summary, setSummary] = useState("");
    const [loadingActions, setLoadingActions] = useState(true);
    const [loadingModels, setLoadingModels] = useState(true);

    const selectedVideo = useMemo(
        () => videos.find((video) => video._id === selectedVideoId),
        [selectedVideoId, videos]
    );

    const refreshData = async () => {
        setLoadingActions(true);
        setLoadingModels(true);
        try {
            const [videosData, classData, summarizationData] = await Promise.all([
                getVideos(),
                getActionClasses(),
                getSummarizationModels(),
            ]);
            setVideos(videosData);
            setClasses(classData);
            setSummarizationModels(summarizationData);
            if (!selectedVideoId && videosData.length > 0) {
                setSelectedVideoId(videosData[0]._id);
            }
        } catch (error: any) {
            console.error("Impossible de charger les données d'analyse", error);
            setErrorMessage(error?.response?.data?.message ?? "Impossible de charger les vidéos ou les options d'analyse.");
        } finally {
            setLoadingActions(false);
            setLoadingModels(false);
        }
    };

    useEffect(() => {
        void refreshData();
        const socket = io("http://localhost:5000");

        socket.on("inference:playhead", (payload: { position: number; videoId: string }) => {
            if (payload.videoId === selectedVideoId) {
                setPlayhead(payload.position);
            }
        });
        socket.on("inference:event", (payload: { videoId: string; event: ActionEvent }) => {
            if (payload.videoId === selectedVideoId) {
                setTimeline((prev) => [...prev, payload.event]);
            }
        });
        socket.on("inference:summary", (payload: { videoId: string; summary: string }) => {
            if (payload.videoId === selectedVideoId) {
                setSummary(payload.summary);
            }
        });
        socket.on("inference:started", () => {
            setStatusMessage("L'inférence a démarré.");
            setErrorMessage("");
        });
        socket.on("inference:completed", () => {
            setStatusMessage("L'inférence est terminée.");
            void refreshData();
        });

        return () => {
            socket.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedVideoId]);

    const handleSourceSubmit = async () => {
        if (!sourceUrl.trim()) {
            setErrorMessage("Veuillez fournir une URL source ou un chemin de fichier.");
            return;
        }
        setErrorMessage("");
        setStatusMessage("");

        try {
            let createdVideo: Video | null = null;

            if (sourceType === "youtube") {
                const response = await addYoutube(sourceUrl.trim());
                createdVideo = response as Video;
            } else if (sourceType === "stream") {
                const response = await addStream(sourceUrl.trim());
                createdVideo = response as Video;
            } else {
                const response = await uploadVideo({
                    title: sourceUrl.trim(),
                    url: sourceUrl.trim(),
                    startTime: startTime || undefined,
                    endTime: endTime || undefined,
                });
                createdVideo = response as Video;
            }

            await refreshData();
            if (createdVideo?._id) {
                setSelectedVideoId(createdVideo._id);
            }

            setSourceUrl("");
            setStartTime(0);
            setEndTime(0);
            setStatusMessage("L'analyse a démarrée avec succès.");
        } catch (error: any) {
            console.error("Impossible de démarrer l'analyse", error);
            setErrorMessage(error?.response?.data?.message ?? "Impossible d'ajouter la source. Vérifiez l'URL et réessayez.");
        }
    };

    const handleStart = async () => {
        if (!selectedVideoId) {
            setErrorMessage("Sélectionnez d'abord une vidéo.");
            return;
        }
        if (inferenceType === "action-spotting" && selectedClasses.length === 0) {
            setErrorMessage("Sélectionnez au moins une classe d'action.");
            return;
        }
        setTimeline([]);
        setPlayhead(0);
        setSummary("");
        setErrorMessage("");
        setStatusMessage("");
        try {
            await startInference({
                videoId: selectedVideoId,
                selectedClasses: inferenceType === "action-spotting" ? selectedClasses : [],
                modelName,
                chunkDuration,
                inferenceType,
            });
            setStatusMessage("L'analyse a démarrée avec succès.");
        } catch (error) {
            console.error("Impossible de démarrer l'analyse", error);
            setErrorMessage("Impossible de démarrer l'analyse. Vérifiez votre sélection vidéo et réessayez.");
        }
    };

    return (
        <Layout>
            <Stack spacing={3}>
                <Typography variant="h4">Analyse vidéo</Typography>

                <Card className="app-card">
                    <CardContent>
                        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                            <Select
                                size="small"
                                value={sourceType}
                                onChange={(event) =>
                                    setSourceType(event.target.value as "youtube" | "stream" | "upload")
                                }
                            >
                                <MenuItem value="youtube">YouTube</MenuItem>
                                <MenuItem value="stream">Flux M3U</MenuItem>
                                <MenuItem value="upload">Télécharger (métadonnées)</MenuItem>
                            </Select>
                            <TextField
                                size="small"
                                fullWidth
                                label="URL vidéo ou nom de fichier"
                                value={sourceUrl}
                                onChange={(event) => setSourceUrl(event.target.value)}
                            />
                            {sourceType === "upload" && (
                                <>
                                    <TextField
                                        size="small"
                                        label="Heure de début (sec)"
                                        type="number"
                                        value={startTime}
                                        onChange={(event) => setStartTime(Number(event.target.value))}
                                    />
                                    <TextField
                                        size="small"
                                        label="Heure de fin (sec)"
                                        type="number"
                                        value={endTime}
                                        onChange={(event) => setEndTime(Number(event.target.value))}
                                    />
                                </>
                            )}
                            <Button
                                variant="outlined"
                                onClick={() => void handleSourceSubmit()}
                                disabled={!sourceUrl.trim()}
                            >
                                Ajouter une source
                            </Button>
                        </Stack>

                        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                            <Select
                                size="small"
                                fullWidth
                                value={selectedVideoId}
                                onChange={(event) => setSelectedVideoId(event.target.value)}
                            >
                                <MenuItem value="" disabled>
                                    {videos.length > 0 ? "Sélectionner une vidéo" : "Aucune vidéo disponible"}
                                </MenuItem>
                                {videos.map((video) => (
                                    <MenuItem key={video._id} value={video._id}>
                                        {video.title}
                                    </MenuItem>
                                ))}
                            </Select>
                            <TextField
                                size="small"
                                label="Morceau (sec)"
                                type="number"
                                value={chunkDuration}
                                onChange={(event) => setChunkDuration(Number(event.target.value))}
                                sx={{ input: { min: 1 } }}
                            />
                            <Select
                                size="small"
                                value={inferenceType}
                                onChange={(event) => setInferenceType(event.target.value as "action-spotting" | "summarization")}
                            >
                                <MenuItem value="action-spotting">Détection d'action</MenuItem>
                                <MenuItem value="summarization">Résumé</MenuItem>
                            </Select>
                            <TextField
                                size="small"
                                label="Modèle"
                                value={modelName}
                                onChange={(event) => setModelName(event.target.value)}
                            />
                        </Stack>

                        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 1 }}>
                            {inferenceType === "action-spotting" && loadingActions && (
                                <Typography color="text.secondary">Chargement des classes d'action...</Typography>
                            )}
                            {inferenceType === "action-spotting" && !loadingActions && classes.length === 0 && (
                                <Typography color="text.secondary">Aucune classe d'action disponible.</Typography>
                            )}
                            {inferenceType === "action-spotting" && classes.map((actionClass) => (
                                <FormControlLabel
                                    key={actionClass}
                                    control={
                                        <Checkbox
                                            checked={selectedClasses.includes(actionClass)}
                                            onChange={(event) => {
                                                setSelectedClasses((prev) =>
                                                    event.target.checked
                                                        ? [...prev, actionClass]
                                                        : prev.filter((item) => item !== actionClass)
                                                );
                                            }}
                                        />
                                    }
                                    label={actionClass}
                                />
                            ))}
                            {inferenceType === "summarization" && loadingModels && (
                                <Typography color="text.secondary">Chargement des modèles de résumé...</Typography>
                            )}
                            {inferenceType === "summarization" && !loadingModels && summarizationModels.length === 0 && (
                                <Typography color="text.secondary">Aucun modèle de résumé disponible.</Typography>
                            )}
                            {inferenceType === "summarization" && (
                                <FormControl component="fieldset">
                                    <RadioGroup
                                        value={modelName}
                                        onChange={(event) => setModelName(event.target.value)}
                                    >
                                        {summarizationModels.map((model) => (
                                            <FormControlLabel
                                                key={model}
                                                value={model}
                                                control={<Radio />}
                                                label={model}
                                            />
                                        ))}
                                    </RadioGroup>
                                </FormControl>
                            )}
                        </Box>
                    </CardContent>
                </Card>

                <Box>
                    <Button
                        variant="contained"
                        onClick={() => void handleStart()}
                        disabled={!selectedVideoId || (inferenceType === "action-spotting" && selectedClasses.length === 0)}
                    >
                        Commencer l'analyse
                    </Button>
                </Box>
                {statusMessage && <Alert severity="success">{statusMessage}</Alert>}
                {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

                {selectedVideo && (
                    <Card className="app-card">
                        <CardContent>
                            <VideoPlayer
                                src={selectedVideo.url}
                                title={selectedVideo.title}
                                onTimeUpdate={(time) => setPlayhead(time)}
                            />
                        </CardContent>
                    </Card>
                )}

                <Card className="app-card">
                    <CardContent>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                            Analysis Timeline
                        </Typography>
                        <Timeline
                            events={timeline}
                            currentTime={playhead}
                            duration={1800} // Default 30 minutes, would come from video metadata
                            onEventClick={(event) => {
                                console.log('Event clicked:', event);
                                // Could seek video to event.start time
                            }}
                        />
                        {summary && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="h6" gutterBottom>
                                    Generated Summary
                                </Typography>
                                <Typography variant="body1">
                                    {summary}
                                </Typography>
                            </Box>
                        )}
                        {selectedVideo && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                                Video Status: {selectedVideo.status}
                            </Typography>
                        )}
                    </CardContent>
                </Card>
            </Stack>
        </Layout>
    );
}