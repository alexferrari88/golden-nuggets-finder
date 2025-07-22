import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Play, 
  Download, 
  RefreshCw, 
  Zap,
  FileDown,
  Database,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { DataExporter } from '../export/DataExporter';
import api from '../../lib/api';
import type { ApiError } from '../../types';

interface QuickActionsPanelProps {
  onActionComplete?: (action: string, success: boolean) => void;
}

export function QuickActionsPanel({ onActionComplete }: QuickActionsPanelProps) {
  const [confirmDialog, setConfirmDialog] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Optimization trigger mutation
  const optimizationMutation = useMutation({
    mutationFn: ({ force }: { force?: boolean } = {}) => 
      api.post('/optimization/trigger', { force }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recent-activity'] });
      queryClient.invalidateQueries({ queryKey: ['system-health'] });
      onActionComplete?.('optimization', true);
    },
    onError: () => {
      onActionComplete?.('optimization', false);
    },
  });

  const handleRefreshAll = () => {
    queryClient.invalidateQueries();
    onActionComplete?.('refresh', true);
  };

  const handleOptimization = (force: boolean = false) => {
    optimizationMutation.mutate({ force });
    setConfirmDialog(null);
  };

  const getActionStatus = (mutation: typeof optimizationMutation) => {
    if (mutation.isPending) return 'loading';
    if (mutation.isError) return 'error';
    if (mutation.isSuccess) return 'success';
    return 'idle';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primary Actions */}
        <div className="space-y-3">
          {/* Run Optimization */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="text-sm font-medium">Run Optimization</h4>
              <p className="text-xs text-gray-500">
                Process pending feedback and optimize prompts
              </p>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(getActionStatus(optimizationMutation))}
              <Dialog open={confirmDialog === 'optimize'} onOpenChange={(open) => !open && setConfirmDialog(null)}>
                <DialogTrigger asChild>
                  <Button 
                    size="sm" 
                    disabled={optimizationMutation.isPending}
                    onClick={() => setConfirmDialog('optimize')}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Run
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Optimization</DialogTitle>
                    <DialogDescription>
                      This will start a new optimization run using all pending feedback. 
                      The process may take several minutes to complete.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setConfirmDialog(null)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={() => handleOptimization(false)}>
                      Start Optimization
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Refresh Status */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="text-sm font-medium">Refresh All Data</h4>
              <p className="text-xs text-gray-500">
                Update all dashboard components
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefreshAll}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Export Section */}
        <div className="border-t pt-4">
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <FileDown className="h-4 w-4" />
              Data Export
            </h4>
            
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Export data with advanced options and job tracking
              </p>
              <DataExporter
                trigger={
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                }
              />
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {optimizationMutation.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to start optimization: {(optimizationMutation.error as unknown as ApiError)?.message}
            </AlertDescription>
          </Alert>
        )}

        {optimizationMutation.isSuccess && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Optimization started successfully! Check the Operations Monitor for progress.
            </AlertDescription>
          </Alert>
        )}

        {/* System Info */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <Database className="h-3 w-3" />
              <span>Backend: {import.meta.env.VITE_API_BASE_URL || 'http://localhost:7532'}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              Live
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}