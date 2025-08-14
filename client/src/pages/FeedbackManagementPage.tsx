import {
  faBug,
  faCalendar,
  faCog,
  faComments,
  faEnvelope,
  faExclamationTriangle,
  faHeart,
  faLightbulb,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Rating,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { feedbackStore } from '../stores';
import { Feedback } from '../stores/FeedbackStore';

const FeedbackManagementPage: React.FC = observer(() => {
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [responseText, setResponseText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    feedbackStore.getAllFeedbacks();
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug':
        return faBug;
      case 'feature':
        return faLightbulb;
      case 'improvement':
        return faCog;
      case 'compliment':
        return faHeart;
      case 'complaint':
        return faExclamationTriangle;
      default:
        return faComments;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'bug':
        return 'error';
      case 'feature':
        return 'primary';
      case 'improvement':
        return 'info';
      case 'compliment':
        return 'success';
      case 'complaint':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'reviewed':
        return 'info';
      case 'resolved':
        return 'success';
      default:
        return 'default';
    }
  };

  const handleUpdateStatus = async (
    feedback: Feedback,
    newStatus: 'pending' | 'reviewed' | 'resolved',
  ) => {
    try {
      await feedbackStore.updateFeedbackStatus(feedback.id, newStatus, responseText);
      setSelectedFeedback(null);
      setResponseText('');
    } catch (error) {
      console.error('Failed to update feedback:', error);
    }
  };

  const filteredFeedbacks = feedbackStore.feedbacks.filter((feedback) => {
    const statusMatch = filterStatus === 'all' || feedback.status === filterStatus;
    const typeMatch = filterType === 'all' || feedback.type === filterType;
    return statusMatch && typeMatch;
  });

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Feedback Management
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Filter by Status</InputLabel>
              <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="reviewed">Reviewed</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Filter by Type</InputLabel>
              <Select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="bug">Bug Report</MenuItem>
                <MenuItem value="feature">Feature Request</MenuItem>
                <MenuItem value="improvement">Improvement</MenuItem>
                <MenuItem value="compliment">Compliment</MenuItem>
                <MenuItem value="complaint">Complaint</MenuItem>
                <MenuItem value="general">General</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Feedback List */}
      <Grid container spacing={3}>
        {filteredFeedbacks.map((feedback) => (
          <Grid item xs={12} key={feedback.id}>
            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <FontAwesomeIcon
                      icon={getTypeIcon(feedback.type)}
                      style={{ fontSize: '20px' }}
                    />
                    <Box>
                      <Chip
                        label={feedback.type.charAt(0).toUpperCase() + feedback.type.slice(1)}
                        color={getTypeColor(feedback.type) as any}
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      <Chip
                        label={feedback.status.charAt(0).toUpperCase() + feedback.status.slice(1)}
                        color={getStatusColor(feedback.status) as any}
                        size="small"
                      />
                    </Box>
                  </Box>
                  <Rating value={feedback.rating} readOnly size="small" />
                </Box>

                {feedback.subject && (
                  <Typography variant="h6" gutterBottom>
                    {feedback.subject}
                  </Typography>
                )}

                <Typography variant="body1" paragraph>
                  {feedback.message}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    color: 'text.secondary',
                    fontSize: '0.875rem',
                  }}
                >
                  {feedback.name && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <FontAwesomeIcon icon={faUser} />
                      <span>{feedback.name}</span>
                    </Box>
                  )}
                  {feedback.email && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <FontAwesomeIcon icon={faEnvelope} />
                      <span>{feedback.email}</span>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <FontAwesomeIcon icon={faCalendar} />
                    <span>{new Date(feedback.createdAt).toLocaleDateString()}</span>
                  </Box>
                </Box>

                {feedback.response && (
                  <Box
                    sx={{
                      mt: 2,
                      p: 2,
                      bgcolor: 'background.paper',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Admin Response:
                    </Typography>
                    <Typography variant="body2">{feedback.response}</Typography>
                  </Box>
                )}

                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setSelectedFeedback(feedback);
                      setResponseText(feedback.response || '');
                    }}
                  >
                    Respond
                  </Button>
                  {feedback.status === 'pending' && (
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleUpdateStatus(feedback, 'reviewed')}
                    >
                      Mark Reviewed
                    </Button>
                  )}
                  {feedback.status !== 'resolved' && (
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      onClick={() => handleUpdateStatus(feedback, 'resolved')}
                    >
                      Resolve
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Response Dialog */}
      <Dialog
        open={!!selectedFeedback}
        onClose={() => setSelectedFeedback(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Respond to Feedback</DialogTitle>
        <DialogContent>
          {selectedFeedback && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Original Message:
              </Typography>
              <Typography
                variant="body1"
                paragraph
                sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}
              >
                {selectedFeedback.message}
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Your Response"
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                sx={{ mt: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedFeedback(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => selectedFeedback && handleUpdateStatus(selectedFeedback, 'reviewed')}
            disabled={!responseText.trim()}
          >
            Send Response
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
});

export default FeedbackManagementPage;
