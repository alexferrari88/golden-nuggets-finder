import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Download, FileText, Database, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import api from '../../lib/api';

export type ExportDataType = 'feedback' | 'optimization_runs' | 'cost_analysis' | 'dashboard_stats';
export type ExportFormat = 'csv' | 'json' | 'xlsx';

interface ExportOptions {
  dataType: ExportDataType;
  format: ExportFormat;
  dateRange: string;
  customDateFrom?: string;
  customDateTo?: string;
  includeProcessed: boolean;
  includeUnprocessed: boolean;
  maxRecords?: number;
}

interface ExportJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  dataType: ExportDataType;
  format: ExportFormat;
  recordCount?: number;
  fileSize?: string;
  downloadUrl?: string;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

interface DataExporterProps {
  trigger?: React.ReactNode;
  defaultDataType?: ExportDataType;
}

export const DataExporter: React.FC<DataExporterProps> = ({ 
  trigger, 
  defaultDataType = 'feedback' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    dataType: defaultDataType,
    format: 'csv',
    dateRange: 'last_30_days',
    includeProcessed: true,
    includeUnprocessed: true,
  });
  const [isExporting, setIsExporting] = useState(false);

  // Query for recent export jobs
  const { data: exportJobs, refetch: refetchJobs } = useQuery<ExportJob[]>({
    queryKey: ['export-jobs'],
    queryFn: () => api.get('/export/jobs').then(res => res.data),
    refetchInterval: 5000, // Poll every 5 seconds for job status updates
    enabled: isOpen,
  });

  const handleExport = async () => {
    if (isExporting) return;

    try {
      setIsExporting(true);
      
      const payload = {
        data_type: exportOptions.dataType,
        format: exportOptions.format,
        date_range: exportOptions.dateRange,
        custom_date_from: exportOptions.customDateFrom,
        custom_date_to: exportOptions.customDateTo,
        include_processed: exportOptions.includeProcessed,
        include_unprocessed: exportOptions.includeUnprocessed,
        max_records: exportOptions.maxRecords,
      };

      await api.post('/export/create', payload);
      
      // Refresh jobs list to show the new export
      refetchJobs();
      
      // Reset form for next export
      setExportOptions(prev => ({
        ...prev,
        dateRange: 'last_30_days',
        maxRecords: undefined,
      }));

    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownload = (job: ExportJob) => {
    if (job.downloadUrl) {
      const link = document.createElement('a');
      link.href = job.downloadUrl;
      link.download = `${job.dataType}_export_${job.id}.${job.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getDataTypeIcon = (dataType: ExportDataType) => {
    switch (dataType) {
      case 'feedback':
        return <FileText className="h-4 w-4" />;
      case 'optimization_runs':
        return <Database className="h-4 w-4" />;
      case 'cost_analysis':
        return <Download className="h-4 w-4" />;
      case 'dashboard_stats':
        return <Calendar className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: ExportJob['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };


  const defaultTrigger = (
    <Button variant="outline" className="flex items-center gap-2">
      <Download className="h-4 w-4" />
      Export Data
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Data</DialogTitle>
          <DialogDescription>
            Export your data in various formats for analysis or backup
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Export Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Export Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Data Type</label>
                <Select 
                  value={exportOptions.dataType} 
                  onValueChange={(value: ExportDataType) => 
                    setExportOptions(prev => ({ ...prev, dataType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feedback">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Feedback Items
                      </div>
                    </SelectItem>
                    <SelectItem value="optimization_runs">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Optimization Runs
                      </div>
                    </SelectItem>
                    <SelectItem value="cost_analysis">
                      <div className="flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        Cost Analysis
                      </div>
                    </SelectItem>
                    <SelectItem value="dashboard_stats">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Dashboard Statistics
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Format</label>
                <Select 
                  value={exportOptions.format} 
                  onValueChange={(value: ExportFormat) => 
                    setExportOptions(prev => ({ ...prev, format: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV (Comma Separated)</SelectItem>
                    <SelectItem value="json">JSON (JavaScript Object Notation)</SelectItem>
                    <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Date Range</label>
                <Select 
                  value={exportOptions.dateRange} 
                  onValueChange={(value) => 
                    setExportOptions(prev => ({ ...prev, dateRange: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last_7_days">Last 7 days</SelectItem>
                    <SelectItem value="last_30_days">Last 30 days</SelectItem>
                    <SelectItem value="last_90_days">Last 90 days</SelectItem>
                    <SelectItem value="last_year">Last year</SelectItem>
                    <SelectItem value="all_time">All time</SelectItem>
                    <SelectItem value="custom">Custom range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {exportOptions.dateRange === 'custom' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium mb-1 block">From</label>
                    <Input
                      type="date"
                      value={exportOptions.customDateFrom || ''}
                      onChange={(e) => setExportOptions(prev => ({ 
                        ...prev, 
                        customDateFrom: e.target.value 
                      }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">To</label>
                    <Input
                      type="date"
                      value={exportOptions.customDateTo || ''}
                      onChange={(e) => setExportOptions(prev => ({ 
                        ...prev, 
                        customDateTo: e.target.value 
                      }))}
                    />
                  </div>
                </div>
              )}

              {exportOptions.dataType === 'feedback' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Include Items</label>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={exportOptions.includeProcessed}
                        onChange={(e) => setExportOptions(prev => ({ 
                          ...prev, 
                          includeProcessed: e.target.checked 
                        }))}
                        className="rounded border-gray-300 cursor-pointer"
                      />
                      <span>Processed</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={exportOptions.includeUnprocessed}
                        onChange={(e) => setExportOptions(prev => ({ 
                          ...prev, 
                          includeUnprocessed: e.target.checked 
                        }))}
                        className="rounded border-gray-300 cursor-pointer"
                      />
                      <span>Unprocessed</span>
                    </label>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">Max Records (optional)</label>
                <Input
                  type="number"
                  placeholder="Leave empty for no limit"
                  value={exportOptions.maxRecords || ''}
                  onChange={(e) => setExportOptions(prev => ({ 
                    ...prev, 
                    maxRecords: e.target.value ? parseInt(e.target.value) : undefined 
                  }))}
                />
              </div>

              <Button 
                onClick={handleExport} 
                disabled={isExporting}
                className="w-full"
              >
                {isExporting ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Creating Export...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Create Export
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Export Jobs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Exports</CardTitle>
            </CardHeader>
            <CardContent>
              {exportJobs && exportJobs.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {exportJobs.map((job) => (
                    <div 
                      key={job.id} 
                      className="p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getDataTypeIcon(job.dataType)}
                          <span className="font-medium text-sm">
                            {job.dataType.replace('_', ' ').toUpperCase()}
                          </span>
                          <Badge variant="outline">
                            {job.format.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(job.status)}
                          <Badge variant={
                            job.status === 'completed' ? 'default' :
                            job.status === 'failed' ? 'destructive' :
                            'secondary'
                          }>
                            {job.status}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-600 mb-2">
                        Created: {new Date(job.createdAt).toLocaleString()}
                        {job.completedAt && (
                          <span className="block">
                            Completed: {new Date(job.completedAt).toLocaleString()}
                          </span>
                        )}
                      </div>

                      {job.recordCount && (
                        <div className="text-xs text-gray-600 mb-2">
                          {job.recordCount.toLocaleString()} records
                          {job.fileSize && ` • ${job.fileSize}`}
                        </div>
                      )}

                      {job.error && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertDescription className="text-xs">
                            {job.error}
                          </AlertDescription>
                        </Alert>
                      )}

                      {job.status === 'completed' && job.downloadUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(job)}
                          className="w-full mt-2"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Download className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No exports yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};