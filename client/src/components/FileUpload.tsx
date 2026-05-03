import React, { useRef, useState } from 'react';
import { Box, Typography, Button, LinearProgress, Alert } from '@mui/material';
import { CloudUpload } from '@mui/icons-material';

interface FileUploadProps {
  onUpload: (file: File, metadata?: { title?: string; startTime?: number; endTime?: number }) => void;
  accept?: string;
  maxSize?: number; // in bytes
  disabled?: boolean;
}

export default function FileUpload({
  onUpload,
  accept = 'video/*',
  maxSize = 100 * 1024 * 1024, // 100MB
  disabled = false
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');

  const handleFile = (file: File) => {
    setError('');

    // Validate file type
    if (!file.type.startsWith('video/')) {
      setError('Please select a video file');
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      setError(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
      return;
    }

    // Simulate upload progress
    setUploading(true);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    // Simulate upload completion
    setTimeout(() => {
      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploading(false);
      onUpload(file);
    }, 2000);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box
        sx={{
          border: `2px dashed ${dragActive ? 'primary.main' : 'grey.300'}`,
          borderRadius: 2,
          p: 3,
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          backgroundColor: dragActive ? 'action.hover' : 'transparent',
          transition: 'all 0.2s ease',
          opacity: disabled ? 0.6 : 1,
          '&:hover': {
            backgroundColor: disabled ? 'transparent' : 'action.hover',
            borderColor: disabled ? 'grey.300' : 'primary.main',
          },
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          disabled={disabled}
        />

        <CloudUpload sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />

        <Typography variant="h6" gutterBottom>
          {uploading ? 'Uploading...' : 'Drop video file here or click to browse'}
        </Typography>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          Supported formats: MP4, WebM, AVI, MOV
        </Typography>

        <Typography variant="caption" color="text.secondary">
          Maximum file size: {formatFileSize(maxSize)}
        </Typography>

        {!uploading && (
          <Button variant="outlined" sx={{ mt: 2 }} disabled={disabled}>
            Select File
          </Button>
        )}
      </Box>

      {uploading && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress
            variant="determinate"
            value={uploadProgress}
            sx={{ mb: 1 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
            {uploadProgress}% uploaded
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}
