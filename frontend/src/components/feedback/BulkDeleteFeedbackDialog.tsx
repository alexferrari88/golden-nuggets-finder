import { useMutation, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, CheckSquare, Trash2 } from "lucide-react"
import { useState } from "react"
import { apiClient } from "../../lib/api"
import type { FeedbackItem } from "../../types"
import { Alert, AlertDescription } from "../ui/alert"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog"

interface BulkDeleteFeedbackDialogProps {
  items: FeedbackItem[]
  children?: React.ReactNode
  onSuccess?: () => void
}

export function BulkDeleteFeedbackDialog({
  items,
  children,
  onSuccess,
}: BulkDeleteFeedbackDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiClient.bulkDeleteFeedbackItems(
        items.map((item) => ({
          id: item.id,
          feedbackType: item.type as "nugget" | "missing_content",
        })),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-feedback"] })
      setOpen(false)
      onSuccess?.()
    },
  })

  const handleDelete = () => {
    deleteMutation.mutate()
  }

  const getTypeCount = (type: "nugget" | "missing_content") => {
    return items.filter((item) => item.type === type).length
  }

  const nuggetCount = getTypeCount("nugget")
  const missingContentCount = getTypeCount("missing_content")

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="destructive" size="sm">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Selected ({items.length})
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete {items.length} Feedback Items
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete these feedback items? This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="mb-2 flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-gray-700 text-sm">
                {items.length} items selected
              </span>
            </div>

            <div className="space-y-2">
              {nuggetCount > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="default">{nuggetCount}</Badge>
                  <span className="text-gray-600 text-sm">Golden Nuggets</span>
                </div>
              )}
              {missingContentCount > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{missingContentCount}</Badge>
                  <span className="text-gray-600 text-sm">Missing Content</span>
                </div>
              )}
            </div>

            <div className="mt-3 text-gray-500 text-xs">
              Total usage count:{" "}
              {items.reduce((sum, item) => sum + item.usage_count, 0)} times
            </div>
          </div>

          {deleteMutation.error && (
            <Alert variant="destructive">
              <AlertDescription>
                Failed to delete feedback items: {deleteMutation.error.message}
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
              {deleteMutation.isPending
                ? "Deleting..."
                : `Delete ${items.length} Items`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
