import { faCheck, faUpload } from '@fortawesome/free-solid-svg-icons';
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
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import CustomModal from './CustomModal';

interface UploadData {
  vendors: any[];
  djs: any[];
  shows: any[];
  venues: any[];
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
      // Split data into smaller chunks to avoid 413 Content Too Large error
      const CHUNK_SIZE = 100; // Upload 100 items at a time
      const results = {
        vendors: { success: 0, failed: 0 },
        djs: { success: 0, failed: 0 },
        shows: { success: 0, failed: 0 },
        venues: { success: 0, failed: 0 },
      };

      // Helper function to get the production upload URL
      const getProductionUploadURL = () => {
        const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost';
        if (isDevelopment) {
          return 'http://localhost:8000/api/production-upload/data';
        } else {
          return `${window.location.origin}/api/production-upload/data`;
        }
      };

      // Helper function to upload in chunks
      const uploadInChunks = async (data: any[], type: 'vendors' | 'djs' | 'shows' | 'venues') => {
        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
          const chunk = data.slice(i, i + CHUNK_SIZE);

          const response = await fetch(getProductionUploadURL(), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-upload-token': 'karaoke-hub-data-integration-system',
            },
            body: JSON.stringify({
              [type]: chunk,
              vendors: type === 'vendors' ? chunk : [],
              djs: type === 'djs' ? chunk : [],
              shows: type === 'shows' ? chunk : [],
              venues: type === 'venues' ? chunk : [],
              metadata: {
                uploadedBy: 'Admin',
                uploadedAt: new Date().toISOString(),
                source: 'Local Database',
                notes: `Chunk ${Math.floor(i / CHUNK_SIZE) + 1} of ${Math.ceil(data.length / CHUNK_SIZE)} for ${type}`,
                isChunked: true,
                chunkInfo: {
                  current: Math.floor(i / CHUNK_SIZE) + 1,
                  total: Math.ceil(data.length / CHUNK_SIZE),
                  type: type,
                  startIndex: i,
                  endIndex: Math.min(i + CHUNK_SIZE, data.length),
                },
                ...uploadData.metadata,
              },
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Chunk upload failed for ${type}:`, errorText);
            results[type].failed += chunk.length;
          } else {
            await response.json(); // Consume response
            results[type].success += chunk.length;
          }
        }
      };

      // Upload each data type in chunks
      if (uploadData.vendors?.length > 0) {
        await uploadInChunks(uploadData.vendors, 'vendors');
      }

      if (uploadData.djs?.length > 0) {
        await uploadInChunks(uploadData.djs, 'djs');
      }

      if (uploadData.shows?.length > 0) {
        await uploadInChunks(uploadData.shows, 'shows');
      }

      if (uploadData.venues?.length > 0) {
        await uploadInChunks(uploadData.venues, 'venues');
      }

      setUploadResult({
        message: 'Chunked upload completed',
        results,
        totalProcessed:
          results.vendors.success +
          results.djs.success +
          results.shows.success +
          results.venues.success,
        totalFailed:
          results.vendors.failed +
          results.djs.failed +
          results.shows.failed +
          results.venues.failed,
      });
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
                {uploadData.djs?.length || 0} DJs, {uploadData.shows?.length || 0} shows, and{' '}
                {uploadData.venues?.length || 0} venues!
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
                  <Grid item xs={3}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Typography variant="h4" color="primary.main">
                          {uploadData.vendors.length}
                        </Typography>
                        <Typography variant="caption">Vendors</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={3}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Typography variant="h4" color="success.main">
                          {uploadData.djs.length}
                        </Typography>
                        <Typography variant="caption">DJs</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={3}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Typography variant="h4" color="warning.main">
                          {uploadData.shows.length}
                        </Typography>
                        <Typography variant="caption">Shows</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={3}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Typography variant="h4" color="info.main">
                          {uploadData.venues.length}
                        </Typography>
                        <Typography variant="caption">Venues</Typography>
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
                            primary={(show.venue && typeof show.venue === "object" ? show.venue.name : show.venue) || "Unknown Venue"}
                            secondary={`${show.venue && typeof show.venue === "object" ? show.venue.city : null}, ${show.venue && typeof show.venue === "object" ? show.venue.state : null} - ${show.day} at ${show.startTime} with ${show.djName}`}
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

                <Accordion sx={{ mb: 2 }}>
                  <AccordionSummary>
                    <Typography variant="subtitle2">
                      View Venues ({uploadData.venues.length})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {uploadData.venues.slice(0, 5).map((venue, index) => (
                        <ListItem key={index}>
                          <ListItemText
                            primary={venue.name}
                            secondary={`${venue.address}, ${venue.city}, ${venue.state} ${venue.zip}`}
                          />
                        </ListItem>
                      ))}
                      {uploadData.venues.length > 5 && (
                        <ListItem>
                          <ListItemText
                            primary={`... and ${uploadData.venues.length - 5} more venues`}
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
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Data has been successfully uploaded to production in chunks.
                </Typography>

                {uploadResult.results && (
                  <Grid container spacing={2} sx={{ mt: 2, justifyContent: 'center' }}>
                    <Grid item xs={12} sm={3}>
                      <Card variant="outlined">
                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                          <Typography variant="h6" color="primary">
                            {uploadResult.results.vendors.success}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Vendors Uploaded
                          </Typography>
                          {uploadResult.results.vendors.failed > 0 && (
                            <Typography variant="caption" color="error">
                              {uploadResult.results.vendors.failed} failed
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} sm={3}>
                      <Card variant="outlined">
                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                          <Typography variant="h6" color="primary">
                            {uploadResult.results.djs.success}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            DJs Uploaded
                          </Typography>
                          {uploadResult.results.djs.failed > 0 && (
                            <Typography variant="caption" color="error">
                              {uploadResult.results.djs.failed} failed
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} sm={3}>
                      <Card variant="outlined">
                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                          <Typography variant="h6" color="primary">
                            {uploadResult.results.shows.success}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Shows Uploaded
                          </Typography>
                          {uploadResult.results.shows.failed > 0 && (
                            <Typography variant="caption" color="error">
                              {uploadResult.results.shows.failed} failed
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} sm={3}>
                      <Card variant="outlined">
                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                          <Typography variant="h6" color="primary">
                            {uploadResult.results.venues.success}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Venues Uploaded
                          </Typography>
                          {uploadResult.results.venues.failed > 0 && (
                            <Typography variant="caption" color="error">
                              {uploadResult.results.venues.failed} failed
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                )}

                <Alert severity="success" sx={{ mt: 3 }}>
                  Successfully uploaded {uploadResult.totalProcessed || 0} items
                  {uploadResult.totalFailed > 0 && ` (${uploadResult.totalFailed} failed)`}
                </Alert>
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
    <CustomModal
      open={open}
      onClose={uploading ? () => {} : handleClose}
      title="Upload Data to Production"
      icon={<FontAwesomeIcon icon={faUpload} />}
      maxWidth="md"
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {renderStepContent()}

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 2,
          mt: 3,
          pt: 2,
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        {getDialogActions()}
      </Box>
    </CustomModal>
  );
});

export default DataUploadModal;
