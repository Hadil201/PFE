import React, { useRef, useState, useEffect } from 'react';
import { Box, Typography, Alert, Stack, Button, IconButton } from '@mui/material';
import ReactPlayer from 'react-player';
import Hls from 'hls.js';
import { OpenInNew, Refresh, Info } from '@mui/icons-material';

interface VideoPlayerProps {
  src: string;
  title?: string;
  onTimeUpdate?: (currentTime: number) => void;
  onLoadedMetadata?: (duration: number) => void;
  className?: string;
  autoPlay?: boolean;
}

export default function VideoPlayer({ 
  src, 
  title, 
  onTimeUpdate, 
  onLoadedMetadata,
  className,
  autoPlay = true
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [isYoutube, setIsYoutube] = useState(false);

  const getFullUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith('http')) return url;
    
    const cleanPath = url.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\//, '');
    const relativePath = cleanPath.startsWith('temp/') ? cleanPath.substring(5) : cleanPath;
    
    // Construct full backend URL
    const backendBase = "http://localhost:5000";
    return `${backendBase}/temp/${relativePath}`;
  };

  const fullSrc = getFullUrl(src);

  useEffect(() => {
    const isYT = fullSrc.includes('youtube.com') || fullSrc.includes('youtu.be');
    setIsYoutube(isYT);
    setError(null);
    
    if (isYT) return; // ReactPlayer handles YouTube

    const video = videoRef.current;
    if (!video) return;

    // Clean up previous HLS
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = fullSrc.includes('.m3u8') || fullSrc.includes('.m3u');

    if (isHls && Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(fullSrc);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (autoPlay) video.play().catch(e => console.warn("HLS Play blocked:", e));
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) setError(`HLS Error: ${data.details}`);
      });
    } else {
      video.src = fullSrc;
      if (autoPlay) {
        video.muted = true; // Essential for autoplay
        video.play().catch(e => console.warn("Native Play blocked:", e));
      }
    }

    const handleTimeUpdate = () => onTimeUpdate?.(video.currentTime);
    const handleLoadedMetadata = () => onLoadedMetadata?.(video.duration);
    const handleError = () => setError("Impossible de charger le fichier vidéo local.");

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('error', handleError);
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, [fullSrc, autoPlay, onTimeUpdate, onLoadedMetadata]);

  return (
    <Box className={`video-player ${className || ''}`} sx={{ width: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h6" sx={{ color: '#f8fafc', fontSize: '1.1rem' }}>
          {title || "Lecteur Vidéo"}
        </Typography>
        <Stack direction="row" spacing={1}>
          <IconButton size="small" onClick={() => setShowDebug(!showDebug)} sx={{ color: '#64748b' }}>
            <Info fontSize="small" />
          </IconButton>
          <Button 
            size="small" 
            startIcon={<OpenInNew fontSize="small" />}
            onClick={() => window.open(fullSrc, '_blank')}
            sx={{ color: '#3b82f6', fontSize: '0.7rem' }}
          >
            Tester le lien
          </Button>
        </Stack>
      </Stack>

      {showDebug && (
        <Alert severity="info" sx={{ mb: 1, '& .MuiAlert-message': { wordBreak: 'break-all', fontSize: '0.75rem' } }}>
          URL: {fullSrc} <br />
          Type: {isYoutube ? "YouTube" : "Fichier Direct/HLS"}
        </Alert>
      )}
      
      <Box
        sx={{
          position: 'relative',
          backgroundColor: '#000',
          borderRadius: 2,
          overflow: 'hidden',
          aspectRatio: '16/9',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {error && (
          <Box sx={{ position: 'absolute', zIndex: 10, p: 3, textAlign: 'center', width: '100%' }}>
            <Alert severity="error" variant="filled" sx={{ mb: 2 }}>{error}</Alert>
            <Button variant="contained" size="small" startIcon={<Refresh />} onClick={() => window.location.reload()}>
              Actualiser la page
            </Button>
          </Box>
        )}

        {isYoutube ? (
          <ReactPlayer
            key={fullSrc}
            url={fullSrc}
            width="100%"
            height="100%"
            controls={true}
            playing={autoPlay}
            muted={true}
            playsinline={true}
            onError={() => setError("Erreur de lecture YouTube.")}
            onProgress={(state) => onTimeUpdate?.(state.playedSeconds)}
            onDuration={(duration) => onLoadedMetadata?.(duration)}
          />
        ) : (
          <video
            ref={videoRef}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            controls
            autoPlay={autoPlay}
            muted={autoPlay}
            playsInline
          />
        )}
      </Box>
    </Box>
  );
}
