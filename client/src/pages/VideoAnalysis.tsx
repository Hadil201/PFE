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
    MenuItem,
    Select,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { addStream, addYoutube, getVideos, startInference, uploadVideo } from "../services/api";
import type { Video, ActionEvent } from "../types/video";
import { Upload } from "@mui/icons-material";

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

interface M3UChannel {
    name: string;
    url: string;
}

const parseM3U = (m3uContent: string): M3UChannel[] => {
    const lines = m3uContent.split('\n');
    const channels: M3UChannel[] = [];
    let pendingName = "";

    lines.forEach((rawLine) => {
        const line = rawLine.trim();
        if (line.startsWith('#EXTINF')) {
            const match = line.match(/tvg-name="([^"]+)"|,(.*)/);
            if (match) {
                const channelName = match[1] || match[2];
                if (channelName) {
                    pendingName = channelName.trim();
                }
            }
        } else if (pendingName && line && !line.startsWith("#")) {
            channels.push({ name: pendingName, url: line });
            pendingName = "";
        }
    });

    return channels;
};

export default function VideoAnalysis() {
    const [videos, setVideos] = useState<Video[]>([]);
    const [selectedVideoId, setSelectedVideoId] = useState("");
    const [modelName, setModelName] = useState("V1");
    const [chunkDuration] = useState(5);
    const [inferenceType, setInferenceType] = useState<"action-spotting" | "summarization">("action-spotting");
    const [sourceType, setSourceType] = useState<"youtube" | "stream" | "upload">("youtube");
    const [sourceUrl, setSourceUrl] = useState("");
    const [channelsUrl, setChannelsUrl] = useState("https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8");
    const [channelsList, setChannelsList] = useState<M3UChannel[]>([]);
    const [selectedChannel, setSelectedChannel] = useState("");
    const [activeChannel, setActiveChannel] = useState<M3UChannel | null>(null);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(0);
    const [timeline, setTimeline] = useState<ActionEvent[]>(GENERATED_SPOTTINGS);
    const [playhead, setPlayhead] = useState(0);
    const [statusMessage, setStatusMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [summary, setSummary] = useState("");

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
                    const channels = parseM3U(text);
                    setChannelsList(channels);
                    setSelectedChannel(channels[0]?.url || "");
                } catch (error) {
                    console.error("Error fetching or parsing M3U: ", error);
                    setErrorMessage("Impossible de charger les chaînes depuis l'URL.");
                    setChannelsList([]);
                    setSelectedChannel("");
                }
            }
        };

        void fetchChannels();
    }, [channelsUrl, sourceType]);

    const refreshData = async () => {
        try {
            const videosData = await getVideos();
            setVideos(videosData);
            if (!selectedVideoId && videosData.length > 0) {
                setSelectedVideoId(videosData[0]._id);
            }
        } catch (error: any) {
            console.error("Impossible de charger les données d'analyse", error);
            setErrorMessage(error?.response?.data?.message ?? "Impossible de charger les vidéos ou les options d'analyse.");
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

    const createVideoFromCurrentSource = async () => {
        const selectedM3UChannel = channelsList.find((channel) => channel.url === selectedChannel);
        const streamUrl = selectedM3UChannel?.url || channelsUrl;
        const urlToUse = sourceType === "stream" ? streamUrl : sourceUrl;

        if (!urlToUse?.trim() && sourceType !== "upload") {
            setErrorMessage("Veuillez fournir une URL source ou un chemin de fichier.");
            return null;
        }

        if (sourceType === "upload" && !uploadFile) {
            setErrorMessage("Veuillez sélectionner un fichier vidéo.");
            return null;
        }

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
                    file: uploadFile ?? undefined,
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
            if (sourceType === "stream") {
                setActiveChannel(selectedM3UChannel ?? { name: "Flux M3U direct", url: streamUrl.trim() });
            }

            setSourceUrl("");
            setUploadFile(null);
            setStartTime(0);
            setEndTime(0);
            return createdVideo;
        } catch (error: any) {
            console.error("Impossible de démarrer l'analyse", error);
            setErrorMessage(error?.response?.data?.message ?? "Impossible d'ajouter la source. Vérifiez l'URL et réessayez.");
        }
    };

    const generateTimelineSummary = () => {
        if (timeline.length === 0) return "Aucun événement détecté dans la timeline.";

        const eventCounts = timeline.reduce((acc, event) => {
            acc[event.label] = (acc[event.label] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const totalEvents = timeline.length;
        const duration = timeline[timeline.length - 1]?.end || 0;
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;

        let summary = `**Analyse de la Timeline (Durée: ${minutes}:${seconds.toString().padStart(2, '0')})**\n\n`;
        summary += `**Total des événements détectés:** ${totalEvents}\n\n`;
        summary += `**Détail des événements par type:**\n`;

        Object.entries(eventCounts).forEach(([event, count]) => {
            const percentage = ((count / totalEvents) * 100).toFixed(1);
            summary += `- **${event}:** ${count} (${percentage}%)\n`;
        });

        summary += `\n**Chronologie des événements:**\n`;
        timeline.forEach((event, index) => {
            const time = `${Math.floor(event.start / 60)}:${(event.start % 60).toString().padStart(2, '0')}`;
            summary += `${index + 1}. **${time}** - ${event.label} (confiance: ${(event.confidence * 100).toFixed(1)}%)\n`;
        });

        return summary;
    };

    const handleStart = async () => {
        setTimeline([]);
        setPlayhead(0);
        setSummary("");
        setErrorMessage("");
        setStatusMessage("");
        try {
            const hasNewSource =
                sourceType === "upload"
                    ? Boolean(uploadFile)
                    : sourceType === "stream"
                        ? Boolean(selectedChannel || channelsUrl.trim())
                        : Boolean(sourceUrl.trim());
            let videoIdToAnalyze = selectedVideoId;

            if (hasNewSource) {
                const createdVideo = await createVideoFromCurrentSource();
                if (!createdVideo?._id) {
                    return;
                }
                videoIdToAnalyze = createdVideo._id;
            }

            if (!videoIdToAnalyze) {
                setErrorMessage("Sélectionnez d'abord une vidéo ou renseignez une source.");
                return;
            }

            await startInference({
                videoId: videoIdToAnalyze,
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
                                    M3U
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
                                    >
                                        <MenuItem value="">Sélectionner une chaîne</MenuItem>
                                        {channelsList.map((channel, index) => (
                                            <MenuItem key={`${channel.url}-${index}`} value={channel.url}>
                                                {channel.name}
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
                                    startIcon={<Upload />}
                                >
                                    Télécharger
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

                    </CardContent>
                </Card>

                <Box>
                    <Button
                        variant="contained"
                        onClick={() => void handleStart()}
                    >
                        Commencer l'analyse
                    </Button>
                </Box>
                {activeChannel && (
                    <Alert severity="info">
                        Chaîne M3U active : {activeChannel.name} ({activeChannel.url})
                    </Alert>
                )}
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
                                    {summary || generateTimelineSummary()}
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
