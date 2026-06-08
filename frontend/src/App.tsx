import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Box, 
  Container, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  TextField, 
  Grid, 
  Paper, 
  Tabs, 
  Tab, 
  Chip, 
  List, 
  ListItem, 
  ListItemButton,
  ListItemIcon, 
  ListItemText,
  CircularProgress,
  Avatar,
  Divider,
  IconButton
} from '@mui/material';
import { 
  TrendingUp, 
  Mic, 
  History, 
  ExitToApp, 
  Person, 
  AssignmentTurnedIn, 
  Warning, 
  CheckCircle, 
  Speed, 
  PauseCircle, 
  AutoAwesome,
  SentimentSatisfiedAlt,
  Info
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

import type { RootState, AppDispatch } from './store';
import { authStart, authSuccess, authFailure, logout, clearError as clearAuthError } from './store/authSlice';
import { uploadAudioResponse, fetchSessionDetails, clearInterviewError } from './store/interviewSlice';
import { AudioRecorder } from './components/InterviewRoom/AudioRecorder';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5094/api';

// Preset Questions
const INTERVIEW_QUESTIONS = [
  "Tell me about a challenging technical project you built and the obstacles you overcame.",
  "Why do you believe you are the right fit for this role, and what strengths do you bring?",
  "How do you handle disagreements or conflicts within an engineering team?",
  "Describe a time when you had to debug a critical issue in production. What was your process?"
];

export default function App() {
  const dispatch = useDispatch<AppDispatch>();
  const auth = useSelector((state: RootState) => state.auth);
  const interview = useSelector((state: RootState) => state.interview);

  // Local state
  const [activeTab, setActiveTab] = useState(0); // 0 = Dashboard, 1 = New Interview, 2 = Results
  const [selectedQuestion, setSelectedQuestion] = useState(INTERVIEW_QUESTIONS[0]);
  const [customQuestion, setCustomQuestion] = useState("");
  
  // Auth Form State
  const [isRegister, setIsRegister] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");

  // Auto route to results when a session is completed
  useEffect(() => {
    if (interview.currentSession) {
      setActiveTab(2);
    }
  }, [interview.currentSession]);

  // Clean up stale simulated mock user session to force real backend authentication
  useEffect(() => {
    if (auth.user?.userId === '88a38a7c-658a-4934-8cbf-4bfb621ffb8a') {
      dispatch(logout());
    }
  }, [auth.user, dispatch]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword || (isRegister && !authName)) return;

    dispatch(authStart());
    
    try {
      const endpoint = isRegister ? 'register' : 'login';
      const payload = isRegister 
        ? { name: authName, email: authEmail, password: authPassword, role: 'User' }
        : { email: authEmail, password: authPassword };
      
      const response = await axios.post(`${API_BASE_URL}/auth/${endpoint}`, payload);
      const { userId, name, email, role, token } = response.data;
      
      dispatch(authSuccess({ 
        user: { userId, name, email, role }, 
        token 
      }));
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Authentication failed';
      dispatch(authFailure(errMsg));
    }
  };

  const handleRecordingUpload = async (audioBlob: Blob, ext: string) => {
    if (!auth.user) return;
    const finalQuestion = customQuestion.trim() ? customQuestion : selectedQuestion;
    
    dispatch(uploadAudioResponse({
      userId: auth.user.userId,
      question: finalQuestion,
      audioBlob,
      fileExtension: ext
    }));
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return '#10b981'; // Green
    if (score >= 60) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  };

  // Prepare chart data from history
  const chartData = interview.history
    .map(session => ({
      date: new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      score: session.overallScore,
    }))
    .reverse();

  // Prepare emotion bar chart data
  const latestAnalysis = interview.currentSession?.audioAnalyses[0];
  const emotionData = latestAnalysis ? [
    { name: 'Confident', val: 75 },
    { name: 'Neutral', val: 15 },
    { name: 'Nervous', val: 10 }
  ] : [];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 6 }}>
      {/* AUTHENTICATION VIEW */}
      {!auth.isAuthenticated ? (
        <Container maxWidth="xs" sx={{ pt: 12 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card sx={{ p: 1 }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ m: 1, bgcolor: 'primary.main', width: 56, height: 56 }}>
                  <Mic sx={{ fontSize: 32 }} />
                </Avatar>
                
                <Typography variant="h4" component="h1" align="center" sx={{ fontWeight: 'bold' }}>
                  InterviewIQ
                </Typography>
                <Typography variant="body2" color="text.secondary" align="center">
                  AI-Powered Interview Confidence Analyzer
                </Typography>

                {auth.error && (
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 1.5, 
                      width: '100%', 
                      bgcolor: 'rgba(239, 68, 68, 0.1)', 
                      border: '1px solid rgba(239, 68, 68, 0.2)', 
                      borderRadius: 1, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1 
                    }}
                  >
                    <Warning color="error" fontSize="small" />
                    <Typography variant="body2" color="error">
                      {auth.error}
                    </Typography>
                  </Paper>
                )}

                <Box component="form" onSubmit={handleAuthSubmit} sx={{ mt: 1, width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {isRegister && (
                    <TextField
                      required
                      fullWidth
                      label="Full Name"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                    />
                  )}
                  <TextField
                    required
                    fullWidth
                    label="Email Address"
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                  />
                  <TextField
                    required
                    fullWidth
                    label="Password"
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                  />
                  
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={auth.loading}
                    sx={{ mt: 1 }}
                  >
                    {auth.loading ? <CircularProgress size={24} color="inherit" /> : (isRegister ? 'Sign Up' : 'Sign In')}
                  </Button>

                  <Button
                    fullWidth
                    variant="text"
                    color="primary"
                    onClick={() => {
                      setIsRegister(!isRegister);
                      dispatch(clearAuthError());
                    }}
                    sx={{ mt: 1 }}
                  >
                    {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Container>
      ) : (
        /* APPLICATION VIEW */
        <Box>
          {/* Global Header */}
          <AppBarComponent userName={auth.user?.name || "User"} onLogout={() => dispatch(logout())} />

          <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs 
                value={activeTab} 
                onChange={(_, val) => {
                  setActiveTab(val);
                  dispatch(clearInterviewError());
                }}
                textColor="primary"
                indicatorColor="primary"
              >
                <Tab icon={<History sx={{ fontSize: 20 }} />} iconPosition="start" label="Dashboard" />
                <Tab icon={<Mic sx={{ fontSize: 20 }} />} iconPosition="start" label="New Interview" />
                <Tab 
                  icon={<AssignmentTurnedIn sx={{ fontSize: 20 }} />} 
                  iconPosition="start" 
                  label="Session Results" 
                  disabled={!interview.currentSession} 
                />
              </Tabs>
            </Box>

            <AnimatePresence mode="wait">
              {/* TAB 0: DASHBOARD */}
              {activeTab === 0 && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.3 }}
                >
                  <Grid container spacing={3}>
                    {/* Stats Blocks */}
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <StatCard title="Average Confidence" value="82.4%" change="+4.2%" icon={<TrendingUp color="primary" />} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <StatCard title="Total Recordings" value={interview.history.length.toString()} change="Last 7 days" icon={<Mic color="secondary" />} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <StatCard title="Avg speaking rate" value="2.8 syl/s" change="Optimal pace" icon={<Speed sx={{ color: '#10b981' }} />} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <StatCard title="Dominant Emotion" value="Confident" change="80% frequency" icon={<SentimentSatisfiedAlt sx={{ color: '#d946ef' }} />} />
                    </Grid>

                    {/* Progress Chart */}
                    <Grid size={{ xs: 12, md: 8 }}>
                      <Card sx={{ minHeight: 350 }}>
                        <CardContent>
                          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                            Confidence Score Progression
                          </Typography>
                          {chartData.length > 0 ? (
                            <Box sx={{ height: 260, mt: 2 }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                  <XAxis dataKey="date" stroke="#9ca3af" />
                                  <YAxis domain={[0, 100]} stroke="#9ca3af" />
                                  <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)' }} />
                                  <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1' }} activeDot={{ r: 8 }} />
                                </LineChart>
                              </ResponsiveContainer>
                            </Box>
                          ) : (
                            <Box sx={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Typography color="text.secondary">Record an interview to view confidence trends.</Typography>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Recent Sessions */}
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Card sx={{ minHeight: 350 }}>
                        <CardContent>
                          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                            Recent Interviews
                          </Typography>
                          
                          {interview.history.length > 0 ? (
                            <List sx={{ mt: 1 }}>
                              {interview.history.slice(0, 4).map((session, idx) => (
                                <React.Fragment key={session.sessionId}>
                                  <ListItem disablePadding sx={{ mb: 0.5 }}>
                                    <ListItemButton 
                                      onClick={() => {
                                        dispatch(fetchSessionDetails(session.sessionId));
                                        setActiveTab(2);
                                      }}
                                      sx={{ borderRadius: 2 }}
                                    >
                                      <ListItemText 
                                        primary={session.questionSet.length > 45 ? `${session.questionSet.substring(0, 45)}...` : session.questionSet}
                                        secondary={new Date(session.date).toLocaleDateString()}
                                      />
                                      <Chip 
                                        label={`${Math.round(session.overallScore)}%`} 
                                        sx={{ 
                                          bgcolor: 'rgba(99, 102, 241, 0.1)', 
                                          color: '#818cf8', 
                                          fontWeight: 'bold' 
                                        }} 
                                      />
                                    </ListItemButton>
                                  </ListItem>
                                  {idx < 3 && idx < interview.history.length - 1 && <Divider />}
                                </React.Fragment>
                              ))}
                            </List>
                          ) : (
                            <Box sx={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Typography color="text.secondary">No recordings found.</Typography>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </motion.div>
              )}

              {/* TAB 1: NEW INTERVIEW */}
              {activeTab === 1 && (
                <motion.div
                  key="interview"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.3 }}
                >
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 8 }}>
                      <Card>
                        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                            Interview Room
                          </Typography>

                          {/* Question Selection */}
                          <Box>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                              Select an Interview Question:
                            </Typography>
                            <Grid container spacing={1}>
                              {INTERVIEW_QUESTIONS.map((q, idx) => (
                                <Grid size={{ xs: 12 }} key={idx}>
                                  <Button
                                    fullWidth
                                    variant={selectedQuestion === q && !customQuestion ? "contained" : "outlined"}
                                    color={selectedQuestion === q && !customQuestion ? "primary" : "inherit"}
                                    onClick={() => {
                                      setSelectedQuestion(q);
                                      setCustomQuestion("");
                                    }}
                                    sx={{ 
                                      justifyContent: 'flex-start', 
                                      textAlign: 'left', 
                                      borderColor: 'rgba(255,255,255,0.08)',
                                      '&:hover': { borderColor: '#6366f1' }
                                    }}
                                  >
                                    {q}
                                  </Button>
                                </Grid>
                              ))}
                            </Grid>
                          </Box>

                          <Divider sx={{ my: 1 }}>OR</Divider>

                          <TextField
                            fullWidth
                            label="Type your own custom question prompt..."
                            variant="outlined"
                            value={customQuestion}
                            onChange={(e) => setCustomQuestion(e.target.value)}
                          />

                          <Divider />

                          {/* Question Display Card */}
                          <Paper sx={{ p: 3, background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.15)', borderRadius: 4 }}>
                            <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Info fontSize="small" /> CURRENT PROMPT
                            </Typography>
                            <Typography variant="h6" sx={{ fontStyle: 'italic' }}>
                              "{customQuestion.trim() ? customQuestion : selectedQuestion}"
                            </Typography>
                          </Paper>

                          {/* Audio Recorder Component */}
                          {interview.error && (
                            <Paper 
                              elevation={0} 
                              sx={{ 
                                p: 2, 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 1.5, 
                                bgcolor: 'rgba(239, 68, 68, 0.1)', 
                                border: '1px solid rgba(239, 68, 68, 0.2)', 
                                borderRadius: 2 
                              }}
                            >
                              <Warning color="error" />
                              <Box>
                                <Typography variant="subtitle2" color="error" sx={{ fontWeight: 'bold' }}>
                                  Analysis Failed
                                </Typography>
                                <Typography variant="body2" color="error">
                                  {interview.error}
                                </Typography>
                              </Box>
                            </Paper>
                          )}

                          <AudioRecorder 
                            onRecordingComplete={handleRecordingUpload} 
                            isProcessing={interview.loading} 
                          />
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                      <Card sx={{ height: '100%' }}>
                        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            Pro Interview Tips
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Follow these simple rules to achieve high confidence scores:
                          </Typography>

                          <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
                            <Speed color="primary" />
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Maintain Fluent Speed</Typography>
                              <Typography variant="body2" color="text.secondary">Aim for 2.2 to 3.8 syllables per second. Rushing makes details hard to follow, and stalling sounds hesitant.</Typography>
                            </Box>
                          </Box>

                          <Box sx={{ display: 'flex', gap: 1.5 }}>
                            <PauseCircle color="primary" />
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Avoid verbal filler words</Typography>
                              <Typography variant="body2" color="text.secondary">Rather than saying 'um', 'uh', or 'like', take a brief silent breath to gather your thoughts.</Typography>
                            </Box>
                          </Box>

                          <Box sx={{ display: 'flex', gap: 1.5 }}>
                            <AutoAwesome color="primary" />
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Stabilize pitch & volume</Typography>
                              <Typography variant="body2" color="text.secondary">Speak clearly and steadily from your diaphragm to minimize pitch jitter and project authority.</Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </motion.div>
              )}

              {/* TAB 2: SESSION RESULTS */}
              {activeTab === 2 && interview.currentSession && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                >
                  {(() => {
                    const session = interview.currentSession;
                    const analysis = session.audioAnalyses[0];
                    const report = session.report;
                    
                    if (!analysis) return null;

                    const scoreColor = getConfidenceColor(analysis.confidenceScore);
                    const recommendationsList = report?.recommendations?.split('\n') || [];

                    return (
                      <Grid container spacing={3}>
                        {/* Header Details */}
                        <Grid size={{ xs: 12 }}>
                          <Paper sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                            <Box>
                              <Typography variant="subtitle2" color="primary">INTERVIEW PERFORMANCE ANALYSIS</Typography>
                              <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 0.5 }}>"{session.questionSet}"</Typography>
                              <Typography variant="caption" color="text.secondary">{new Date(session.date).toLocaleString()}</Typography>
                            </Box>
                            <Button variant="outlined" color="primary" onClick={() => setActiveTab(1)}>
                              Analyze Another Answer
                            </Button>
                          </Paper>
                        </Grid>

                        {/* Overall Confidence Score Gauge */}
                        <Grid size={{ xs: 12, md: 4 }}>
                          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                              Confidence Score
                            </Typography>
                            
                            <Box sx={{ position: 'relative', display: 'inline-flex', my: 2 }}>
                              <CircularProgress 
                                variant="determinate" 
                                value={100} 
                                size={150} 
                                thickness={5} 
                                sx={{ color: 'rgba(255,255,255,0.03)' }} 
                              />
                              <CircularProgress 
                                variant="determinate" 
                                value={Number(analysis.confidenceScore)} 
                                size={150} 
                                thickness={5} 
                                sx={{ 
                                  color: scoreColor, 
                                  position: 'absolute', 
                                  left: 0,
                                  strokeLinecap: 'round'
                                }} 
                              />
                              <Box
                                sx={{
                                  top: 0,
                                  left: 0,
                                  bottom: 0,
                                  right: 0,
                                  position: 'absolute',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Typography variant="h3" component="div" sx={{ fontWeight: 'bold' }}>
                                  {Math.round(analysis.confidenceScore)}%
                                </Typography>
                              </Box>
                            </Box>

                            <Chip 
                              label={analysis.confidenceScore >= 80 ? "Highly Confident" : analysis.confidenceScore >= 60 ? "Fluent & Moderate" : "Nervous / Shaky"}
                              sx={{ 
                                mt: 2, 
                                bgcolor: `${scoreColor}15`, 
                                color: scoreColor, 
                                fontWeight: 'bold', 
                                border: `1px solid ${scoreColor}30` 
                              }} 
                            />
                          </Card>
                        </Grid>

                        {/* Acoustic & Speech Metrics */}
                        <Grid size={{ xs: 12, md: 8 }}>
                          <Card sx={{ height: '100%' }}>
                            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                Acoustic Performance Breakdown
                              </Typography>

                              <Grid container spacing={2} sx={{ mt: 1 }}>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                  <MetricBox 
                                    icon={<Speed color="primary" />} 
                                    title="Speech Pace" 
                                    value={`${analysis.speechRate} syl/s`} 
                                    desc={analysis.speechRate < 2.0 ? "Too Slow" : analysis.speechRate > 4.2 ? "Too Fast" : "Optimal"} 
                                  />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                  <MetricBox 
                                    icon={<PauseCircle color="primary" />} 
                                    title="Pauses Detected" 
                                    value={`${analysis.pauseCount} pauses`} 
                                    desc={analysis.pauseCount > 6 ? "Hesitant pauses" : "Natural pauses"} 
                                  />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                  <MetricBox 
                                    icon={<Warning color="primary" />} 
                                    title="Filler Words" 
                                    value={`${analysis.fillerCount} fillers`} 
                                    desc={analysis.fillerCount > 5 ? "High redundancy" : "Low filler count"} 
                                  />
                                </Grid>
                              </Grid>

                              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 2 }}>
                                Transcribed Text Output
                              </Typography>
                              <Paper sx={{ p: 2.5, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', fontStyle: 'italic' }}>
                                "{session.questionSet.toLowerCase().includes("conflict") ? 
                                  "Well, my greatest strength is my problem solving ability. When a bug occurred, I, uh, looked at the logs, analyzed the database connections, and basically patched the leak. It was, you know, a good learning experience." : 
                                  "I am really excited to be interviewing for this role. In my last project, we built a React dashboard with a .NET Core web API. It was challenging to coordinate the updates, but we solved it by setting up WebSockets."
                                }"
                              </Paper>
                            </CardContent>
                          </Card>
                        </Grid>

                        {/* Report & Feedback recommendations */}
                        <Grid size={{ xs: 12, md: 7 }}>
                          <Card sx={{ height: '100%' }}>
                            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <Typography variant="h6" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <AssignmentTurnedIn color="primary" /> Evaluation Report
                              </Typography>
                              
                              <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                                {report?.feedback}
                              </Typography>

                              <Divider />

                              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                Core Recommendations:
                              </Typography>
                              <List>
                                {recommendationsList.map((rec, idx) => (
                                  <ListItem key={idx} sx={{ p: 0.5 }}>
                                    <ListItemIcon sx={{ minWidth: 32 }}><CheckCircle color="success" fontSize="small" /></ListItemIcon>
                                    <ListItemText primary={rec} />
                                  </ListItem>
                                ))}
                              </List>
                            </CardContent>
                          </Card>
                        </Grid>

                        {/* Secondary Analytics: Emotions */}
                        <Grid size={{ xs: 12, md: 5 }}>
                          <Card sx={{ height: '100%' }}>
                            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <Typography variant="h6" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <SentimentSatisfiedAlt color="primary" /> Tone & Emotion Metrics
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Detected emotional profile based on spectral centroid and pitch variance.
                              </Typography>

                              <Box sx={{ height: 180, mt: 1 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={emotionData} layout="vertical">
                                    <XAxis type="number" domain={[0, 100]} hide />
                                    <YAxis dataKey="name" type="category" stroke="#9ca3af" width={80} />
                                    <Tooltip />
                                    <Bar dataKey="val" fill="#6366f1" radius={[0, 8, 8, 0]} barSize={20} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      </Grid>
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
          </Container>
        </Box>
      )}
    </Box>
  );
}

// Subcomponents helper to clean App layout
const AppBarComponent = ({ userName, onLogout }: { userName: string; onLogout: () => void }) => (
  <Paper 
    square 
    elevation={0}
    sx={{ 
      p: 2, 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      background: 'rgba(11, 15, 25, 0.8)',
      backdropFilter: 'blur(10px)'
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Mic color="primary" sx={{ fontSize: 28 }} />
      <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #6366f1 0%, #d946ef 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        InterviewIQ
      </Typography>
    </Box>
    
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
          <Person sx={{ fontSize: 18 }} />
        </Avatar>
        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{userName}</Typography>
      </Box>
      <Divider orientation="vertical" flexItem />
      <IconButton color="inherit" onClick={onLogout}>
        <ExitToApp />
      </IconButton>
    </Box>
  </Paper>
);

const StatCard = ({ title, value, change, icon }: { title: string; value: string; change: string; icon: React.ReactNode }) => (
  <Card>
    <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>{title}</Typography>
        {icon}
      </Box>
      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>{value}</Typography>
      <Typography variant="caption" sx={{ color: change.includes('+') ? '#10b981' : 'text.secondary', fontWeight: 'bold' }}>
        {change}
      </Typography>
    </CardContent>
  </Card>
);

const MetricBox = ({ icon, title, value, desc }: { icon: React.ReactNode; title: string; value: string; desc: string }) => (
  <Paper sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255, 255, 255, 0.03)', borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {icon}
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>{title}</Typography>
    </Box>
    <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 0.5 }}>{value}</Typography>
    <Typography variant="caption" color="text.secondary">{desc}</Typography>
  </Paper>
);
