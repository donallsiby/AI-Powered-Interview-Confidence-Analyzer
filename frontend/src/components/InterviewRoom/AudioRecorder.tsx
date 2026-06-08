import React, { useState, useRef, useEffect } from 'react';
import { Box, Button, Typography, CircularProgress, Paper } from '@mui/material';
import { PlayArrow, Stop, Mic, Refresh } from '@mui/icons-material';
import { motion } from 'framer-motion';

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob, ext: string) => void;
  isProcessing: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete, isProcessing }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any | null>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    audioChunksRef.current = [];
    setAudioUrl(null);
    setAudioBlob(null);
    setRecordingTime(0);

    try {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn("Microphone not supported on this browser or environment. Triggering simulation fallback.");
        simulateRecording();
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Select appropriate MIME type
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/ogg';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/wav';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = ''; // Let browser decide
      }

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioMimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: audioMimeType });
        const url = URL.createObjectURL(blob);
        
        setAudioBlob(blob);
        setAudioUrl(url);

        // Terminate all stream tracks to release microphone hardware lock
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250); // Capture data every 250ms
      setIsRecording(true);
      
      // Start Timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Failed to start microphone recording:', err);
      // Fall back to simulation if microphone fails (e.g. permission denied or missing hardware)
      simulateRecording();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const simulateRecording = () => {
    setIsRecording(true);
    // Simulate active recording timer
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => {
        if (prev >= 5) {
          // Auto stop simulation at 5 seconds
          clearInterval(timerRef.current!);
          setIsRecording(false);
          
          // Generate a synthetic silent wav/webm blob
          const dummyBlob = new Blob([new Uint8Array(1000)], { type: 'audio/webm' });
          setAudioBlob(dummyBlob);
          setAudioUrl('simulated-recording');
          return 5;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const resetRecorder = () => {
    setAudioUrl(null);
    setAudioBlob(null);
    setRecordingTime(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleSubmit = () => {
    if (audioBlob) {
      const ext = mediaRecorderRef.current?.mimeType?.includes('ogg') ? 'ogg' : 
                  mediaRecorderRef.current?.mimeType?.includes('wav') ? 'wav' : 'webm';
      onRecordingComplete(audioBlob, ext);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <Paper 
        elevation={0}
        sx={{ 
          width: '100%', 
          p: 4, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          gap: 2,
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}
      >
        <Typography variant="h6" color="text.secondary">
          Response Recorder
        </Typography>

        <Typography variant="h3" sx={{ fontFamily: 'monospace', fontWeight: 'bold', my: 1 }}>
          {formatTime(recordingTime)}
        </Typography>

        {/* Animated Waveform Visualization */}
        <Box sx={{ height: 60, display: 'flex', alignItems: 'center', gap: 0.5, my: 1 }}>
          {isRecording ? (
            Array.from({ length: 15 }).map((_, i) => (
              <motion.div
                key={i}
                style={{
                  width: 4,
                  borderRadius: 2,
                  backgroundColor: '#6366f1',
                }}
                animate={{
                  height: [10, Math.max(10, Math.random() * 50), 10],
                }}
                transition={{
                  duration: 0.6 + Math.random() * 0.4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            ))
          ) : (
            Array.from({ length: 15 }).map((_, i) => (
              <Box
                key={i}
                sx={{
                  width: 4,
                  height: 10,
                  borderRadius: 2,
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                }}
              />
            ))
          )}
        </Box>

        {/* Action Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
          {!audioUrl && !isRecording && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<Mic />}
              onClick={startRecording}
              disabled={isProcessing}
              sx={{ px: 3, py: 1.5 }}
            >
              Start Recording
            </Button>
          )}

          {isRecording && (
            <Button
              variant="contained"
              color="error"
              startIcon={<Stop />}
              onClick={stopRecording}
              sx={{ px: 3, py: 1.5 }}
            >
              Stop Recording
            </Button>
          )}

          {audioUrl && !isRecording && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={resetRecorder}
                disabled={isProcessing}
              >
                Retake
              </Button>
              <Button
                variant="contained"
                color="secondary"
                startIcon={isProcessing ? <CircularProgress size={20} color="inherit" /> : <PlayArrow />}
                onClick={handleSubmit}
                disabled={isProcessing}
                sx={{ px: 3 }}
              >
                {isProcessing ? 'Analyzing...' : 'Analyze Answer'}
              </Button>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};
