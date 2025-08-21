import { faCheck, faExternalLinkAlt, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
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
} from '@mui/material';
import { parserStore } from '@stores/index';
import { UrlToParse } from '@stores/ParserStore';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';

const UrlApprovalComponent = observer(() => {
  const [unapprovedUrls, setUnapprovedUrls] = useState<UrlToParse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUnapprovedUrls = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await parserStore.getUnapprovedUrls();
      if (result.success && result.data) {
        setUnapprovedUrls(result.data);
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
      setUnapprovedUrls((prev) => prev.filter((url) => url.id !== id));
    } else {
      setError(result.error || 'Failed to approve URL');
    }
  };

  const handleDelete = async (id: number) => {
    const result = await parserStore.deleteUrlToParse(id);
    if (result.success) {
      // Remove from local state
      setUnapprovedUrls((prev) => prev.filter((url) => url.id !== id));
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
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              URL Approval Queue
            </Typography>
            <Chip
              label={unapprovedUrls.length}
              color={unapprovedUrls.length > 0 ? 'warning' : 'success'}
              size="small"
            />
          </Box>
        }
        action={
          <Button
            variant="outlined"
            size="small"
            onClick={fetchUnapprovedUrls}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : undefined}
          >
            Refresh
          </Button>
        }
      />
      <CardContent sx={{ pt: 0 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading && unapprovedUrls.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : unapprovedUrls.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              No URLs pending approval
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>URL</TableCell>
                  <TableCell>Submitted</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(Array.isArray(unapprovedUrls) ? unapprovedUrls : []).map((urlItem) => (
                  <TableRow key={urlItem.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Link
                          href={urlItem.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{
                            textDecoration: 'none',
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
                        >
                          <FontAwesomeIcon icon={faExternalLinkAlt} size="xs" />
                        </IconButton>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(urlItem.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <Tooltip title="Approve URL">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleApprove(urlItem.id)}
                            disabled={parserStore.isLoading}
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
    </Card>
  );
});

export default UrlApprovalComponent;
