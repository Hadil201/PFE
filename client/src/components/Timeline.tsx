import { useMemo } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import type { ActionEvent } from '../types/video';

interface TimelineProps {
  events: ActionEvent[];
  currentTime: number;
  duration: number;
  onEventClick?: (event: ActionEvent) => void;
  className?: string;
}

const ACTION_COLORS: Record<string, string> = {
  'goal': '#4CAF50',
  'penalty': '#FF9800',
  'corner': '#2196F3',
  'offside': '#9C27B0',
  'foul': '#F44336',
  'yellow-card': '#FFEB3B',
  'red-card': '#F44336',
  'free-kick': '#FF5722',
  'throw-in': '#795548',
  'shot-on-target': '#00BCD4',
  'save': '#607D8B',
  'substitution': '#9E9E9E',
  'kick-off': '#3F51B5',
  'half-time': '#FFC107',
  'full-time': '#8BC34A',
  'dribble': '#E91E63',
  'tackle': '#795548',
};

export default function Timeline({
  events,
  currentTime,
  duration,
  onEventClick,
  className
}: TimelineProps) {
  const timelineEvents = useMemo(() => {
    return events.map(event => ({
      ...event,
      leftPercent: (event.start / duration) * 100,
      widthPercent: ((event.end - event.start) / duration) * 100,
      color: ACTION_COLORS[event.label] || '#666',
    }));
  }, [events, duration]);

  const playheadPosition = useMemo(() => {
    return (currentTime / duration) * 100;
  }, [currentTime, duration]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (duration === 0) {
    return (
      <Box className={`timeline ${className || ''}`}>
        <Typography variant="body2" color="text.secondary">
          No video loaded
        </Typography>
      </Box>
    );
  }

  return (
    <Box className={`timeline ${className || ''}`}>
      <Box sx={{ mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Timeline: {formatTime(currentTime)} / {formatTime(duration)}
        </Typography>
      </Box>

      <Box
        sx={{
          position: 'relative',
          height: '60px',
          backgroundColor: '#f5f5f5',
          borderRadius: 1,
          overflow: 'hidden',
          border: '1px solid #ddd',
        }}
      >
        {/* Time markers */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            px: 1,
            fontSize: '10px',
            color: '#666',
            backgroundColor: 'rgba(0,0,0,0.05)',
          }}
        >
          {Array.from({ length: Math.min(10, Math.ceil(duration / 60)) }, (_, i) => (
            <span key={i}>{formatTime(i * 60)}</span>
          ))}
        </Box>

        {/* Events */}
        <Box
          sx={{
            position: 'absolute',
            top: '20px',
            left: 0,
            right: 0,
            height: '20px',
          }}
        >
          {timelineEvents.map((event) => (
            <Tooltip
              key={event.id}
              title={`${event.label} (${formatTime(event.start)} - ${formatTime(event.end)}) - Confidence: ${(event.confidence * 100).toFixed(1)}%`}
              arrow
            >
              <Box
                sx={{
                  position: 'absolute',
                  left: `${event.leftPercent}%`,
                  width: `${Math.max(event.widthPercent, 2)}%`,
                  height: '100%',
                  backgroundColor: event.color,
                  border: '1px solid rgba(0,0,0,0.2)',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'scaleY(1.2)',
                    zIndex: 10,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  },
                }}
                onClick={() => onEventClick?.(event)}
              >
                <Box
                  sx={{
                    fontSize: '8px',
                    color: 'white',
                    textAlign: 'center',
                    lineHeight: '18px',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    px: 0.5,
                  }}
                >
                  {event.label}
                </Box>
              </Box>
            </Tooltip>
          ))}
        </Box>

        {/* Playhead */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: `${playheadPosition}%`,
            width: '2px',
            height: '100%',
            backgroundColor: '#f44336',
            zIndex: 20,
            pointerEvents: 'none',
            transition: 'left 0.1s ease',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: '-4px',
              left: '-4px',
              width: '10px',
              height: '10px',
              backgroundColor: '#f44336',
              borderRadius: '50%',
              border: '2px solid white',
            }}
          />
        </Box>
      </Box>

      {/* Event Legend */}
      {events.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Event Types:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {Array.from(new Set(events.map(e => e.label))).map(label => (
              <Box
                key={label}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    backgroundColor: ACTION_COLORS[label] || '#666',
                    borderRadius: '2px',
                  }}
                />
                <Typography variant="caption">
                  {label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Stats */}
      {events.length > 0 && (
        <Box sx={{ mt: 2, p: 1, backgroundColor: '#f9f9f9', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Total Events: {events.length} |
            Average Confidence: {(events.reduce((sum, e) => sum + e.confidence, 0) / events.length * 100).toFixed(1)}%
          </Typography>
        </Box>
      )}
    </Box>
  );
}
