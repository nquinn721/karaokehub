import { faCheck, faTimes, faUpload } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';

interface UploadData {
  vendors: any[];
  djs: any[];
  shows: any[];
  metadata?: {
    uploadedBy?: string;
    uploadedAt?: string;
    source?: string;
    notes?: string;
  };
}

const DataUploadModal: React.FC<{
  open: boolean;
  onClose: () => void;
}> = observer(({ open, onClose }) => {
  const [step, setStep] = useState<'fetch' | 'preview' | 'upload' | 'complete'>('fetch');
  const [uploadData, setUploadData] = useState<UploadData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFetchLocalData = async () => {
    setError(null);
    setUploading(true);

    try {
      const response = await fetch('/api/upload/fetch-local-data');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setUploadData(data);
      setStep('preview');
    } catch (err) {
      console.error('DataUploadModal: Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch local data');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadToProduction = async () => {
    if (!uploadData) return;

    setError(null);
    setUploading(true);
    setStep('upload');

    try {
      // Use the new production upload endpoint that bypasses CORS
      const response = await fetch('https://karaoke-hub.com/api/production-upload/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-upload-token': 'karaoke-hub-data-integration-system', // Production upload token
        },
        body: JSON.stringify({
          vendors: uploadData.vendors || [],
          djs: uploadData.djs || [],
          shows: uploadData.shows || [],
          metadata: {
            uploadedBy: 'Admin',
            uploadedAt: new Date().toISOString(),
            source: 'Local Database',
            notes: 'Bulk upload from local development environment',
            ...uploadData.metadata,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Upload failed: HTTP ${response.status} ${response.statusText}. ${errorText}`,
        );
      }

      const result = await response.json();
      setUploadResult(result);
      setStep('complete');
    } catch (err) {
      console.error('DataUploadModal: Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload to production failed');
      setStep('preview');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setStep('fetch');
    setUploadData(null);
    setUploadResult(null);
    setError(null);
    setUploading(false);
    onClose();
  };

  const renderStepContent = () => {
    switch (step) {
      case 'fetch':
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" gutterBottom>
              Fetch Local Database Data
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              This will fetch all vendors, DJs, and shows from your local database.
            </Typography>

            {uploadData && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Successfully fetched {uploadData.vendors?.length || 0} vendors,{' '}
                {uploadData.djs?.length || 0} DJs, and {uploadData.shows?.length || 0} shows!
              </Alert>
            )}

            <Button
              variant="contained"
              startIcon={<FontAwesomeIcon icon={faUpload} />}
              onClick={handleFetchLocalData}
              disabled={uploading}
              size="large"
            >
              {uploading ? 'Fetching...' : 'Fetch Local Data'}
            </Button>

            {uploading && <LinearProgress sx={{ mt: 2 }} />}
          </Box>
        );

      case 'preview':
        return (
          <Box sx={{ py: 2 }}>
            <Typography variant="h6" gutterBottom>
              Data Preview
            </Typography>

            {uploadData && (
              <>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={4}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Typography variant="h4" color="primary.main">
                          {uploadData.vendors.length}
                        </Typography>
                        <Typography variant="caption">Vendors</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={4}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Typography variant="h4" color="success.main">
                          {uploadData.djs.length}
                        </Typography>
                        <Typography variant="caption">DJs</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={4}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Typography variant="h4" color="warning.main">
                          {uploadData.shows.length}
                        </Typography>
                        <Typography variant="caption">Shows</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                <Accordion sx={{ mb: 2 }}>
                  <AccordionSummary>
                    <Typography variant="subtitle2">
                      View Vendors ({uploadData.vendors.length})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {uploadData.vendors.slice(0, 5).map((vendor, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={vendor.name} secondary={vendor.website} />
                        </ListItem>
                      ))}
                      {uploadData.vendors.length > 5 && (
                        <ListItem>
                          <ListItemText
                            primary={`... and ${uploadData.vendors.length - 5} more vendors`}
                            primaryTypographyProps={{
                              fontStyle: 'italic',
                              color: 'text.secondary',
                            }}
                          />
                        </ListItem>
                      )}
                    </List>
                  </AccordionDetails>
                </Accordion>

                <Accordion sx={{ mb: 2 }}>
                  <AccordionSummary>
                    <Typography variant="subtitle2">View DJs ({uploadData.djs.length})</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {uploadData.djs.slice(0, 5).map((dj, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={dj.name} secondary={dj.vendorName} />
                        </ListItem>
                      ))}
                      {uploadData.djs.length > 5 && (
                        <ListItem>
                          <ListItemText
                            primary={`... and ${uploadData.djs.length - 5} more DJs`}
                            primaryTypographyProps={{
                              fontStyle: 'italic',
                              color: 'text.secondary',
                            }}
                          />
                        </ListItem>
                      )}
                    </List>
                  </AccordionDetails>
                </Accordion>

                <Accordion sx={{ mb: 2 }}>
                  <AccordionSummary>
                    <Typography variant="subtitle2">
                      View Shows ({uploadData.shows.length})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {uploadData.shows.slice(0, 5).map((show, index) => (
                        <ListItem key={index}>
                          <ListItemText
                            primary={show.venue}
                            secondary={`${show.city}, ${show.state} - ${show.day} at ${show.startTime} with ${show.djName}`}
                          />
                        </ListItem>
                      ))}
                      {uploadData.shows.length > 5 && (
                        <ListItem>
                          <ListItemText
                            primary={`... and ${uploadData.shows.length - 5} more shows`}
                            primaryTypographyProps={{
                              fontStyle: 'italic',
                              color: 'text.secondary',
                            }}
                          />
                        </ListItem>
                      )}
                    </List>
                  </AccordionDetails>
                </Accordion>
              </>
            )}
          </Box>
        );

      case 'upload':
        return (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <FontAwesomeIcon
              icon={faUpload}
              size="3x"
              style={{ color: '#1976d2', marginBottom: '16px' }}
            />
            <Typography variant="h6" gutterBottom>
              Uploading to Production...
            </Typography>
            <LinearProgress sx={{ mt: 2, width: '200px', mx: 'auto' }} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Sending data to karaoke-hub.com for validation and processing...
            </Typography>
          </Box>
        );

      case 'complete':
        return (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <FontAwesomeIcon
              icon={faCheck}
              size="3x"
              style={{ color: '#4caf50', marginBottom: '16px' }}
            />
            <Typography variant="h6" gutterBottom>
              Upload Complete!
            </Typography>
            {uploadResult && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Data has been successfully uploaded to production.
                </Typography>
                {uploadResult.message && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    {uploadResult.message}
                  </Alert>
                )}
              </Box>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  const getDialogActions = () => {
    switch (step) {
      case 'fetch':
        return <Button onClick={handleClose}>Cancel</Button>;

      case 'preview':
        return (
          <>
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              onClick={handleUploadToProduction}
              variant="contained"
              startIcon={<FontAwesomeIcon icon={faUpload} />}
              disabled={!uploadData}
            >
              Upload to Production
            </Button>
          </>
        );

      case 'upload':
        return (
          <Button onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
        );

      case 'complete':
        return (
          <Button onClick={handleClose} variant="contained">
            Close
          </Button>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={uploading ? undefined : handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '400px' },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Upload Data to Production</Typography>
        {!uploading && (
          <IconButton onClick={handleClose} size="small">
            <FontAwesomeIcon icon={faTimes} />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent sx={{ minHeight: '300px' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {renderStepContent()}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>{getDialogActions()}</DialogActions>
    </Dialog>
  );
});

export default DataUploadModal;
