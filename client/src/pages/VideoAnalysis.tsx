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
    CircularProgress,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    type SelectChangeEvent,
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

const extractYoutubeId = (url: string): string | null => {
    if (!url) return null;
    const regex = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/|live\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;
    const match = url.match(regex);
    if (match && match[1] && match[1].length === 11) return match[1];
    return null;
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
    const [videoDuration, setVideoDuration] = useState(0);

    const [isProcessing, setIsProcessing] = useState(false);

    // Auto-register or select YouTube video when URL is entered
    useEffect(() => {
        const trimmedUrl = sourceUrl.trim();
        if (!trimmedUrl || isProcessing) return;
        
        const ytId = extractYoutubeId(trimmedUrl);
        
        if (sourceType === "youtube" && ytId) {
            const normalizedUrl = `https://www.youtube.com/watch?v=${ytId}`;
            
            const timer = setTimeout(async () => {
                if (isProcessing) return;

                // Check against both raw and normalized URLs in the library
                const existingVideo = videos.find(v => 
                    v.url === normalizedUrl || 
                    extractYoutubeId(v.url) === ytId
                );
                
                if (existingVideo) {
                    if (selectedVideoId !== existingVideo._id) {
                        setSelectedVideoId(existingVideo._id);
                    }
                } else {
                    void createVideoFromCurrentSource();
                }
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [sourceUrl, sourceType, videos, isProcessing, selectedVideoId]);

    // Auto-play when channel is selected
    useEffect(() => {
        if (sourceType === "stream" && selectedChannel) {
            const channel = channelsList.find(c => c.url === selectedChannel);
            if (channel) {
                setActiveChannel(channel);
                // Also clear messages when switching
                setStatusMessage("");
                setErrorMessage("");
            }
        }
    }, [selectedChannel, sourceType, channelsList]);

    useEffect(() => {
        if (inferenceType === "action-spotting") {
            if (modelName !== "V1" && modelName !== "V2") {
                setModelName("V1");
            }
        } else {
            if (modelName !== "S1" && modelName !== "S2") {
                setModelName("S1");
            }
        }
    }, [inferenceType, modelName]);

    const videoToPlay = useMemo(() => {
        // 1. Priority: Active M3U stream
        if (sourceType === "stream" && activeChannel) {
            return {
                url: activeChannel.url,
                title: activeChannel.name,
                status: "live"
            };
        }
        
        // 2. Secondary: Currently selected video from list
        const selected = videos.find((video) => video._id === selectedVideoId);
        if (selected) return selected;

        // 3. Fallback: Most recent video of the current source type
        if (sourceType === "upload" || sourceType === "youtube") {
            const filtered = videos.filter(v => v.source === sourceType);
            if (filtered.length > 0) return filtered[0];
        }

        return null;
    }, [selectedVideoId, videos, activeChannel, sourceType]);

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

    const createVideoFromCurrentSource = async (fileToUpload?: File) => {
        const selectedM3UChannel = channelsList.find((channel) => channel.url === selectedChannel);
        const streamUrl = selectedM3UChannel?.url || channelsUrl;
        const urlToUse = sourceType === "stream" ? streamUrl : sourceUrl;
        const file = fileToUpload || uploadFile;

        if (!urlToUse?.trim() && sourceType !== "upload") {
            setErrorMessage("Veuillez fournir une URL source ou un chemin de fichier.");
            return null;
        }

        if (sourceType === "upload" && !file) {
            setErrorMessage("Veuillez sélectionner un fichier vidéo.");
            return null;
        }

        setIsProcessing(true);
        try {
            let createdVideo: Video | null = null;
            console.log("Creating video from source:", sourceType, urlToUse);

            if (sourceType === "youtube") {
                const response = await addYoutube(urlToUse.trim());
                console.log("YouTube addition response:", response);
                createdVideo = response as Video;
            } else if (sourceType === "stream") {
                const response = await addStream(urlToUse.trim());
                console.log("Stream addition response:", response);
                createdVideo = response as Video;
            } else {
                const response = await uploadVideo({
                    title: file?.name || sourceUrl.trim(),
                    file: file ?? undefined,
                    url: sourceUrl.trim(),
                    startTime: startTime || undefined,
                    endTime: endTime || undefined,
                });
                console.log("Upload addition response:", response);
                createdVideo = response as Video;
            }

            console.log("Refreshing data...");
            await refreshData();
            
            if (createdVideo?._id) {
                console.log("Setting selected video ID:", createdVideo._id);
                setSelectedVideoId(createdVideo._id);
                // Force sourceType if needed to ensure videoToPlay updates correctly
                if (sourceType === "upload") setSourceType("upload");
                if (sourceType === "youtube") setSourceType("youtube");
            }
            
            if (sourceType === "stream") {
                setActiveChannel(selectedM3UChannel ?? { name: "Flux M3U direct", url: streamUrl.trim() });
            }

            // For YouTube, we keep the URL in the field so the user sees what they put
            if (sourceType !== "youtube") {
                setSourceUrl("");
            }
            setUploadFile(null);
            setStartTime(0);
            setEndTime(0);
            return createdVideo;
        } catch (error: any) {
            console.error("Error creating video from source:", error);
            const serverMsg = error?.response?.data?.message;
            const fallbackMsg = "Impossible d'ajouter la source. Vérifiez l'URL et réessayez.";
            setErrorMessage(serverMsg || fallbackMsg);
            return null;
        } finally {
            console.log("Source processing finished.");
            setIsProcessing(false);
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
            const isStream = sourceType === "stream";
            const hasNewSource =
                sourceType === "upload"
                    ? Boolean(uploadFile)
                    : isStream
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

            // For streams, ensure the player starts immediately with the correct source
            if (isStream && !selectedVideoId) {
                setSelectedVideoId(videoIdToAnalyze);
            }
        } catch (error: any) {
            console.error("Impossible de démarrer l'analyse", error);
            const msg = error?.response?.data?.message || "Impossible de démarrer l'analyse. Vérifiez votre sélection vidéo et réessayez.";
            setErrorMessage(msg);
        }
    };

    return (
        <Layout>
            <Stack spacing={3}>
                <Typography variant="h4">Analyse vidéo</Typography>

                <Card className="app-card">
                    <CardContent>
                        <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
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

                            <FormControl size="small" sx={{ minWidth: 250 }}>
                                <InputLabel id="library-select-label">Bibliothèque</InputLabel>
                                <Select
                                    labelId="library-select-label"
                                    label="Bibliothèque"
                                    value={selectedVideoId}
                                    onChange={(event: SelectChangeEvent) => {
                                        const vidId = event.target.value;
                                        setSelectedVideoId(vidId);
                                        const vid = videos.find(v => v._id === vidId);
                                        if (vid) {
                                            setSourceType(vid.source);
                                            if (vid.source === "youtube") setSourceUrl(vid.url);
                                        }
                                    }}
                                >
                                    <MenuItem value=""><em>Choisir une vidéo...</em></MenuItem>
                                    {videos.map((v) => (
                                        <MenuItem key={v._id} value={v._id}>
                                            {v.title}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Stack>

                        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
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
                                    <FormControl size="small" fullWidth>
                                        <InputLabel id="channel-select-label">Liste des chaînes</InputLabel>
                                        <Select
                                            labelId="channel-select-label"
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
                                    </FormControl>
                                </>
                            )}

                            {sourceType === "upload" && (
                                <Button
                                    variant="outlined"
                                    component="label"
                                    sx={{ minWidth: '200px' }}
                                    startIcon={<Upload />}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? "Téléchargement..." : "Télécharger"}
                                    <input
                                        type="file"
                                        accept="video/*"
                                        style={{ display: 'none' }}
                                        onChange={async (event: React.ChangeEvent<HTMLInputElement>) => {
                                            const file = event.target.files?.[0];
                                            if (file) {
                                                setIsProcessing(true);
                                                setUploadFile(file);
                                                setSourceUrl(file.name);
                                                await createVideoFromCurrentSource(file);
                                                setIsProcessing(false);
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
                            <FormControl size="small" sx={{ minWidth: 200 }}>
                                <InputLabel id="inference-type-label">Type d'analyse</InputLabel>
                                <Select
                                    labelId="inference-type-label"
                                    label="Type d'analyse"
                                    value={inferenceType}
                                    onChange={(event: SelectChangeEvent) => {
                                        setInferenceType(event.target.value as "action-spotting" | "summarization");
                                    }}
                                >
                                    <MenuItem value="action-spotting">Détection d'action</MenuItem>
                                    <MenuItem value="summarization">Résumé</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ minWidth: 150 }}>
                                <InputLabel id="model-name-label">Modèle</InputLabel>
                                <Select
                                    labelId="model-name-label"
                                    label="Modèle"
                                    value={modelName}
                                    onChange={(event: SelectChangeEvent) => setModelName(event.target.value)}
                                >
                                    {inferenceType === "action-spotting" && <MenuItem value="V1">V1</MenuItem>}
                                    {inferenceType === "action-spotting" && <MenuItem value="V2">V2</MenuItem>}
                                    {inferenceType === "summarization" && <MenuItem value="S1">S1</MenuItem>}
                                    {inferenceType === "summarization" && <MenuItem value="S2">S2</MenuItem>}
                                </Select>
                            </FormControl>
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

                {isProcessing && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, bgcolor: 'rgba(59, 130, 246, 0.1)', borderRadius: 2 }}>
                        <CircularProgress size={20} />
                        <Typography>Traitement de la source en cours...</Typography>
                    </Box>
                )}

                {videoToPlay ? (
                    <Card className="app-card" sx={{ border: '2px solid #3b82f6' }}>
                        <CardContent>
                            <VideoPlayer
                                src={videoToPlay.url}
                                title={videoToPlay.title}
                                onTimeUpdate={(time) => setPlayhead(time)}
                                onLoadedMetadata={(duration) => setVideoDuration(duration)}
                            />
                        </CardContent>
                    </Card>
                ) : (
                    <Box sx={{ p: 4, textAlign: 'center', border: '1px dashed #475569', borderRadius: 2 }}>
                        <Typography color="text.secondary">
                            Aucune vidéo sélectionnée. Entrez une URL ou téléchargez un fichier pour commencer.
                        </Typography>
                    </Box>
                )}

                <Card className="app-card">
                    <CardContent>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                            Analysis Timeline
                        </Typography>
                        <Timeline
                            events={timeline}
                            currentTime={playhead}
                            duration={videoDuration || 1800} // Use dynamic duration if available
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
                        {videoToPlay && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                                Video Status: {videoToPlay.status}
                            </Typography>
                        )}
                    </CardContent>
                </Card>
            </Stack>
        </Layout>
    );
}
