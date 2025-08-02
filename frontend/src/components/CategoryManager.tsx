import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Box,
  Typography,
  Chip,
  Grid,
  InputAdornment,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Circle as CircleIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  createCategory,
  updateCategory,
  deleteCategory,
  Category,
} from '../store/slices/categorySlice';

interface CategoryManagerProps {
  open: boolean;
  onClose: () => void;
  type?: 'income' | 'expense';
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ open, onClose, type }) => {
  const dispatch = useAppDispatch();
  const { categories } = useAppSelector((state) => state.categories);
  
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: type || 'expense',
    color: '#2196F3',
    icon: '',
    parent_id: '',
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredCategories = type
    ? categories.filter((cat) => cat.type === type)
    : categories;

  const rootCategories = filteredCategories.filter((cat) => !cat.parent_id);

  const handleAddCategory = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      type: type || 'expense',
      color: '#2196F3',
      icon: '',
      parent_id: '',
    });
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      type: category.type,
      color: category.color,
      icon: category.icon || '',
      parent_id: category.parent_id || '',
    });
  };

  const handleSaveCategory = async () => {
    try {
      if (editingCategory) {
        await dispatch(
          updateCategory({
            id: editingCategory.id,
            data: {
              name: formData.name,
              color: formData.color,
              icon: formData.icon || undefined,
              parent_id: formData.parent_id || undefined,
            },
          })
        ).unwrap();
      } else {
        await dispatch(createCategory(formData)).unwrap();
      }
      handleAddCategory(); // Reset form
    } catch (error) {
      console.error('Failed to save category:', error);
    }
  };

  const handleDeleteCategory = async () => {
    if (deleteConfirmId) {
      try {
        await dispatch(deleteCategory(deleteConfirmId)).unwrap();
        setDeleteConfirmId(null);
      } catch (error) {
        console.error('Failed to delete category:', error);
      }
    }
  };

  const renderCategoryItem = (category: Category, level: number = 0) => {
    const subcategories = categories.filter((cat) => cat.parent_id === category.id);
    
    return (
      <React.Fragment key={category.id}>
        <ListItem sx={{ pl: level * 4 }}>
          <CircleIcon sx={{ color: category.color, mr: 2 }} />
          <ListItemText
            primary={category.name}
            secondary={subcategories.length > 0 ? `${subcategories.length} subcategories` : null}
          />
          <ListItemSecondaryAction>
            <IconButton edge="end" onClick={() => handleEditCategory(category)}>
              <EditIcon />
            </IconButton>
            <IconButton edge="end" onClick={() => setDeleteConfirmId(category.id)}>
              <DeleteIcon />
            </IconButton>
          </ListItemSecondaryAction>
        </ListItem>
        {subcategories.map((subcat) => renderCategoryItem(subcat, level + 1))}
      </React.Fragment>
    );
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Manage {type ? `${type.charAt(0).toUpperCase() + type.slice(1)} ` : ''}Categories
            </Typography>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              size="small"
              onClick={handleAddCategory}
            >
              Add Category
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <Typography variant="subtitle2" gutterBottom>
                Categories
              </Typography>
              <List>
                {rootCategories.length === 0 ? (
                  <ListItem>
                    <ListItemText
                      primary="No categories yet"
                      secondary="Click 'Add Category' to create your first category"
                    />
                  </ListItem>
                ) : (
                  rootCategories.map((category) => renderCategoryItem(category))
                )}
              </List>
            </Grid>
            <Grid item xs={12} md={5}>
              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {editingCategory ? 'Edit Category' : 'New Category'}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <TextField
                    fullWidth
                    label="Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    sx={{ mb: 2 }}
                  />
                  {!type && (
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Type</InputLabel>
                      <Select
                        value={formData.type}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            type: e.target.value as 'income' | 'expense',
                          })
                        }
                        label="Type"
                      >
                        <MenuItem value="income">Income</MenuItem>
                        <MenuItem value="expense">Expense</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                  <TextField
                    fullWidth
                    label="Color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    sx={{ mb: 2 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CircleIcon sx={{ color: formData.color }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Parent Category (Optional)</InputLabel>
                    <Select
                      value={formData.parent_id}
                      onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                      label="Parent Category (Optional)"
                    >
                      <MenuItem value="">None</MenuItem>
                      {filteredCategories
                        .filter((cat) => cat.id !== editingCategory?.id)
                        .map((category) => (
                          <MenuItem key={category.id} value={category.id}>
                            {category.name}
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                  <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={handleSaveCategory}
                      disabled={!formData.name}
                    >
                      {editingCategory ? 'Update' : 'Create'}
                    </Button>
                    {editingCategory && (
                      <Button variant="outlined" onClick={handleAddCategory}>
                        Cancel
                      </Button>
                    )}
                  </Box>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this category? Transactions using this category will
            have their category removed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
          <Button onClick={handleDeleteCategory} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CategoryManager;