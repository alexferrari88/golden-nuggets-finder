import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { apiClient } from '../../lib/api';
import type { FeedbackItem } from '../../types';

interface DeleteFeedbackDialogProps {
  item: FeedbackItem;
  children?: React.ReactNode;
}

export function DeleteFeedbackDialog({ item, children }: DeleteFeedbackDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.deleteFeedbackItem(item.id, item.type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-feedback'] });
      setOpen(false);
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete Feedback Item
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this feedback item? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-600 mb-1">
              {item.type.replace('_', ' ').toUpperCase()}
            </p>
            <p className="text-sm text-gray-800">
              "{truncateContent(item.content)}"
            </p>
            {item.rating && (
              <p className="text-xs text-gray-500 mt-1">
                Rating: {item.rating}
              </p>
            )}
            {item.usage_count > 0 && (
              <p className="text-xs text-gray-500">
                Used {item.usage_count} time{item.usage_count !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {deleteMutation.error && (
            <Alert variant="destructive">
              <AlertDescription>
                Failed to delete feedback item: {deleteMutation.error.message}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}