import Layout from "../components/layout/Layout";
import VideoPlayer from "../components/VideoPlayer";
import Timeline from "../components/Timeline";
import {
    Alert,
    Box,
    Button,
    ButtonGroup,
    Card,
    CardContent,
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
import { addStream, addYoutube, getSummarizationModels, getVideos, startInference, uploadVideo } from "../services/api";
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

const parseM3U = (m3uContent: string): string[] => {
    const lines = m3uContent.split('\n');
    const channels: string[] = [];
    lines.forEach(line => {
        if (line.startsWith('#EXTINF')) {
            const match = line.match(/tvg-name="([^"]+)"|,(.*)/);
            if (match) {
                // Prioritize tvg-name if available, otherwise use the name after comma
                const channelName = match[1] || match[2];
                if (channelName) {
                    channels.push(channelName.trim());
                }
            }
        }
    });
    return channels;
};

export default function VideoAnalysis() {
    const [videos, setVideos] = useState<Video[]>([]);
    const [summarizationModels, setSummarizationModels] = useState<string[]>([]);
    const [selectedVideoId, setSelectedVideoId] = useState("");
    const [modelName, setModelName] = useState("V1");
    const [chunkDuration, setChunkDuration] = useState(5);
    const [inferenceType, setInferenceType] = useState<"action-spotting" | "summarization">("action-spotting");
    const [sourceType, setSourceType] = useState<"youtube" | "stream" | "upload">("youtube");
    const [sourceUrl, setSourceUrl] = useState("");
    const [channelsUrl, setChannelsUrl] = useState("");
    const [channelsList, setChannelsList] = useState<string[]>([]);
    const [selectedChannel, setSelectedChannel] = useState("");
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(0);
    const [timeline, setTimeline] = useState<ActionEvent[]>(GENERATED_SPOTTINGS);
    const [playhead, setPlayhead] = useState(0);
    const [statusMessage, setStatusMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [summary, setSummary] = useState("");
    const [loadingModels, setLoadingModels] = useState(true);

    const selectedVideo = useMemo(
        () => videos.find((video) => video._id === selectedVideoId),
        [selectedVideoId, videos]
    );

    useEffect(() => {
        const fetchChannels = async () => {
            if (sourceType === "stream" && channelsUrl) {
                try {
                    const response = await fetch(channelsUrl);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const text = await response.text();
                    const channelNames = parseM3U(text);
                    setChannelsList(channelNames);
                    setSelectedChannel(channelNames[0] || "");
                } catch (error) {
                    console.error("Error fetching or parsing M3U: ", error);
                    setErrorMessage("Impossible de charger les chaînes depuis l'URL.");
                    setChannelsList([]);
                    setSelectedChannel(""); // Clear the list on error
                }
            }
        };

        void fetchChannels();
    }, [channelsUrl, sourceType]);

    const refreshData = async () => {
        setLoadingModels(true);
        try {
            const [videosData, summarizationData] = await Promise.all([
                getVideos(),
                getSummarizationModels(),
            ]);
            setVideos(videosData);
            setSummarizationModels(summarizationData);
            if (!selectedVideoId && videosData.length > 0) {
                setSelectedVideoId(videosData[0]._id);
            }
        } catch (error: any) {
            console.error("Impossible de charger les données d'analyse", error);
            setErrorMessage(error?.response?.data?.message ?? "Impossible de charger les vidéos ou les options d'analyse.");
        } finally {
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
        const urlToUse = sourceType === "stream" ? channelsUrl : sourceUrl;
        
        if (!urlToUse?.trim() && sourceType !== "upload") {
            setErrorMessage("Veuillez fournir une URL source ou un chemin de fichier.");
            return;
        }
        
        if (sourceType === "upload" && !uploadFile) {
            setErrorMessage("Veuillez sélectionner un fichier vidéo.");
            return;
        }
        
        setErrorMessage("");
        setStatusMessage("");

        try {
            let createdVideo: Video | null = null;

            if (sourceType === "youtube") {
                const response = await addYoutube(urlToUse.trim());
                createdVideo = response as Video;
            } else if (sourceType === "stream") {
                const response = await addStream(urlToUse.trim());
                createdVideo = response as Video;
            } else {
                const response = await uploadVideo({
                    title: uploadFile?.name || sourceUrl.trim(),
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
            setChannelsUrl("");
            setUploadFile(null);
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
        setTimeline([]);
        setPlayhead(0);
        setSummary("");
        setErrorMessage("");
        setStatusMessage("");
        try {
            await startInference({
                videoId: selectedVideoId,
                selectedClasses: [],
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
                            <ButtonGroup>
                                <Button 
                                    variant={sourceType === "youtube" ? "contained" : "outlined"}
                                    onClick={() => setSourceType("youtube")}
                                >
                                    YouTube
                                </Button>
                                <Button 
                                    variant={sourceType === "stream" ? "contained" : "outlined"}
                                    onClick={() => setSourceType("stream")}
                                >
                                    Flux M3U
                                </Button>
                                <Button 
                                    variant={sourceType === "upload" ? "contained" : "outlined"}
                                    onClick={() => setSourceType("upload")}
                                >
                                    Télécharger
                                </Button>
                            </ButtonGroup>
                            
                            {sourceType === "youtube" && (
                                <TextField
                                    size="small"
                                    fullWidth
                                    label="URL YouTube"
                                    value={sourceUrl}
                                    onChange={(event) => setSourceUrl(event.target.value)}
                                />
                            )}
                            
                            {sourceType === "stream" && (
                                <>
                                    <TextField
                                        size="small"
                                        fullWidth
                                        label="URL des chaînes"
                                        value={channelsUrl}
                                        onChange={(event) => setChannelsUrl(event.target.value)}
                                    />
                                    <Select
                                        size="small"
                                        fullWidth
                                        label="Liste des chaînes"
                                        value={selectedChannel}
                                        onChange={(event) => setSelectedChannel(event.target.value)}
                                        displayEmpty
                                    >
                                        <MenuItem value="">Sélectionner une chaîne</MenuItem>
                                        {channelsList.map((channel, index) => (
                                            <MenuItem key={index} value={channel}>
                                                {channel}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </>
                            )}
                            
                            {sourceType === "upload" && (
                                <Button
                                    variant="outlined"
                                    component="label"
                                    sx={{ minWidth: '200px' }}
                                >
                                    Télécharger une vidéo
                                    <input
                                        type="file"
                                        accept="video/*"
                                        style={{ display: 'none' }}
                                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                                            const file = event.target.files?.[0];
                                            if (file) {
                                                setUploadFile(file);
                                                setSourceUrl(file.name);
                                            }
                                        }}
                                    />
                                </Button>
                            )}
                            
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
                            
                                                    </Stack>

                        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
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
                                onChange={(event) => {
                                    const newType = event.target.value as "action-spotting" | "summarization";
                                    setInferenceType(newType);
                                    setModelName(newType === "action-spotting" ? "V1" : "S1");
                                }}
                            >
                                <MenuItem value="action-spotting">Détection d'action</MenuItem>
                                <MenuItem value="summarization">Résumé</MenuItem>
                            </Select>
                            <Select
                                size="small"
                                label="Détection d'action et résumé"
                                value={modelName}
                                onChange={(event) => setModelName(event.target.value)}
                            >
                                {inferenceType === "action-spotting" ? (
                                    <>
                                        <MenuItem value="V1">V1</MenuItem>
                                        <MenuItem value="V2">V2</MenuItem>
                                    </>
                                ) : (
                                    <>
                                        <MenuItem value="S1">S1</MenuItem>
                                        <MenuItem value="S2">S2</MenuItem>
                                    </>
                                )}
                            </Select>
                        </Stack>

                        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 1 }}>
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
                        disabled={!selectedVideoId}
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
                        {inferenceType === "summarization" && (
                            <Box sx={{ mt: 3, p: 2, bgcolor: "rgba(255,255,255,0.05)", borderRadius: 2 }}>
                                <Typography variant="h6" sx={{ mb: 2, color: "#f8fafc" }}>
                                    Résumé détaillé de l'analyse
                                </Typography>
                                <Typography 
                                    variant="body1" 
                                    component="pre" 
                                    sx={{ 
                                        whiteSpace: "pre-wrap", 
                                        color: "#cbd5e1",
                                        fontSize: "14px",
                                        lineHeight: 1.6
                                    }}
                                >
                                    {generateTimelineSummary()}
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