import {
  faCoins,
  faCopy,
  faCrown,
  faEdit,
  faExclamationTriangle,
  faLightbulb,
  faMicrophone,
  faPlus,
  faSearch,
  faTrash,
  faUpload,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { adminStore } from '@stores/AdminStore';
import { uiStore } from '@stores/index';
import { formatPrice } from '@utils/numberUtils';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import CustomModal from './CustomModal';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`store-management-tabpanel-${index}`}
      aria-labelledby={`store-management-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 4 }}>{children}</Box>}
    </div>
  );
}

interface AddItemDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  itemType: 'avatar' | 'microphone' | 'coinPackage';
  formData: any;
  onChange: (field: string, value: any) => void;
  selectedFile: File | null;
  onFileSelect: (file: File) => void;
  onDrag: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  dragActive: boolean;
  loading: boolean;
  aiSuggestions: string[];
  onAiSuggestion: () => void;
  suggestionLoading: boolean;
}

const AddItemDialog: React.FC<AddItemDialogProps> = ({
  open,
  onClose,
  onSave,
  itemType,
  formData,
  onChange,
  selectedFile,
  onFileSelect,
  onDrag,
  onDrop,
  dragActive,
  loading,
  aiSuggestions,
  onAiSuggestion,
  suggestionLoading,
}) => {
  const theme = useTheme();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const rarityOptions = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  const avatarTypeOptions = ['basic', 'premium', 'seasonal', 'special'];
  const microphoneTypeOptions = ['basic', 'vintage', 'modern', 'wireless', 'premium', 'golden'];

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onFileSelect(event.target.files[0]);
    }
  };

  return (
    <CustomModal
      open={open}
      onClose={onClose}
      title={`Add New ${itemType.charAt(0).toUpperCase() + itemType.slice(1)}`}
      icon={<FontAwesomeIcon icon={faPlus} />}
      maxWidth="md"
    >
      <Grid container spacing={3}>
        {/* File Upload Section - Only for avatars and microphones */}
        {itemType !== 'coinPackage' && (
          <Grid item xs={12}>
            <Box
              sx={{
                border: `2px dashed ${dragActive ? theme.palette.primary.main : theme.palette.divider}`,
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                backgroundColor: dragActive ? `${theme.palette.primary.main}10` : 'transparent',
                '&:hover': {
                  borderColor: theme.palette.primary.main,
                  backgroundColor: `${theme.palette.primary.main}05`,
                },
              }}
              onDragEnter={onDrag}
              onDragLeave={onDrag}
              onDragOver={onDrag}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <FontAwesomeIcon
                icon={faUpload}
                size="2x"
                style={{
                  color: dragActive ? theme.palette.primary.main : theme.palette.text.secondary,
                  marginBottom: 16,
                }}
              />
              <Typography variant="h6" gutterBottom>
                {selectedFile ? selectedFile.name : 'Drop image here or click to select'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Supports: JPG, PNG, GIF, WebP
              </Typography>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileInputChange}
              />
            </Box>
          </Grid>
        )}

        <Grid item xs={12} md={6}>
          <Box>
            <TextField
              fullWidth
              label="Name"
              value={formData.name || ''}
              onChange={(e) => onChange('name', e.target.value)}
              variant="outlined"
              required
            />
            <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* AI Suggestion button - Only for avatars and microphones */}
              {itemType !== 'coinPackage' && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={
                    suggestionLoading ? (
                      <CircularProgress size={16} />
                    ) : (
                      <FontAwesomeIcon icon={faLightbulb} />
                    )
                  }
                  onClick={onAiSuggestion}
                  disabled={suggestionLoading || !formData.rarity}
                  sx={{ fontSize: '0.75rem', py: 0.5 }}
                >
                  {suggestionLoading ? 'Thinking...' : 'AI Suggest'}
                </Button>
              )}
              {aiSuggestions.map((suggestion, index) => (
                <Chip
                  key={index}
                  label={suggestion}
                  size="small"
                  variant="outlined"
                  clickable
                  onClick={() => onChange('name', suggestion)}
                  sx={{ fontSize: '0.75rem' }}
                />
              ))}
            </Box>
          </Box>
        </Grid>
        {/* Image URL field - Only for avatars and microphones */}
        {itemType !== 'coinPackage' && (
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Image URL"
              value={formData.imageUrl || ''}
              onChange={(e) => onChange('imageUrl', e.target.value)}
              variant="outlined"
              helperText="Enter the URL of the image or use file upload above"
            />
          </Grid>
        )}

        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Description"
            value={formData.description || ''}
            onChange={(e) => onChange('description', e.target.value)}
            variant="outlined"
          />
        </Grid>

        {/* Coin Package specific fields */}
        {itemType === 'coinPackage' ? (
          <>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Coin Amount"
                value={formData.coinAmount || 0}
                onChange={(e) => onChange('coinAmount', parseInt(e.target.value) || 0)}
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FontAwesomeIcon icon={faCoins} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Price (USD)"
                value={formData.priceUSD || 0}
                onChange={(e) => onChange('priceUSD', parseFloat(e.target.value) || 0)}
                variant="outlined"
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Bonus Coins"
                value={formData.bonusCoins || 0}
                onChange={(e) => onChange('bonusCoins', parseInt(e.target.value) || 0)}
                variant="outlined"
                helperText="Extra coins for larger packages"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FontAwesomeIcon icon={faCoins} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Sort Order"
                value={formData.sortOrder || 0}
                onChange={(e) => onChange('sortOrder', parseInt(e.target.value) || 0)}
                variant="outlined"
                helperText="Lower numbers appear first"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography>Is Active</Typography>
                <Switch
                  checked={formData.isActive !== undefined ? formData.isActive : true}
                  onChange={(e) => onChange('isActive', e.target.checked)}
                  color="primary"
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Max Redemptions"
                value={formData.maxRedemptions || ''}
                onChange={(e) =>
                  onChange('maxRedemptions', e.target.value ? parseInt(e.target.value) : null)
                }
                variant="outlined"
                helperText="Leave empty for unlimited redemptions"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="datetime-local"
                label="Expiry Date"
                value={formData.expiryDate || ''}
                onChange={(e) => onChange('expiryDate', e.target.value || null)}
                variant="outlined"
                helperText="Leave empty if package doesn't expire"
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography>Limited Time Offer</Typography>
                <Switch
                  checked={formData.isLimitedTime || false}
                  onChange={(e) => onChange('isLimitedTime', e.target.checked)}
                  color="primary"
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography>One Time Use</Typography>
                <Switch
                  checked={formData.isOneTimeUse || false}
                  onChange={(e) => onChange('isOneTimeUse', e.target.checked)}
                  color="primary"
                />
              </Box>
            </Grid>
          </>
        ) : (
          <>
            {/* Avatar/Microphone specific fields */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Rarity</InputLabel>
                <Select
                  value={formData.rarity || 'common'}
                  label="Rarity"
                  onChange={(e) => onChange('rarity', e.target.value)}
                >
                  {rarityOptions.map((rarity) => (
                    <MenuItem key={rarity} value={rarity}>
                      {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type || 'basic'}
                  label="Type"
                  onChange={(e) => onChange('type', e.target.value)}
                >
                  {(itemType === 'avatar' ? avatarTypeOptions : microphoneTypeOptions).map(
                    (type) => (
                      <MenuItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </MenuItem>
                    ),
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Coin Price"
                value={formData.coinPrice || 0}
                onChange={(e) => {
                  const coinPrice = parseInt(e.target.value) || 0;
                  onChange('coinPrice', coinPrice);
                  // Auto-select "Is Free" when coin price is 0
                  onChange('isFree', coinPrice === 0);
                }}
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FontAwesomeIcon icon={faCoins} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography>Is Free</Typography>
                <Switch
                  checked={formData.isFree || false}
                  onChange={(e) => onChange('isFree', e.target.checked)}
                  color="primary"
                  disabled={formData.coinPrice === 0} // Disable when coin price is 0 (auto-selected)
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography>Is Available</Typography>
                <Switch
                  checked={formData.isAvailable !== undefined ? formData.isAvailable : true}
                  onChange={(e) => onChange('isAvailable', e.target.checked)}
                  color="primary"
                />
              </Box>
            </Grid>
          </>
        )}
      </Grid>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={onSave}
          variant="contained"
          disabled={
            loading ||
            !formData.name ||
            (itemType !== 'coinPackage' && !selectedFile && !formData.imageUrl)
          }
          startIcon={loading ? <CircularProgress size={16} /> : <FontAwesomeIcon icon={faPlus} />}
        >
          {loading ? 'Creating...' : 'Create Item'}
        </Button>
      </Box>
    </CustomModal>
  );
};

interface EditItemDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  itemType: 'avatar' | 'microphone' | 'coinPackage';
  formData: any;
  onChange: (field: string, value: any) => void;
  loading: boolean;
}

const EditItemDialog: React.FC<EditItemDialogProps> = ({
  open,
  onClose,
  onSave,
  itemType,
  formData,
  onChange,
  loading,
}) => {
  const rarityOptions = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  const avatarTypeOptions = ['basic', 'premium', 'seasonal', 'special'];
  const microphoneTypeOptions = ['basic', 'vintage', 'modern', 'wireless', 'premium', 'golden'];

  return (
    <CustomModal
      open={open}
      onClose={onClose}
      title={`Edit ${itemType.charAt(0).toUpperCase() + itemType.slice(1)}`}
      icon={<FontAwesomeIcon icon={faEdit} />}
      maxWidth="md"
    >
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Name"
            value={formData.name || ''}
            onChange={(e) => onChange('name', e.target.value)}
            variant="outlined"
          />
        </Grid>
        {/* Image URL field - Only for avatars and microphones */}
        {itemType !== 'coinPackage' && (
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Image URL"
              value={formData.imageUrl || ''}
              onChange={(e) => onChange('imageUrl', e.target.value)}
              variant="outlined"
              helperText="URL to the item's image"
            />
          </Grid>
        )}

        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Description"
            value={formData.description || ''}
            onChange={(e) => onChange('description', e.target.value)}
            variant="outlined"
          />
        </Grid>

        {/* Coin Package specific fields */}
        {itemType === 'coinPackage' ? (
          <>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Coin Amount"
                value={formData.coinAmount || 0}
                onChange={(e) => onChange('coinAmount', parseInt(e.target.value) || 0)}
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FontAwesomeIcon icon={faCoins} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Price (USD)"
                value={formData.priceUSD || 0}
                onChange={(e) => onChange('priceUSD', parseFloat(e.target.value) || 0)}
                variant="outlined"
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Bonus Coins"
                value={formData.bonusCoins || 0}
                onChange={(e) => onChange('bonusCoins', parseInt(e.target.value) || 0)}
                variant="outlined"
                helperText="Extra coins for larger packages"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FontAwesomeIcon icon={faCoins} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Sort Order"
                value={formData.sortOrder || 0}
                onChange={(e) => onChange('sortOrder', parseInt(e.target.value) || 0)}
                variant="outlined"
                helperText="Lower numbers appear first"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography>Is Active</Typography>
                <Switch
                  checked={formData.isActive !== undefined ? formData.isActive : true}
                  onChange={(e) => onChange('isActive', e.target.checked)}
                  color="primary"
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Max Redemptions"
                value={formData.maxRedemptions || ''}
                onChange={(e) =>
                  onChange('maxRedemptions', e.target.value ? parseInt(e.target.value) : null)
                }
                variant="outlined"
                helperText="Leave empty for unlimited redemptions"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="datetime-local"
                label="Expiry Date"
                value={formData.expiryDate || ''}
                onChange={(e) => onChange('expiryDate', e.target.value || null)}
                variant="outlined"
                helperText="Leave empty if package doesn't expire"
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography>Limited Time Offer</Typography>
                <Switch
                  checked={formData.isLimitedTime || false}
                  onChange={(e) => onChange('isLimitedTime', e.target.checked)}
                  color="primary"
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography>One Time Use</Typography>
                <Switch
                  checked={formData.isOneTimeUse || false}
                  onChange={(e) => onChange('isOneTimeUse', e.target.checked)}
                  color="primary"
                />
              </Box>
            </Grid>
          </>
        ) : (
          <>
            {/* Avatar/Microphone specific fields */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Rarity</InputLabel>
                <Select
                  value={formData.rarity || 'common'}
                  label="Rarity"
                  onChange={(e) => onChange('rarity', e.target.value)}
                >
                  {rarityOptions.map((rarity) => (
                    <MenuItem key={rarity} value={rarity}>
                      {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type || 'basic'}
                  label="Type"
                  onChange={(e) => onChange('type', e.target.value)}
                >
                  {(itemType === 'avatar' ? avatarTypeOptions : microphoneTypeOptions).map(
                    (type) => (
                      <MenuItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </MenuItem>
                    ),
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Coin Price"
                value={formData.coinPrice || 0}
                onChange={(e) => {
                  const coinPrice = parseInt(e.target.value) || 0;
                  onChange('coinPrice', coinPrice);
                  // Auto-select "Is Free" when coin price is 0
                  onChange('isFree', coinPrice === 0);
                }}
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FontAwesomeIcon icon={faCoins} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography>Is Free</Typography>
                <Switch
                  checked={formData.isFree || false}
                  onChange={(e) => onChange('isFree', e.target.checked)}
                  color="primary"
                  disabled={formData.coinPrice === 0} // Disable when coin price is 0 (auto-selected)
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography>Is Available</Typography>
                <Switch
                  checked={formData.isAvailable !== undefined ? formData.isAvailable : true}
                  onChange={(e) => onChange('isAvailable', e.target.checked)}
                  color="primary"
                />
              </Box>
            </Grid>
          </>
        )}
      </Grid>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={onSave}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : <FontAwesomeIcon icon={faEdit} />}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </Box>
    </CustomModal>
  );
};

interface DeleteConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onForceDelete?: () => void;
  itemName: string;
  itemType: string;
  loading: boolean;
  constraintError?: string;
}

const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  open,
  onClose,
  onConfirm,
  onForceDelete,
  itemName,
  itemType,
  loading,
  constraintError,
}) => {
  return (
    <CustomModal
      open={open}
      onClose={onClose}
      title={`Delete ${itemType}`}
      icon={<FontAwesomeIcon icon={faExclamationTriangle} />}
      maxWidth="sm"
    >
      <Typography variant="body1" gutterBottom>
        Are you sure you want to delete "{itemName}"?
      </Typography>

      {constraintError ? (
        <Box sx={{ mt: 2, mb: 3 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" component="div">
              {constraintError}
            </Typography>
          </Alert>
          <Typography variant="body2" sx={{ color: 'warning.main', mb: 1 }}>
            Force delete will:
          </Typography>
          <Typography variant="body2" sx={{ color: 'error.main', mb: 1 }}>
            • Remove all user ownership records
          </Typography>
          <Typography variant="body2" sx={{ color: 'error.main', mb: 1 }}>
            • Unequip from all users who have it equipped
          </Typography>
          <Typography variant="body2" sx={{ color: 'error.main', mb: 1 }}>
            • Permanently delete the database record and image file
          </Typography>
          <Typography variant="body2" sx={{ color: 'warning.main' }}>
            • This action cannot be undone
          </Typography>
        </Box>
      ) : (
        <Box sx={{ mt: 2, mb: 3 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            This action will:
          </Typography>
          <Typography variant="body2" sx={{ color: 'error.main', mb: 1 }}>
            • Permanently delete the database record
          </Typography>
          <Typography variant="body2" sx={{ color: 'error.main', mb: 1 }}>
            • Delete the associated image file from the server
          </Typography>
          <Typography variant="body2" sx={{ color: 'warning.main' }}>
            • This action cannot be undone
          </Typography>
        </Box>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        {constraintError && onForceDelete ? (
          <Button
            onClick={onForceDelete}
            color="error"
            variant="contained"
            disabled={loading}
            startIcon={
              loading ? <CircularProgress size={16} /> : <FontAwesomeIcon icon={faTrash} />
            }
          >
            {loading ? 'Force Deleting...' : 'Force Delete'}
          </Button>
        ) : (
          <Button
            onClick={onConfirm}
            color="error"
            variant="contained"
            disabled={loading}
            startIcon={
              loading ? <CircularProgress size={16} /> : <FontAwesomeIcon icon={faTrash} />
            }
          >
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        )}
      </Box>
    </CustomModal>
  );
};

const StoreManagement: React.FC = observer(() => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [searchTerms, setSearchTerms] = useState({
    avatars: '',
    microphones: '',
    coinPackages: '',
  });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    item: any;
    type: 'avatar' | 'microphone' | 'coinPackage';
    forceDelete?: boolean;
    constraintError?: string;
  }>({
    open: false,
    item: null,
    type: 'avatar',
    forceDelete: false,
    constraintError: undefined,
  });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Edit dialog states
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    item: any;
    type: 'avatar' | 'microphone' | 'coinPackage';
  }>({
    open: false,
    item: null,
    type: 'avatar',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});

  // Add new item dialog states
  const [addDialog, setAddDialog] = useState<{
    open: boolean;
    type: 'avatar' | 'microphone' | 'coinPackage';
  }>({
    open: false,
    type: 'avatar',
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addFormData, setAddFormData] = useState<any>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  // Preview modal state
  const [previewModal, setPreviewModal] = useState<{
    open: boolean;
    item: any;
    type: 'avatar' | 'microphone' | 'coinPackage';
  }>({
    open: false,
    item: null,
    type: 'avatar',
  });

  useEffect(() => {
    // Load store items when component mounts
    adminStore.fetchStoreAvatars();
    adminStore.fetchStoreMicrophones();
    adminStore.fetchStoreCoinPackages();
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSearch = (type: 'avatars' | 'microphones' | 'coinPackages') => {
    const searchTerm = searchTerms[type];
    switch (type) {
      case 'avatars':
        adminStore.fetchStoreAvatars(1, 50, searchTerm);
        break;
      case 'microphones':
        adminStore.fetchStoreMicrophones(1, 50, searchTerm);
        break;
      case 'coinPackages':
        adminStore.fetchStoreCoinPackages(1, 50, searchTerm);
        break;
    }
  };

  const handleEdit = (item: any, type: 'avatar' | 'microphone' | 'coinPackage') => {
    if (type === 'coinPackage') {
      setEditFormData({
        name: item.name,
        description: item.description || '',
        coinAmount: item.coinAmount || 0,
        priceUSD: item.priceUSD || 0,
        bonusCoins: item.bonusCoins || 0,
        isActive: item.isActive !== undefined ? item.isActive : true,
        sortOrder: item.sortOrder || 0,
        maxRedemptions: item.maxRedemptions || null,
        expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().slice(0, 16) : '',
        isLimitedTime: item.isLimitedTime || false,
        isOneTimeUse: item.isOneTimeUse || false,
      });
    } else {
      setEditFormData({
        name: item.name,
        description: item.description || '',
        price: item.price || 0,
        coinPrice: item.coinPrice || 0,
        rarity: item.rarity || 'common',
        type: item.type || 'basic',
        isFree: item.isFree || false,
        isAvailable: item.isAvailable !== undefined ? item.isAvailable : true,
        imageUrl: item.imageUrl || '',
      });
    }
    setEditDialog({
      open: true,
      item,
      type,
    });
  };

  const handleEditFormChange = (field: string, value: any) => {
    setEditFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const confirmEdit = async () => {
    if (!editDialog.item) return;

    setEditLoading(true);
    adminStore.setTableError(null);

    try {
      console.log(`📝 Updating ${editDialog.type}:`, editDialog.item.id, editFormData);

      switch (editDialog.type) {
        case 'avatar':
          await adminStore.updateStoreAvatar(editDialog.item.id, editFormData);
          break;
        case 'microphone':
          await adminStore.updateStoreMicrophone(editDialog.item.id, editFormData);
          break;
        case 'coinPackage':
          await adminStore.updateStoreCoinPackage(editDialog.item.id, editFormData);
          break;
      }

      console.log(`✅ Successfully updated ${editDialog.type}: ${editFormData.name}`);
      setEditDialog({ open: false, item: null, type: 'avatar' });
    } catch (error: any) {
      console.error('Edit error in component:', error);
      // Error will be shown via adminStore.tableError
    } finally {
      setEditLoading(false);
    }
  };

  const handleAdd = (type: 'avatar' | 'microphone' | 'coinPackage') => {
    if (type === 'coinPackage') {
      setAddFormData({
        name: '',
        description: '',
        coinAmount: 0,
        priceUSD: 0,
        bonusCoins: 0,
        isActive: true,
        sortOrder: 0,
      });
    } else {
      setAddFormData({
        name: '',
        description: '',
        price: 0,
        coinPrice: 0,
        rarity: 'common',
        type: 'basic',
        isFree: false,
        isAvailable: true,
        imageUrl: '',
      });
    }
    setSelectedFile(null);
    setAiSuggestions([]);
    setAddDialog({
      open: true,
      type,
    });
  };

  const handleAddFormChange = (field: string, value: any) => {
    setAddFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileSelect = (file: File) => {
    // File upload is only for avatars and microphones, not coin packages
    if (addDialog.type === 'coinPackage') {
      return;
    }

    setSelectedFile(file);
    // Auto-generate the imageUrl based on the pattern
    const fileExtension = file.name.split('.').pop();
    const baseFileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
    const sanitizedFileName = baseFileName.toLowerCase().replace(/[^a-z0-9]/g, '-');

    let imagePath = '';
    if (addDialog.type === 'avatar') {
      imagePath = `/images/avatar/avatars/${sanitizedFileName}.${fileExtension}`;
    } else {
      imagePath = `/images/microphones/microphones/${sanitizedFileName}.${fileExtension}`;
    }

    handleAddFormChange('imageUrl', imagePath);
  };

  const handleAiSuggestion = async () => {
    // Only provide AI suggestions for avatars and microphones, not coin packages
    if (addDialog.type === 'coinPackage') {
      adminStore.setTableError('AI suggestions are not available for coin packages');
      return;
    }

    if (!addFormData.rarity) {
      adminStore.setTableError('Please select a rarity first');
      return;
    }

    setSuggestionLoading(true);
    try {
      const suggestions = await adminStore.suggestItemName(
        addDialog.type as 'avatar' | 'microphone',
        addFormData.rarity,
        addFormData.description,
      );
      setAiSuggestions(suggestions);
      console.log('🤖 AI suggestions received:', suggestions);
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      adminStore.setTableError('Failed to get AI suggestions');
    } finally {
      setSuggestionLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const confirmAdd = async () => {
    // Validation based on item type
    if (!addFormData.name) {
      adminStore.setTableError('Please provide a name');
      return;
    }

    if (addDialog.type !== 'coinPackage' && !selectedFile && !addFormData.imageUrl) {
      adminStore.setTableError('Please select an image file or provide an image URL');
      return;
    }

    setAddLoading(true);
    adminStore.setTableError(null);

    try {
      console.log(`➕ Creating new ${addDialog.type}:`, addFormData);

      // TODO: Upload file and create item
      // For now, just use the form data as-is
      switch (addDialog.type) {
        case 'avatar':
          await adminStore.createStoreAvatar(addFormData);
          break;
        case 'microphone':
          await adminStore.createStoreMicrophone(addFormData);
          break;
        case 'coinPackage':
          await adminStore.createStoreCoinPackage(addFormData);
          break;
      }

      console.log(`✅ Successfully created ${addDialog.type}: ${addFormData.name}`);
      setAddDialog({ open: false, type: 'avatar' });
    } catch (error: any) {
      console.error('Add error in component:', error);
      // Error will be shown via adminStore.tableError
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = (item: any, type: 'avatar' | 'microphone' | 'coinPackage') => {
    setDeleteDialog({
      open: true,
      item,
      type,
    });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.item) return;

    setDeleteLoading(true);

    // Clear any previous errors
    adminStore.setTableError(null);

    try {
      console.log(`🗑️ Confirming delete for ${deleteDialog.type}:`, deleteDialog.item);

      switch (deleteDialog.type) {
        case 'avatar':
          await adminStore.deleteStoreAvatar(deleteDialog.item.id);
          break;
        case 'microphone':
          await adminStore.deleteStoreMicrophone(deleteDialog.item.id, deleteDialog.forceDelete);
          break;
        case 'coinPackage':
          await adminStore.deleteStoreCoinPackage(deleteDialog.item.id);
          break;
      }

      console.log(`✅ Successfully deleted ${deleteDialog.type}: ${deleteDialog.item.name}`);
      setDeleteDialog({ open: false, item: null, type: 'avatar' });
    } catch (error: any) {
      console.error('Delete error in component:', error);

      // Check if this is a constraint error for microphones
      if (
        deleteDialog.type === 'microphone' &&
        !deleteDialog.forceDelete &&
        (error.message.includes('Use force delete') || error.message.includes('ownership records'))
      ) {
        // Update dialog to show constraint error and offer force delete
        setDeleteDialog((prev) => ({
          ...prev,
          constraintError: error.message,
        }));
      }
      // Error will be shown via adminStore.tableError
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleForceDelete = () => {
    setDeleteDialog((prev) => ({
      ...prev,
      forceDelete: true,
      constraintError: undefined,
    }));
    // Trigger delete again with force flag
    confirmDelete();
  };

  const handlePreviewItem = (item: any, type: 'avatar' | 'microphone' | 'coinPackage') => {
    setPreviewModal({
      open: true,
      item,
      type,
    });
  };

  const handleCopyImageUrl = async (imageUrl: string) => {
    try {
      await navigator.clipboard.writeText(imageUrl);
      uiStore.addNotification('Image URL copied to clipboard!', 'success');
    } catch (error) {
      uiStore.addNotification('Failed to copy image URL', 'error');
    }
  };

  const renderAvatarCard = (avatar: any) => (
    <Grid item xs={12} sm={6} md={4} xl={3} key={avatar.id}>
      <Card
        elevation={4}
        onClick={() => handlePreviewItem(avatar, 'avatar')}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
          background:
            theme.palette.mode === 'dark'
              ? `linear-gradient(135deg, 
                ${theme.palette.grey[800]} 0%, 
                ${theme.palette.grey[900]} 100%)`
              : `linear-gradient(135deg, 
                ${theme.palette.background.paper} 0%, 
                ${theme.palette.grey[50]} 100%)`,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 3,
          overflow: 'hidden',
          minHeight: 350,
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow:
              theme.palette.mode === 'dark'
                ? `0 8px 32px rgba(0, 0, 0, 0.5)`
                : `0 12px 40px ${theme.palette.primary.main}25`,
            border: `1px solid ${theme.palette.primary.main}`,
          },
        }}
      >
        <CardMedia
          component="img"
          height="180"
          image={avatar.imageUrl}
          alt={avatar.name}
          sx={{
            objectFit: 'contain',
            backgroundColor:
              theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.grey[100],
            p: 2,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        />
        <CardContent sx={{ flexGrow: 1, p: 3 }}>
          <Typography
            variant="h6"
            gutterBottom
            sx={{ fontWeight: 600, mb: 2, color: theme.palette.text.primary }}
          >
            {avatar.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
            {avatar.description || 'No description'}
          </Typography>
          <Box sx={{ mt: 'auto', display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              size="small"
              label={avatar.rarity}
              color={avatar.rarity === 'legendary' ? 'warning' : 'default'}
              sx={{ fontWeight: 500 }}
            />
            <Chip
              size="small"
              label={avatar.isFree ? 'Free' : formatPrice(avatar.price)}
              color={avatar.isFree ? 'success' : 'primary'}
              sx={{ fontWeight: 500 }}
            />
          </Box>
        </CardContent>
        <CardActions sx={{ p: 3, pt: 0 }}>
          <IconButton
            size="medium"
            color="primary"
            onClick={() => handleEdit(avatar, 'avatar')}
            sx={{ mr: 1 }}
          >
            <FontAwesomeIcon icon={faEdit} />
          </IconButton>
          <IconButton
            size="medium"
            color="error"
            onClick={() => handleDelete(avatar, 'avatar')}
            sx={{ mr: 1 }}
          >
            <FontAwesomeIcon icon={faTrash} />
          </IconButton>
        </CardActions>
      </Card>
    </Grid>
  );

  const renderMicrophoneCard = (microphone: any) => (
    <Grid item xs={12} sm={6} md={4} xl={3} key={microphone.id}>
      <Card
        elevation={4}
        onClick={() => handlePreviewItem(microphone, 'microphone')}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
          background:
            theme.palette.mode === 'dark'
              ? `linear-gradient(135deg, 
                ${theme.palette.grey[800]} 0%, 
                ${theme.palette.grey[900]} 100%)`
              : `linear-gradient(135deg, 
                ${theme.palette.background.paper} 0%, 
                ${theme.palette.grey[50]} 100%)`,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 3,
          overflow: 'hidden',
          minHeight: 350,
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow:
              theme.palette.mode === 'dark'
                ? `0 8px 32px rgba(0, 0, 0, 0.5)`
                : `0 12px 40px ${theme.palette.primary.main}25`,
            border: `1px solid ${theme.palette.primary.main}`,
          },
        }}
      >
        <CardMedia
          component="img"
          height="180"
          image={microphone.imageUrl}
          alt={microphone.name}
          sx={{
            objectFit: 'contain',
            backgroundColor:
              theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.grey[100],
            p: 2,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        />
        <CardContent sx={{ flexGrow: 1, p: 3 }}>
          <Typography
            variant="h6"
            gutterBottom
            sx={{ fontWeight: 600, mb: 2, color: theme.palette.text.primary }}
          >
            {microphone.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
            {microphone.description || 'No description'}
          </Typography>
          <Box sx={{ mt: 'auto', display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              size="small"
              label={microphone.rarity}
              color={microphone.rarity === 'legendary' ? 'warning' : 'default'}
              sx={{ fontWeight: 500 }}
            />
            <Chip
              size="small"
              label={microphone.isFree ? 'Free' : `${microphone.coinPrice} coins`}
              color={microphone.isFree ? 'success' : 'primary'}
              sx={{ fontWeight: 500 }}
            />
          </Box>
        </CardContent>
        <CardActions sx={{ p: 3, pt: 0 }}>
          <IconButton
            size="medium"
            color="primary"
            onClick={() => handleEdit(microphone, 'microphone')}
            sx={{ mr: 1 }}
          >
            <FontAwesomeIcon icon={faEdit} />
          </IconButton>
          <IconButton
            size="medium"
            color="error"
            onClick={() => handleDelete(microphone, 'microphone')}
            sx={{ mr: 1 }}
          >
            <FontAwesomeIcon icon={faTrash} />
          </IconButton>
        </CardActions>
      </Card>
    </Grid>
  );

  const renderCoinPackageRow = (coinPackage: any) => (
    <TableRow 
      key={coinPackage.id}
      onClick={() => handlePreviewItem(coinPackage, 'coinPackage')}
      sx={{
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: theme.palette.action.hover,
          transform: 'scale(1.01)',
          transition: 'all 0.2s ease',
        },
      }}
    >
      <TableCell>{coinPackage.name}</TableCell>
      <TableCell>{coinPackage.description || 'No description'}</TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <FontAwesomeIcon
            icon={faCoins}
            style={{ marginRight: 8, color: theme.palette.warning.main }}
          />
          {coinPackage.coinAmount}
          {coinPackage.bonusCoins > 0 && (
            <Chip
              size="small"
              label={`+${coinPackage.bonusCoins} bonus`}
              color="success"
              sx={{ ml: 1, fontSize: '0.7rem' }}
            />
          )}
        </Box>
      </TableCell>
      <TableCell>{formatPrice(coinPackage.priceUSD || coinPackage.price || 0)}</TableCell>
      <TableCell>
        {coinPackage.maxRedemptions ? (
          <Box>
            <Typography variant="body2">
              {coinPackage.currentRedemptions || 0} / {coinPackage.maxRedemptions}
            </Typography>
            {coinPackage.currentRedemptions >= coinPackage.maxRedemptions && (
              <Chip size="small" label="Limit Reached" color="error" />
            )}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Unlimited
          </Typography>
        )}
      </TableCell>
      <TableCell>
        {coinPackage.expiryDate ? (
          <Box>
            <Typography variant="body2">
              {new Date(coinPackage.expiryDate).toLocaleDateString()}
            </Typography>
            {new Date(coinPackage.expiryDate) < new Date() && (
              <Chip size="small" label="Expired" color="error" />
            )}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No expiry
          </Typography>
        )}
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {coinPackage.isLimitedTime && <Chip size="small" label="Limited Time" color="warning" />}
          {coinPackage.isOneTimeUse && <Chip size="small" label="One Time Use" color="info" />}
          {!coinPackage.isLimitedTime && !coinPackage.isOneTimeUse && (
            <Typography variant="body2" color="text.secondary">
              Standard
            </Typography>
          )}
        </Box>
      </TableCell>
      <TableCell>
        <Chip
          size="small"
          label={
            (coinPackage.isActive !== undefined ? coinPackage.isActive : coinPackage.isAvailable)
              ? 'Available'
              : 'Unavailable'
          }
          color={
            (coinPackage.isActive !== undefined ? coinPackage.isActive : coinPackage.isAvailable)
              ? 'success'
              : 'error'
          }
        />
      </TableCell>
      <TableCell>
        <IconButton
          size="small"
          color="primary"
          onClick={() => handleEdit(coinPackage, 'coinPackage')}
          sx={{ mr: 1 }}
        >
          <FontAwesomeIcon icon={faEdit} />
        </IconButton>
        <IconButton
          size="small"
          color="error"
          onClick={() => handleDelete(coinPackage, 'coinPackage')}
        >
          <FontAwesomeIcon icon={faTrash} />
        </IconButton>
      </TableCell>
    </TableRow>
  );

  return (
    <Box 
      sx={{ 
        width: '100%',
        background: theme.palette.mode === 'dark'
          ? `linear-gradient(90deg, 
            ${theme.palette.grey[800]} 0%, 
            ${theme.palette.grey[900]} 100%)`
          : `linear-gradient(90deg, 
            ${theme.palette.background.paper} 0%, 
            ${theme.palette.background.default} 100%)`,
        minHeight: '100vh',
        p: 3,
        borderRadius: 2,
      }}
    >
      {adminStore.tableError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {adminStore.tableError}
        </Alert>
      )}

      <Paper
        elevation={4}
        sx={{
          width: '100%',
          mb: 2,
          backgroundColor: 'transparent',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            background:
              theme.palette.mode === 'dark'
                ? `linear-gradient(90deg, 
                  ${theme.palette.grey[800]} 0%, 
                  ${theme.palette.grey[900]} 100%)`
                : `linear-gradient(90deg, 
                  ${theme.palette.background.paper} 0%, 
                  ${theme.palette.background.default} 100%)`,
            '& .MuiTab-root': {
              fontWeight: 600,
              minHeight: 64,
              '&.Mui-selected': {
                color: theme.palette.primary.main,
                fontWeight: 700,
              },
            },
            '& .MuiTabs-indicator': {
              height: 3,
              background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            },
          }}
        >
          <Tab
            icon={<FontAwesomeIcon icon={faCrown} />}
            label={`Avatars (${adminStore.storeItems.avatars?.total || 0})`}
          />
          <Tab
            icon={<FontAwesomeIcon icon={faMicrophone} />}
            label={`Microphones (${adminStore.storeItems.microphones?.total || 0})`}
          />
          <Tab
            icon={<FontAwesomeIcon icon={faCoins} />}
            label={`Coin Packages (${adminStore.storeItems.coinPackages?.total || 0})`}
          />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              placeholder="Search avatars..."
              value={searchTerms.avatars}
              onChange={(e) => setSearchTerms({ ...searchTerms, avatars: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch('avatars')}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FontAwesomeIcon icon={faSearch} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Button onClick={() => handleSearch('avatars')}>Search</Button>
                  </InputAdornment>
                ),
              }}
              sx={{ maxWidth: 400 }}
            />
            <Button
              variant="contained"
              startIcon={<FontAwesomeIcon icon={faPlus} />}
              onClick={() => handleAdd('avatar')}
              sx={{
                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                color: 'white',
                fontWeight: 600,
                px: 3,
                '&:hover': {
                  background: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                },
              }}
            >
              Add Avatar
            </Button>
          </Box>

          {adminStore.isLoadingTable ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={4} sx={{ px: 2 }}>
              {adminStore.storeItems.avatars?.items?.map(renderAvatarCard) || []}
              {adminStore.storeItems.avatars?.items?.length === 0 && (
                <Grid item xs={12}>
                  <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 6 }}>
                    No avatars found
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              placeholder="Search microphones..."
              value={searchTerms.microphones}
              onChange={(e) => setSearchTerms({ ...searchTerms, microphones: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch('microphones')}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FontAwesomeIcon icon={faSearch} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Button onClick={() => handleSearch('microphones')}>Search</Button>
                  </InputAdornment>
                ),
              }}
              sx={{ maxWidth: 400 }}
            />
            <Button
              variant="contained"
              startIcon={<FontAwesomeIcon icon={faPlus} />}
              onClick={() => handleAdd('microphone')}
              sx={{
                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                color: 'white',
                fontWeight: 600,
                px: 3,
                '&:hover': {
                  background: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                },
              }}
            >
              Add Microphone
            </Button>
          </Box>

          {adminStore.isLoadingTable ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={4} sx={{ px: 2 }}>
              {adminStore.storeItems.microphones?.items?.map(renderMicrophoneCard) || []}
              {adminStore.storeItems.microphones?.items?.length === 0 && (
                <Grid item xs={12}>
                  <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 6 }}>
                    No microphones found
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              placeholder="Search coin packages..."
              value={searchTerms.coinPackages}
              onChange={(e) => setSearchTerms({ ...searchTerms, coinPackages: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch('coinPackages')}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FontAwesomeIcon icon={faSearch} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Button onClick={() => handleSearch('coinPackages')}>Search</Button>
                  </InputAdornment>
                ),
              }}
              sx={{ maxWidth: 400 }}
            />
            <Button
              variant="contained"
              startIcon={<FontAwesomeIcon icon={faPlus} />}
              onClick={() => handleAdd('coinPackage')}
              sx={{
                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                color: 'white',
                fontWeight: 600,
                px: 3,
                '&:hover': {
                  background: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                },
              }}
            >
              Add Coin Package
            </Button>
          </Box>

          {adminStore.isLoadingTable ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer
              component={Paper}
              elevation={4}
              sx={{
                background:
                  theme.palette.mode === 'dark'
                    ? `linear-gradient(135deg, 
                      ${theme.palette.grey[800]} 0%, 
                      ${theme.palette.grey[900]} 100%)`
                    : `linear-gradient(135deg, 
                      ${theme.palette.background.paper} 0%, 
                      ${theme.palette.background.default} 100%)`,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Coin Amount</TableCell>
                    <TableCell>Price</TableCell>
                    <TableCell>Redemptions</TableCell>
                    <TableCell>Expiry</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {adminStore.storeItems.coinPackages?.items?.map(renderCoinPackageRow) || []}
                  {adminStore.storeItems.coinPackages?.items?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        <Typography variant="body1" color="text.secondary" sx={{ py: 4 }}>
                          No coin packages found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>
      </Paper>

      <AddItemDialog
        open={addDialog.open}
        onClose={() => setAddDialog({ open: false, type: 'avatar' })}
        onSave={confirmAdd}
        itemType={addDialog.type}
        formData={addFormData}
        onChange={handleAddFormChange}
        selectedFile={selectedFile}
        onFileSelect={handleFileSelect}
        onDrag={handleDrag}
        onDrop={handleDrop}
        dragActive={dragActive}
        loading={addLoading}
        aiSuggestions={aiSuggestions}
        onAiSuggestion={handleAiSuggestion}
        suggestionLoading={suggestionLoading}
      />

      <EditItemDialog
        open={editDialog.open}
        onClose={() => setEditDialog({ open: false, item: null, type: 'avatar' })}
        onSave={confirmEdit}
        itemType={editDialog.type}
        formData={editFormData}
        onChange={handleEditFormChange}
        loading={editLoading}
      />

      <DeleteConfirmationDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, item: null, type: 'avatar' })}
        onConfirm={confirmDelete}
        onForceDelete={handleForceDelete}
        itemName={deleteDialog.item?.name || ''}
        itemType={deleteDialog.type}
        loading={deleteLoading}
        constraintError={deleteDialog.constraintError}
      />

      {/* Preview Modal */}
      <CustomModal
        open={previewModal.open}
        onClose={() => setPreviewModal({ open: false, item: null, type: 'avatar' })}
        title={`Preview: ${previewModal.item?.name || 'Store Item'}`}
        maxWidth="md"
      >
        <Box sx={{ p: 3 }}>
          {previewModal.item && (
            <>
              {(previewModal.type === 'avatar' || previewModal.type === 'microphone') && previewModal.item.imageUrl && (
                <Box sx={{ mb: 3, textAlign: 'center' }}>
                  <img
                    src={previewModal.item.imageUrl}
                    alt={previewModal.item.name}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '400px',
                      objectFit: 'contain',
                      borderRadius: '8px',
                      boxShadow: theme.shadows[4],
                    }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                  <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                    {previewModal.item.imageUrl}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleCopyImageUrl(previewModal.item.imageUrl)}
                    sx={{ mt: 1 }}
                  >
                    <FontAwesomeIcon icon={faCopy} style={{ marginRight: '8px' }} />
                    Copy Image URL
                  </Button>
                </Box>
              )}

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Item Details
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Name:</strong> {previewModal.item.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Description:</strong> {previewModal.item.description || 'No description'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Type:</strong> {previewModal.type}
                  </Typography>
                  {previewModal.item.price !== undefined && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Price:</strong> {previewModal.item.isFree ? 'Free' : formatPrice(previewModal.item.price)}
                    </Typography>
                  )}
                  {previewModal.item.rarity && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Rarity:</strong> {previewModal.item.rarity}
                    </Typography>
                  )}
                </Grid>

                <Grid item xs={12} md={6}>
                  {previewModal.type === 'coinPackage' && (
                    <>
                      <Typography variant="h6" gutterBottom>
                        Package Details
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Coin Amount:</strong> {previewModal.item.coinAmount}
                      </Typography>
                      {previewModal.item.bonusCoins > 0 && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          <strong>Bonus Coins:</strong> {previewModal.item.bonusCoins}
                        </Typography>
                      )}
                      {previewModal.item.maxRedemptions && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          <strong>Max Redemptions:</strong> {previewModal.item.maxRedemptions}
                        </Typography>
                      )}
                      {previewModal.item.expiryDate && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          <strong>Expires:</strong> {new Date(previewModal.item.expiryDate).toLocaleDateString()}
                        </Typography>
                      )}
                    </>
                  )}

                  {(previewModal.type === 'avatar' || previewModal.type === 'microphone') && (
                    <>
                      <Typography variant="h6" gutterBottom>
                        Item Properties
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Available:</strong> {previewModal.item.isAvailable ? 'Yes' : 'No'}
                      </Typography>
                      {previewModal.item.imageUrl && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          <strong>Image URL:</strong>
                          <br />
                          <code style={{ 
                            fontSize: '0.75rem', 
                            background: theme.palette.action.hover,
                            padding: '4px 8px',
                            borderRadius: '4px',
                            wordBreak: 'break-all'
                          }}>
                            {previewModal.item.imageUrl}
                          </code>
                        </Typography>
                      )}
                    </>
                  )}
                </Grid>
              </Grid>
            </>
          )}
        </Box>
      </CustomModal>
    </Box>
  );
});

export default StoreManagement;
