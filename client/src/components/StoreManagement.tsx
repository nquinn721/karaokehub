import {
  faCoins,
  faCrown,
  faEdit,
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
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
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
import { formatPrice } from '@utils/numberUtils';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';

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
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

interface AddItemDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  itemType: 'avatar' | 'microphone';
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
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ 
        background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}>
        <FontAwesomeIcon icon={faPlus} />
        Add New {itemType.charAt(0).toUpperCase() + itemType.slice(1)}
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Grid container spacing={3}>
          {/* File Upload Section */}
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
                  marginBottom: 16 
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
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={suggestionLoading ? <CircularProgress size={16} /> : <FontAwesomeIcon icon={faLightbulb} />}
                  onClick={onAiSuggestion}
                  disabled={suggestionLoading || !formData.rarity}
                  sx={{ fontSize: '0.75rem', py: 0.5 }}
                >
                  {suggestionLoading ? 'Thinking...' : 'AI Suggest'}
                </Button>
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
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Auto-generated Image URL"
              value={formData.imageUrl || ''}
              onChange={(e) => onChange('imageUrl', e.target.value)}
              variant="outlined"
              helperText="Auto-filled from selected file"
              disabled
            />
          </Grid>
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
                {(itemType === 'avatar' ? avatarTypeOptions : microphoneTypeOptions).map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Price (USD)"
              value={formData.price || 0}
              onChange={(e) => onChange('price', parseFloat(e.target.value) || 0)}
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
              label="Coin Price"
              value={formData.coinPrice || 0}
              onChange={(e) => onChange('coinPrice', parseInt(e.target.value) || 0)}
              variant="outlined"
              InputProps={{
                startAdornment: <InputAdornment position="start"><FontAwesomeIcon icon={faCoins} /></InputAdornment>,
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
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={onSave}
          variant="contained"
          disabled={loading || !formData.name || !selectedFile}
          startIcon={loading ? <CircularProgress size={16} /> : <FontAwesomeIcon icon={faPlus} />}
        >
          {loading ? 'Creating...' : 'Create Item'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface EditItemDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  itemType: 'avatar' | 'microphone';
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
  const theme = useTheme();

  const rarityOptions = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  const avatarTypeOptions = ['basic', 'premium', 'seasonal', 'special'];
  const microphoneTypeOptions = ['basic', 'vintage', 'modern', 'wireless', 'premium', 'golden'];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ 
        background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}>
        <FontAwesomeIcon icon={faEdit} />
        Edit {itemType.charAt(0).toUpperCase() + itemType.slice(1)}
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
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
                {(itemType === 'avatar' ? avatarTypeOptions : microphoneTypeOptions).map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Price (USD)"
              value={formData.price || 0}
              onChange={(e) => onChange('price', parseFloat(e.target.value) || 0)}
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
              label="Coin Price"
              value={formData.coinPrice || 0}
              onChange={(e) => onChange('coinPrice', parseInt(e.target.value) || 0)}
              variant="outlined"
              InputProps={{
                startAdornment: <InputAdornment position="start"><FontAwesomeIcon icon={faCoins} /></InputAdornment>,
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
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
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
      </DialogActions>
    </Dialog>
  );
};

interface DeleteConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemType: string;
  loading: boolean;
}

const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  open,
  onClose,
  onConfirm,
  itemName,
  itemType,
  loading,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ color: 'error.main' }}>
        <FontAwesomeIcon icon={faTrash} /> Delete {itemType}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to delete "{itemName}"? This action will:
        </DialogContentText>
        <Box sx={{ mt: 2 }}>
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
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          color="error"
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : <FontAwesomeIcon icon={faTrash} />}
        >
          {loading ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
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
  }>({
    open: false,
    item: null,
    type: 'avatar',
  });
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Edit dialog states
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    item: any;
    type: 'avatar' | 'microphone';
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
    type: 'avatar' | 'microphone';
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

  const handleEdit = (item: any, type: 'avatar' | 'microphone') => {
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

  const handleAdd = (type: 'avatar' | 'microphone') => {
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
    if (!addFormData.rarity) {
      adminStore.setTableError('Please select a rarity first');
      return;
    }

    setSuggestionLoading(true);
    try {
      const suggestions = await adminStore.suggestItemName(
        addDialog.type,
        addFormData.rarity,
        addFormData.description,
      );
      setAiSuggestions(suggestions);
      console.log('🤖 AI suggestions received:', suggestions);
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
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
    if (!addFormData.name || !selectedFile) {
      adminStore.setTableError('Please provide a name and select an image file');
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
          await adminStore.deleteStoreMicrophone(deleteDialog.item.id);
          break;
        case 'coinPackage':
          await adminStore.deleteStoreCoinPackage(deleteDialog.item.id);
          break;
      }

      console.log(`✅ Successfully deleted ${deleteDialog.type}: ${deleteDialog.item.name}`);
      setDeleteDialog({ open: false, item: null, type: 'avatar' });
    } catch (error: any) {
      console.error('Delete error in component:', error);
      // Error will be shown via adminStore.tableError
    } finally {
      setDeleteLoading(false);
    }
  };

  const renderAvatarCard = (avatar: any) => (
    <Grid item xs={12} sm={6} md={4} xl={3} key={avatar.id}>
      <Card
        elevation={0}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s ease',
          background: `linear-gradient(135deg, 
            ${theme.palette.background.paper} 0%, 
            ${theme.palette.background.default} 100%)`,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 3,
          overflow: 'hidden',
          minHeight: 350,
          '&:hover': {
            transform: 'translateY(-8px)',
            boxShadow: `0 12px 40px ${theme.palette.primary.main}25`,
            border: `1px solid ${theme.palette.primary.main}50`,
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
            backgroundColor: 'grey.50',
            p: 2,
          }}
        />
        <CardContent sx={{ flexGrow: 1, p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
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
        elevation={0}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s ease',
          background: `linear-gradient(135deg, 
            ${theme.palette.background.paper} 0%, 
            ${theme.palette.background.default} 100%)`,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 3,
          overflow: 'hidden',
          minHeight: 350,
          '&:hover': {
            transform: 'translateY(-8px)',
            boxShadow: `0 12px 40px ${theme.palette.primary.main}25`,
            border: `1px solid ${theme.palette.primary.main}50`,
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
            backgroundColor: 'grey.50',
            p: 2,
          }}
        />
        <CardContent sx={{ flexGrow: 1, p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
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
    <TableRow key={coinPackage.id}>
      <TableCell>{coinPackage.name}</TableCell>
      <TableCell>{coinPackage.description || 'No description'}</TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <FontAwesomeIcon
            icon={faCoins}
            style={{ marginRight: 8, color: theme.palette.warning.main }}
          />
          {coinPackage.coinAmount}
        </Box>
      </TableCell>
      <TableCell>{formatPrice(coinPackage.price)}</TableCell>
      <TableCell>
        <Chip
          size="small"
          label={coinPackage.isAvailable ? 'Available' : 'Unavailable'}
          color={coinPackage.isAvailable ? 'success' : 'error'}
        />
      </TableCell>
      <TableCell>
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
    <Box sx={{ width: '100%' }}>
      {adminStore.tableError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {adminStore.tableError}
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{
          width: '100%',
          mb: 2,
          background: `linear-gradient(135deg, 
            ${theme.palette.background.paper} 0%, 
            ${theme.palette.background.default} 100%)`,
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
            background: `linear-gradient(90deg, 
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
            <Grid container spacing={3}>
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
            <Grid container spacing={3}>
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
          <Box sx={{ mb: 2 }}>
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
          </Box>

          {adminStore.isLoadingTable ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                background: `linear-gradient(135deg, 
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
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {adminStore.storeItems.coinPackages?.items?.map(renderCoinPackageRow) || []}
                  {adminStore.storeItems.coinPackages?.items?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
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
        itemName={deleteDialog.item?.name || ''}
        itemType={deleteDialog.type}
        loading={deleteLoading}
      />
    </Box>
  );
});

export default StoreManagement;
