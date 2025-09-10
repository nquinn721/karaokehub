import { faCheck, faExternalLinkAlt, faGlobe, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  alpha,
  Box,
  Button,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { parserStore } from '@stores/index';
import { UrlToParse } from '@stores/ParserStore';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';

interface UrlApprovalComponentProps {
  onCountChange?: (count: number) => void;
}

const UrlApprovalComponent = observer(({ onCountChange }: UrlApprovalComponentProps) => {
  const [unapprovedUrls, setUnapprovedUrls] = useState<UrlToParse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();

  const fetchUnapprovedUrls = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await parserStore.getUnapprovedUrls();
      if (result.success && result.data) {
        setUnapprovedUrls(result.data);
        onCountChange?.(result.data.length);
      } else {
        setError(result.error || 'Failed to fetch unapproved URLs');
      }
    } catch (err) {
      setError('Failed to fetch unapproved URLs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnapprovedUrls();
  }, []);

  const handleApprove = async (id: number) => {
    const result = await parserStore.approveUrl(id);
    if (result.success) {
      // Remove from local state
      const newUrls = unapprovedUrls.filter((url) => url.id !== id);
      setUnapprovedUrls(newUrls);
      onCountChange?.(newUrls.length);
    } else {
      setError(result.error || 'Failed to approve URL');
    }
  };

  const handleDelete = async (id: number) => {
    const result = await parserStore.deleteUrlToParse(id);
    if (result.success) {
      // Remove from local state
      const newUrls = unapprovedUrls.filter((url) => url.id !== id);
      setUnapprovedUrls(newUrls);
      onCountChange?.(newUrls.length);
    } else {
      setError(result.error || 'Failed to delete URL');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateUrl = (url: string, maxLength: number = 60) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  return (
    <Box>
      {/* Enhanced Header */}
      <Box sx={{ p: 4, pb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${theme.palette.warning.main}, ${theme.palette.info.main})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
              }}
            >
              <FontAwesomeIcon icon={faGlobe} size="lg" />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                URL Approval Queue
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Review and approve pending URL submissions for parsing
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              label={`${unapprovedUrls.length} pending`}
              color={unapprovedUrls.length > 0 ? 'warning' : 'success'}
              sx={{
                fontWeight: 600,
                px: 1,
              }}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={fetchUnapprovedUrls}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : undefined}
              sx={{
                borderRadius: 2,
                px: 2,
              }}
            >
              Refresh
            </Button>
          </Box>
        </Box>
      </Box>

      <CardContent sx={{ px: 4, pb: 4 }}>
        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 3,
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
            }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {loading && unapprovedUrls.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={40} />
          </Box>
        ) : unapprovedUrls.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 8,
              background: `linear-gradient(135deg, 
                ${alpha(theme.palette.success.main, 0.05)} 0%, 
                ${alpha(theme.palette.success.main, 0.02)} 100%)`,
              borderRadius: 2,
              border: `1px dashed ${alpha(theme.palette.success.main, 0.2)}`,
            }}
          >
            <Box sx={{ mb: 2 }}>
              <FontAwesomeIcon
                icon={faCheck}
                size="3x"
                color={theme.palette.success.main}
                style={{ opacity: 0.7 }}
              />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mb: 1 }}>
              All caught up!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              No URLs pending approval
            </Typography>
          </Box>
        ) : (
          <TableContainer
            sx={{
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
              overflow: 'hidden',
            }}
          >
            <Table size="medium">
              <TableHead>
                <TableRow
                  sx={{
                    background: `linear-gradient(135deg, 
                      ${alpha(theme.palette.primary.main, 0.05)} 0%, 
                      ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
                  }}
                >
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem', py: 2 }}>URL</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem', py: 2 }}>
                    Location
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem', py: 2 }}>
                    Submitted
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.9rem', py: 2 }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(Array.isArray(unapprovedUrls) ? unapprovedUrls : []).map((urlItem) => (
                  <TableRow
                    key={urlItem.id}
                    hover
                    sx={{
                      '&:hover': {
                        background: `linear-gradient(135deg, 
                          ${alpha(theme.palette.primary.main, 0.02)} 0%, 
                          ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
                      },
                      '&:nth-of-type(even)': {
                        backgroundColor: alpha(theme.palette.action.hover, 0.3),
                      },
                    }}
                  >
                    <TableCell sx={{ py: 2.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Link
                          href={urlItem.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{
                            textDecoration: 'none',
                            fontWeight: 500,
                            '&:hover': { textDecoration: 'underline' },
                          }}
                        >
                          <Typography variant="body2" color="primary">
                            {truncateUrl(urlItem.url)}
                          </Typography>
                        </Link>
                        <IconButton
                          size="small"
                          href={urlItem.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{
                            opacity: 0.7,
                            '&:hover': { opacity: 1 },
                          }}
                        >
                          <FontAwesomeIcon icon={faExternalLinkAlt} size="xs" />
                        </IconButton>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 2.5 }}>
                      {urlItem.city || urlItem.state ? (
                        <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
                          📍{' '}
                          {urlItem.city && urlItem.state
                            ? `${urlItem.city}, ${urlItem.state}`
                            : urlItem.city || urlItem.state}
                        </Typography>
                      ) : (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontStyle: 'italic' }}
                        >
                          Location not specified
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ py: 2.5 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        {formatDate(urlItem.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 2.5 }}>
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <Tooltip title="Approve URL">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleApprove(urlItem.id)}
                            disabled={parserStore.isLoading}
                            sx={{
                              backgroundColor: alpha(theme.palette.success.main, 0.1),
                              '&:hover': {
                                backgroundColor: alpha(theme.palette.success.main, 0.2),
                              },
                            }}
                          >
                            <FontAwesomeIcon icon={faCheck} size="sm" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete URL">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(urlItem.id)}
                            disabled={parserStore.isLoading}
                            sx={{
                              backgroundColor: alpha(theme.palette.error.main, 0.1),
                              '&:hover': {
                                backgroundColor: alpha(theme.palette.error.main, 0.2),
                              },
                            }}
                          >
                            <FontAwesomeIcon icon={faTrash} size="sm" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Box>
  );
});

export default UrlApprovalComponent;
