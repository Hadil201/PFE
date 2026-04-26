import Layout from "../components/layout/Layout";
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
import type { Video } from "../types/video";

interface TimelineEvent {
    id: string;
    label: string;
    start: number;
    end: number;
    confidence: number;
}

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
    const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
    const [playhead, setPlayhead] = useState(0);
    const [statusMessage, setStatusMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [summary, setSummary] = useState("");

    const selectedVideo = useMemo(
        () => videos.find((video) => video._id === selectedVideoId),
        [selectedVideoId, videos]
    );

    const refreshData = async () => {
        const [videosData, classData, summarizationData] = await Promise.all([getVideos(), getActionClasses(), getSummarizationModels()]);
        setVideos(videosData);
        setClasses(classData);
        setSummarizationModels(summarizationData);
        if (!selectedVideoId && videosData.length > 0) {
            setSelectedVideoId(videosData[0]._id);
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
        socket.on("inference:event", (payload: { videoId: string; event: TimelineEvent }) => {
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
            setStatusMessage("Inference started.");
            setErrorMessage("");
        });
        socket.on("inference:completed", () => {
            setStatusMessage("Inference completed.");
            void refreshData();
        });

        return () => {
            socket.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedVideoId]);

    const handleSourceSubmit = async () => {
        if (!sourceUrl.trim()) {
            setErrorMessage("Please provide a source URL or file path.");
            return;
        }
        setErrorMessage("");

        if (sourceType === "youtube") {
            await addYoutube(sourceUrl.trim());
        } else if (sourceType === "stream") {
            await addStream(sourceUrl.trim());
        } else {
            await uploadVideo({ title: sourceUrl.trim(), url: sourceUrl.trim(), startTime: startTime || undefined, endTime: endTime || undefined });
        }
        setSourceUrl("");
        setStartTime(0);
        setEndTime(0);
        setStatusMessage("Source added successfully.");
        await refreshData();
    };

    const handleStart = async () => {
        if (!selectedVideoId) {
            setErrorMessage("Select a video first.");
            return;
        }
        if (inferenceType === "action-spotting" && selectedClasses.length === 0) {
            setErrorMessage("Select at least one action class.");
            return;
        }
        setTimeline([]);
        setPlayhead(0);
        setSummary("");
        setErrorMessage("");
        await startInference({
            videoId: selectedVideoId,
            selectedClasses: inferenceType === "action-spotting" ? selectedClasses : [],
            modelName,
            chunkDuration,
            inferenceType,
        });
    };

    return (
        <Layout>
            <Stack spacing={3}>
                <Typography variant="h4">Video Analysis</Typography>

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
                                <MenuItem value="stream">M3U Stream</MenuItem>
                                <MenuItem value="upload">Upload (metadata)</MenuItem>
                            </Select>
                            <TextField
                                size="small"
                                fullWidth
                                label="Video URL or file name"
                                value={sourceUrl}
                                onChange={(event) => setSourceUrl(event.target.value)}
                            />
                            {sourceType === "upload" && (
                                <>
                                    <TextField
                                        size="small"
                                        label="Start Time (sec)"
                                        type="number"
                                        value={startTime}
                                        onChange={(event) => setStartTime(Number(event.target.value))}
                                    />
                                    <TextField
                                        size="small"
                                        label="End Time (sec)"
                                        type="number"
                                        value={endTime}
                                        onChange={(event) => setEndTime(Number(event.target.value))}
                                    />
                                </>
                            )}
                            <Button variant="outlined" onClick={() => void handleSourceSubmit()}>
                                Add Source
                            </Button>
                        </Stack>

                        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                            <Select
                                size="small"
                                fullWidth
                                value={selectedVideoId}
                                onChange={(event) => setSelectedVideoId(event.target.value)}
                            >
                                {videos.map((video) => (
                                    <MenuItem key={video._id} value={video._id}>
                                        {video.title}
                                    </MenuItem>
                                ))}
                            </Select>
                            <TextField
                                size="small"
                                label="Chunk (sec)"
                                type="number"
                                value={chunkDuration}
                                onChange={(event) => setChunkDuration(Number(event.target.value))}
                            />
                            <Select
                                size="small"
                                value={inferenceType}
                                onChange={(event) => setInferenceType(event.target.value as "action-spotting" | "summarization")}
                            >
                                <MenuItem value="action-spotting">Action Spotting</MenuItem>
                                <MenuItem value="summarization">Summarization</MenuItem>
                            </Select>
                            <TextField
                                size="small"
                                label="Model"
                                value={modelName}
                                onChange={(event) => setModelName(event.target.value)}
                            />
                        </Stack>

                        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 1 }}>
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
                    <Button variant="contained" onClick={() => void handleStart()}>
                        Start Analysis
                    </Button>
                </Box>
                {statusMessage && <Alert severity="success">{statusMessage}</Alert>}
                {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

                <Card className="app-card">
                    <CardContent>
                        <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                            Live timeline synced with playback - playhead: {playhead}s
                        </Typography>
                        <Box className="timeline-track">
                            <Box className="timeline-playhead" style={{ left: `${Math.min(playhead, 100)}%` }} />
                            {timeline.map((event) => (
                                <Box
                                    key={event.id}
                                    className="timeline-event"
                                    style={{
                                        left: `${Math.min(event.start, 100)}%`,
                                        width: `${Math.max(2, event.end - event.start)}%`,
                                    }}
                                >
                                    {event.label}
                                </Box>
                            ))}
                        </Box>
                        {summary && (
                            <Typography variant="body1" sx={{ mt: 2 }}>
                                <strong>Summary:</strong> {summary}
                            </Typography>
                        )}
                        {selectedVideo && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                                Selected video status: {selectedVideo.status}
                            </Typography>
                        )}
                    </CardContent>
                </Card>
            </Stack>
        </Layout>
    );
}