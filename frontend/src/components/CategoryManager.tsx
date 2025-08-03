import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Edit as EditIcon,
  Trash2 as DeleteIcon,
  Plus as AddIcon,
  Circle as CircleIcon,
} from 'lucide-react';
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
    parent_id: 'none',
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
      parent_id: 'none',
    });
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      type: category.type,
      color: category.color,
      icon: category.icon || '',
      parent_id: category.parent_id || 'none',
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
              parent_id: formData.parent_id === 'none' ? undefined : formData.parent_id,
            },
          })
        ).unwrap();
      } else {
        await dispatch(createCategory({
          ...formData,
          parent_id: formData.parent_id === 'none' ? undefined : formData.parent_id,
        })).unwrap();
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
        <div className={`flex items-center justify-between p-3 hover:bg-muted/50 rounded-md ${level > 0 ? 'ml-' + (level * 4) : ''}`}>
          <div className="flex items-center gap-3">
            <CircleIcon className="h-4 w-4" style={{ color: category.color }} />
            <div>
              <p className="font-medium">{category.name}</p>
              {subcategories.length > 0 && (
                <p className="text-sm text-muted-foreground">{subcategories.length} subcategories</p>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleEditCategory(category)}
              className="h-8 w-8 p-0"
            >
              <EditIcon className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDeleteConfirmId(category.id)}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <DeleteIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {subcategories.map((subcat) => renderCategoryItem(subcat, level + 1))}
      </React.Fragment>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <DialogTitle>
                Manage {type ? `${type.charAt(0).toUpperCase() + type.slice(1)} ` : ''}Categories
              </DialogTitle>
              <Button onClick={handleAddCategory} className="gap-2">
                <AddIcon className="h-4 w-4" />
                Add Category
              </Button>
            </div>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-7 gap-6 py-4">
            <div className="md:col-span-4">
              <h3 className="font-medium mb-4">Categories</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {rootCategories.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <p className="font-medium">No categories yet</p>
                    <p className="text-sm">Click 'Add Category' to create your first category</p>
                  </div>
                ) : (
                  rootCategories.map((category) => renderCategoryItem(category))
                )}
              </div>
            </div>
            
            <div className="md:col-span-3">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-medium mb-4">
                  {editingCategory ? 'Edit Category' : 'New Category'}
                </h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="category-name">Name</Label>
                    <Input
                      id="category-name"
                      value={formData.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Category name"
                    />
                  </div>
                  
                  {!type && (
                    <div className="space-y-2">
                      <Label htmlFor="category-type">Type</Label>
                      <Select 
                        value={formData.type} 
                        onValueChange={(value: 'income' | 'expense') => setFormData({ ...formData, type: value })}
                      >
                        <SelectTrigger id="category-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="income">Income</SelectItem>
                          <SelectItem value="expense">Expense</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="category-color">Color</Label>
                    <div className="flex items-center gap-2">
                      <CircleIcon className="h-4 w-4" style={{ color: formData.color }} />
                      <Input
                        id="category-color"
                        type="color"
                        value={formData.color}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, color: e.target.value })}
                        className="w-20 h-10"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="parent-category">Parent Category (Optional)</Label>
                    <Select 
                      value={formData.parent_id} 
                      onValueChange={(value) => setFormData({ ...formData, parent_id: value === 'none' ? '' : value })}
                    >
                      <SelectTrigger id="parent-category">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {filteredCategories
                          .filter((cat) => cat.id !== editingCategory?.id)
                          .map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={handleSaveCategory}
                      disabled={!formData.name}
                      className="flex-1"
                    >
                      {editingCategory ? 'Update' : 'Create'}
                    </Button>
                    {editingCategory && (
                      <Button variant="outline" onClick={handleAddCategory}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(isOpen) => !isOpen && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          
          <p className="py-4">
            Are you sure you want to delete this category? Transactions using this category will
            have their category removed.
          </p>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteCategory}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CategoryManager;