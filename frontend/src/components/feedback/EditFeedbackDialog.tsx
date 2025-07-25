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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { apiClient } from '../../lib/api';
import type { FeedbackItem, NuggetType } from '../../types';

interface EditFeedbackDialogProps {
  item: FeedbackItem;
  children?: React.ReactNode;
}

// Available nugget types
const NUGGET_TYPES: { value: NuggetType; label: string }[] = [
  { value: 'tool', label: 'Tool' },
  { value: 'media', label: 'Media' },
  { value: 'explanation', label: 'Explanation' },
  { value: 'analogy', label: 'Analogy' },
  { value: 'model', label: 'Model' },
];

export function EditFeedbackDialog({ item, children }: EditFeedbackDialogProps) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(item.content);
  const [rating, setRating] = useState<'positive' | 'negative' | null>(item.rating || null);
  const [correctedType, setCorrectedType] = useState<NuggetType | null>(
    (item.corrected_type || null) as NuggetType | null
  );
  const [suggestedType, setSuggestedType] = useState<NuggetType | null>(
    (item.suggested_type || null) as NuggetType | null
  );
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (updates: { 
      content?: string; 
      rating?: 'positive' | 'negative' | null;
      corrected_type?: NuggetType | null;
      suggested_type?: NuggetType | null;
    }) =>
      apiClient.updateFeedbackItem(item.id, item.type, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-feedback'] });
      setOpen(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updates: {
      content?: string;
      rating?: 'positive' | 'negative' | null;
      corrected_type?: NuggetType | null;
      suggested_type?: NuggetType | null;
    } = {};

    if (content.trim() !== item.content) {
      updates.content = content.trim();
    }
    if (rating !== item.rating) {
      updates.rating = rating;
    }
    if (item.type === 'nugget' && correctedType !== (item.corrected_type || null)) {
      updates.corrected_type = correctedType;
    }
    if (item.type === 'missing_content' && suggestedType !== (item.suggested_type || null)) {
      updates.suggested_type = suggestedType;
    }

    updateMutation.mutate(updates);
  };

  const hasChanges = 
    content.trim() !== item.content || 
    rating !== item.rating ||
    (item.type === 'nugget' && correctedType !== (item.corrected_type || null)) ||
    (item.type === 'missing_content' && suggestedType !== (item.suggested_type || null));

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
            Update the content, rating, or type for this feedback item.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            {item.type === 'nugget' ? (
              <div className="space-y-2">
                <div className="text-sm text-gray-500">
                  Original: <Badge variant="outline">{item.original_type || 'nugget'}</Badge>
                </div>
                <Select
                  value={correctedType || 'none'}
                  onValueChange={(value) => setCorrectedType(value === 'none' ? null : value as NuggetType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select corrected type (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (use original)</SelectItem>
                    {NUGGET_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <Select
                value={suggestedType || 'none'}
                onValueChange={(value) => setSuggestedType(value === 'none' ? null : value as NuggetType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select suggested type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No type selected</SelectItem>
                  {NUGGET_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <ThumbsUp className="h-4 w-4" />
                  Positive
                </Button>
                <Button
                  type="button"
                  variant={rating === 'negative' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRating(rating === 'negative' ? null : 'negative')}
                  className="flex items-center gap-2 cursor-pointer"
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
                    className="flex items-center gap-2 cursor-pointer"
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
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!hasChanges || updateMutation.isPending || !content.trim()}
              className="cursor-pointer"
            >
              {updateMutation.isPending ? 'Updating...' : 'Update'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}