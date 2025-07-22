import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit3, ThumbsUp, ThumbsDown, X } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { apiClient } from '../../lib/api';
import type { FeedbackItem } from '../../types';

interface EditFeedbackDialogProps {
  item: FeedbackItem;
  children?: React.ReactNode;
}

export function EditFeedbackDialog({ item, children }: EditFeedbackDialogProps) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(item.content);
  const [rating, setRating] = useState<'positive' | 'negative' | null>(item.rating || null);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (updates: { content?: string; rating?: 'positive' | 'negative' | null }) =>
      apiClient.updateFeedbackItem(item.id, item.type, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-feedback'] });
      setOpen(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      content: content.trim() !== item.content ? content.trim() : undefined,
      rating: rating !== item.rating ? rating : undefined,
    });
  };

  const hasChanges = content.trim() !== item.content || rating !== item.rating;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm">
            <Edit3 className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Edit Feedback Item
          </DialogTitle>
          <DialogDescription>
            Update the content or rating for this feedback item.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <Badge variant="secondary" className="w-fit">
              {item.type.replace('_', ' ')}
            </Badge>
          </div>

          <div className="space-y-2">
            <label htmlFor="content" className="text-sm font-medium">
              Content
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full min-h-32 px-3 py-2 border border-gray-300 rounded-md resize-vertical focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter feedback content..."
            />
          </div>

          {item.type === 'nugget' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Rating</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={rating === 'positive' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRating(rating === 'positive' ? null : 'positive')}
                  className="flex items-center gap-2"
                >
                  <ThumbsUp className="h-4 w-4" />
                  Positive
                </Button>
                <Button
                  type="button"
                  variant={rating === 'negative' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRating(rating === 'negative' ? null : 'negative')}
                  className="flex items-center gap-2"
                >
                  <ThumbsDown className="h-4 w-4" />
                  Negative
                </Button>
                {rating && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setRating(null)}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          )}

          {updateMutation.error && (
            <Alert variant="destructive">
              <AlertDescription>
                Failed to update feedback item: {updateMutation.error.message}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!hasChanges || updateMutation.isPending || !content.trim()}
            >
              {updateMutation.isPending ? 'Updating...' : 'Update'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}