import {
  faCheck,
  faCog,
  faCrown,
  faHeart,
  faInfinity,
  faMusic,
  faPlay,
  faTimes,
  faTrash,
  faUserShield,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { CalendarToday } from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import type { AdminUser, AdminUserFeatureOverride } from '@stores/AdminStore';
import { adminStore, uiStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';

interface UserFeatureOverrideModalProps {
  open: boolean;
  onClose: () => void;
  user: AdminUser | null;
}

const featureTypeLabels = {
  song_previews: 'Song Previews',
  song_favorites: 'Song Favorites',
  show_favorites: 'Show Favorites',
  ad_free: 'Ad-Free Access',
  premium_access: 'Premium Access',
};

const featureTypeIcons = {
  song_previews: faPlay,
  song_favorites: faMusic,
  show_favorites: faHeart,
  ad_free: faCog,
  premium_access: faCrown,
};

export const UserFeatureOverrideModal: React.FC<UserFeatureOverrideModalProps> = observer(
  ({ open, onClose, user }) => {
    const theme = useTheme();
    const [overrides, setOverrides] = useState<AdminUserFeatureOverride[]>([]);
    const [editingOverride, setEditingOverride] = useState<AdminUserFeatureOverride | null>(null);
    const [formData, setFormData] = useState({
      featureType: 'song_previews' as AdminUserFeatureOverride['featureType'],
      isEnabled: true,
      customLimit: null as number | null,
      notes: '',
      expiresAt: null as Date | null,
    });

    useEffect(() => {
      if (open && user) {
        loadUserOverrides();
      }
    }, [open, user]);

    const loadUserOverrides = async () => {
      if (!user) return;

      try {
        const data = await adminStore.getUserFeatureOverrides(user.id);
        setOverrides(data);
      } catch (error) {
        uiStore.addNotification('Failed to load user overrides', 'error');
      }
    };

    const resetForm = () => {
      setFormData({
        featureType: 'song_previews',
        isEnabled: true,
        customLimit: null,
        notes: '',
        expiresAt: null,
      });
      setEditingOverride(null);
    };

    const handleSave = async () => {
      if (!user) return;

      try {
        if (editingOverride) {
          await adminStore.updateFeatureOverride(editingOverride.id, {
            isEnabled: formData.isEnabled,
            customLimit: formData.customLimit,
            notes: formData.notes,
            expiresAt: formData.expiresAt,
          });
          uiStore.addNotification('Feature override updated successfully', 'success');
        } else {
          await adminStore.createFeatureOverride({
            userId: user.id,
            featureType: formData.featureType,
            isEnabled: formData.isEnabled,
            customLimit: formData.customLimit,
            notes: formData.notes,
            expiresAt: formData.expiresAt,
          });
          uiStore.addNotification('Feature override created successfully', 'success');
        }

        resetForm();
        loadUserOverrides();
      } catch (error) {
        uiStore.addNotification('Failed to save feature override', 'error');
      }
    };

    const handleEdit = (override: AdminUserFeatureOverride) => {
      setEditingOverride(override);
      setFormData({
        featureType: override.featureType,
        isEnabled: override.isEnabled,
        customLimit: override.customLimit,
        notes: override.notes || '',
        expiresAt: override.expiresAt,
      });
    };

    const handleDelete = async (overrideId: string) => {
      try {
        await adminStore.deleteFeatureOverride(overrideId);
        uiStore.addNotification('Feature override deleted successfully', 'success');
        loadUserOverrides();
      } catch (error) {
        uiStore.addNotification('Failed to delete feature override', 'error');
      }
    };

    const formatDate = (date: Date | null) => {
      if (!date) return 'Never';
      return new Date(date).toLocaleDateString();
    };

    if (!user) return null;

    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            minHeight: '70vh',
            maxHeight: '90vh',
            background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 2,
            px: 3,
            pt: 3,
            borderBottom: `1px solid ${theme.palette.divider}`,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}10 0%, transparent 100%)`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                backgroundColor: theme.palette.primary.main + '15',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FontAwesomeIcon
                icon={faUserShield}
                style={{ color: theme.palette.primary.main, fontSize: '20px' }}
              />
            </Box>
            <Box>
              <Typography variant="h5" component="div" fontWeight={600}>
                Feature Overrides
              </Typography>
              <Typography variant="body2" component="div" color="text.secondary">
                {user.name} ({user.email})
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              backgroundColor: theme.palette.action.hover,
              '&:hover': {
                backgroundColor: theme.palette.action.selected,
              },
            }}
          >
            <FontAwesomeIcon icon={faTimes} style={{ fontSize: '16px' }} />
          </IconButton>
        </DialogTitle>

        <DialogContent
          sx={{
            px: 3,
            py: 2,
            '&::-webkit-scrollbar': {
              width: 8,
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: theme.palette.action.hover,
              borderRadius: 4,
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: theme.palette.action.selected,
              borderRadius: 4,
            },
          }}
        >
          {/* Add/Edit Form */}
          <Box 
            sx={{ 
              mt: 3,
              mb: 3, 
              p: 3, 
              borderRadius: 2,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}08 0%, transparent 100%)`,
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: 2,
                  backgroundColor: theme.palette.primary.main + '15',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FontAwesomeIcon
                  icon={editingOverride ? faCog : faUserShield}
                  style={{ color: theme.palette.primary.main, fontSize: '16px' }}
                />
              </Box>
              <Typography variant="h6" fontWeight={600}>
                {editingOverride ? 'Edit Override' : 'Add New Override'}
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              }}
            >
              <FormControl fullWidth disabled={!!editingOverride}>
                <InputLabel>Feature Type</InputLabel>
                <Select
                  value={formData.featureType}
                  label="Feature Type"
                  onChange={(e) => setFormData({ ...formData, featureType: e.target.value as any })}
                >
                  {Object.entries(featureTypeLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FontAwesomeIcon
                          icon={featureTypeIcons[value as keyof typeof featureTypeIcons]}
                          style={{ fontSize: '14px' }}
                        />
                        {label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Custom Limit"
                type="number"
                value={formData.customLimit || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    customLimit: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                helperText="Leave empty for unlimited"
              />

              <TextField
                label="Expiration Date"
                type="datetime-local"
                value={formData.expiresAt ? formData.expiresAt.toISOString().slice(0, 16) : ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    expiresAt: e.target.value ? new Date(e.target.value) : null,
                  })
                }
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarToday 
                        sx={{ 
                          color: theme.palette.primary.main,
                          fontSize: '20px' 
                        }} 
                      />
                    </InputAdornment>
                  ),
                }}
                helperText="Leave empty for no expiration"
                sx={{
                  '& input[type="datetime-local"]::-webkit-calendar-picker-indicator': {
                    opacity: 0,
                    position: 'absolute',
                    right: 0,
                    width: '100%',
                    height: '100%',
                    cursor: 'pointer',
                  },
                }}
              />
            </Box>

            <Box sx={{ mt: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isEnabled}
                    onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                  />
                }
                label="Enabled"
              />
            </Box>

            <TextField
              fullWidth
              label="Admin Notes"
              multiline
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              sx={{ mt: 2 }}
              helperText="Optional notes about why this override was granted"
            />

            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                onClick={handleSave}
                startIcon={<FontAwesomeIcon icon={faCheck} />}
              >
                {editingOverride ? 'Update' : 'Create'} Override
              </Button>
              {editingOverride && (
                <Button
                  variant="outlined"
                  onClick={resetForm}
                  startIcon={<FontAwesomeIcon icon={faTimes} />}
                >
                  Cancel
                </Button>
              )}
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Existing Overrides */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                backgroundColor: theme.palette.secondary.main + '15',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FontAwesomeIcon
                icon={faCog}
                style={{ color: theme.palette.secondary.main, fontSize: '16px' }}
              />
            </Box>
            <Typography variant="h6" fontWeight={600}>
              Current Overrides
            </Typography>
          </Box>

          {overrides.length === 0 ? (
            <Box
              sx={{
                textAlign: 'center',
                py: 8,
                px: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                borderRadius: 2,
                backgroundColor: theme.palette.action.hover,
              }}
            >
              <FontAwesomeIcon
                icon={faUserShield}
                style={{
                  fontSize: '48px',
                  color: theme.palette.text.disabled,
                  opacity: 0.5,
                }}
              />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No Overrides Found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300 }}>
                No feature overrides configured for this user
              </Typography>
            </Box>
          ) : (
            <TableContainer
              sx={{
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                overflow: 'hidden',
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow
                    sx={{
                      backgroundColor: theme.palette.action.hover,
                      '& .MuiTableCell-head': {
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        borderBottom: `1px solid ${theme.palette.divider}`,
                      },
                    }}
                  >
                    <TableCell>Feature</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Limit</TableCell>
                    <TableCell>Expires</TableCell>
                    <TableCell>Notes</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {overrides.map((override) => (
                    <TableRow key={override.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <FontAwesomeIcon
                            icon={featureTypeIcons[override.featureType]}
                            style={{ fontSize: '14px' }}
                          />
                          {featureTypeLabels[override.featureType]}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={override.isEnabled ? 'Enabled' : 'Disabled'}
                          color={override.isEnabled ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {override.customLimit === null ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <FontAwesomeIcon icon={faInfinity} style={{ fontSize: '12px' }} />
                            Unlimited
                          </Box>
                        ) : (
                          override.customLimit
                        )}
                      </TableCell>
                      <TableCell>{formatDate(override.expiresAt)}</TableCell>
                      <TableCell>
                        <Tooltip title={override.notes || ''}>
                          <Typography noWrap sx={{ maxWidth: 150 }}>
                            {override.notes || '-'}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(override)}
                            color="primary"
                          >
                            <FontAwesomeIcon icon={faCog} style={{ fontSize: '12px' }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(override.id)}
                            color="error"
                          >
                            <FontAwesomeIcon icon={faTrash} style={{ fontSize: '12px' }} />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: `1px solid ${theme.palette.divider}`,
            background: `linear-gradient(135deg, ${theme.palette.action.hover}50 0%, transparent 100%)`,
          }}
        >
          <Button 
            onClick={onClose} 
            startIcon={<FontAwesomeIcon icon={faTimes} />}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              px: 3,
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  },
);
