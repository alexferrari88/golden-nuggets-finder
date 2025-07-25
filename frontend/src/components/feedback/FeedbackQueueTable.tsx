import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  ChevronDown, 
  ChevronRight, 
  MessageSquare, 
  AlertTriangle, 
  ThumbsUp, 
  ThumbsDown, 
  Clock,
  RefreshCw,
  Edit3,
  Trash2,
  CheckSquare,
  Square
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import { Alert, AlertDescription } from '../ui/alert';
import { AdvancedFilters, defaultFilters } from '../common/AdvancedFilters';
import type { FilterState } from '../common/AdvancedFilters';
import { EditFeedbackDialog } from './EditFeedbackDialog';
import { DeleteFeedbackDialog } from './DeleteFeedbackDialog';
import { BulkDeleteFeedbackDialog } from './BulkDeleteFeedbackDialog';
import api from '../../lib/api';
import type { PendingFeedback, FeedbackItem, ApiError } from '../../types';

interface FeedbackQueueTableProps {
  refreshInterval?: number;
  pageSize?: number;
}

export function FeedbackQueueTable({ 
  refreshInterval = 10000, 
  pageSize = 20 
}: FeedbackQueueTableProps) {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [expandedContent, setExpandedContent] = useState<Set<string>>(new Set());

  const {
    data: feedbackData,
    error,
    isLoading,
    isError,
    refetch,
  } = useQuery<PendingFeedback, ApiError>({
    queryKey: ['pending-feedback', filters, page],
    queryFn: () => {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: (page * pageSize).toString(),
      });
      
      if (filters.type !== 'all') {
        params.append('feedback_type', filters.type);
      }
      if (filters.processed !== 'all') {
        params.append('processed', filters.processed === 'processed' ? 'true' : 'false');
      }
      if (filters.search) {
        params.append('search', filters.search);
      }
      if (filters.rating !== 'all') {
        params.append('rating', filters.rating);
      }
      if (filters.dateRange !== 'all') {
        params.append('date_range', filters.dateRange);
      }
      if (filters.sortBy) {
        params.append('sort_by', filters.sortBy);
      }
      if (filters.sortOrder) {
        params.append('sort_order', filters.sortOrder);
      }
      
      return api.get(`/feedback/pending?${params}`).then(res => res.data);
    },
    refetchInterval: refreshInterval,
    staleTime: 5000,
  });

  const filteredItems = useMemo(() => {
    if (!feedbackData?.items) return [];
    return feedbackData.items;
  }, [feedbackData]);

  const toggleRowExpansion = useCallback((id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const toggleItemSelection = useCallback((id: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const toggleContentExpansion = useCallback((id: string) => {
    setExpandedContent(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.id)));
    }
  }, [selectedItems.size, filteredItems]);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  // Clean up selection when items are deleted
  useEffect(() => {
    if (selectedItems.size > 0) {
      const currentItemIds = new Set(filteredItems.map(item => item.id));
      const validSelectedItems = new Set(
        Array.from(selectedItems).filter(id => currentItemIds.has(id))
      );
      
      if (validSelectedItems.size !== selectedItems.size) {
        setSelectedItems(validSelectedItems);
      }
    }
  }, [filteredItems, selectedItems]);

  const selectedItemsData = useMemo(() => {
    return filteredItems.filter(item => selectedItems.has(item.id));
  }, [filteredItems, selectedItems]);

  const isAllSelected = selectedItems.size > 0 && selectedItems.size === filteredItems.length;
  const isPartiallySelected = selectedItems.size > 0 && selectedItems.size < filteredItems.length;

  const getTypeIcon = (type: FeedbackItem['type']) => {
    switch (type) {
      case 'nugget':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'missing_content':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRatingIcon = (rating?: FeedbackItem['rating']) => {
    switch (rating) {
      case 'positive':
        return <ThumbsUp className="h-3 w-3 text-green-500" />;
      case 'negative':
        return <ThumbsDown className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes}m ago`;
    }
  };

  const truncateContent = (content: string, maxLength: number = 120) => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  };

  const getDisplayType = (item: FeedbackItem) => {
    if (item.type === 'nugget') {
      // Show corrected_type if available, otherwise original_type, fallback to 'nugget'
      return item.corrected_type || item.original_type || 'nugget';
    }
    // For missing content, show suggested_type if available, otherwise 'missing content'
    return item.suggested_type || item.type.replace('_', ' ');
  };

  const getTruncatedContent = (content: string, maxLength: number = 300) => {
    const isTruncated = content.length > maxLength;
    const truncatedContent = isTruncated ? content.substring(0, maxLength) : content;
    
    return {
      content: truncatedContent,
      isTruncated,
      fullContent: content
    };
  };

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Feedback Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load feedback queue: {error?.message}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const filterConfig = {
    showSearch: true,
    showType: true,
    showStatus: false,
    showRating: true,
    showDateRange: true,
    showProcessed: true,
    showSort: true,
    types: [
      { value: 'nugget', label: 'Golden Nuggets' },
      { value: 'missing_content', label: 'Missing Content' },
    ],
    sortOptions: [
      { value: 'created_at', label: 'Created Date' },
      { value: 'usage_count', label: 'Usage Count' },
      { value: 'rating', label: 'Rating' },
    ],
  };

  return (
    <div className="space-y-4">
      <AdvancedFilters
        filters={filters}
        onFiltersChange={setFilters}
        config={filterConfig}
        collapsible={true}
      />
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Feedback Queue
              {feedbackData && (
                <Badge variant="secondary">
                  {feedbackData.total_count} items
                </Badge>
              )}
              {selectedItems.size > 0 && (
                <Badge variant="outline">
                  {selectedItems.size} selected
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {selectedItems.size > 0 && (
                <>
                  <BulkDeleteFeedbackDialog 
                    items={selectedItemsData}
                    onSuccess={clearSelection}
                  >
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete {selectedItems.size}
                    </Button>
                  </BulkDeleteFeedbackDialog>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={clearSelection}
                  >
                    Clear Selection
                  </Button>
                </>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
      <CardContent>
        {isLoading && !feedbackData ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No feedback data available</p>
            <p className="text-sm mt-2">Start using the Golden Nuggets extension to generate feedback data that will appear here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center justify-center w-full h-full cursor-pointer"
                      disabled={filteredItems.length === 0}
                    >
                      {isAllSelected ? (
                        <CheckSquare className="h-4 w-4 text-blue-600" />
                      ) : isPartiallySelected ? (
                        <CheckSquare className="h-4 w-4 text-blue-400" fill="currentColor" fillOpacity={0.5} />
                      ) : (
                        <Square className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <React.Fragment key={item.id}>
                    <TableRow 
                      className={`hover:bg-gray-50 cursor-pointer ${selectedItems.has(item.id) ? 'bg-blue-50' : ''}`}
                      onClick={() => toggleRowExpansion(item.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleItemSelection(item.id)}
                          className="flex items-center justify-center w-full h-full cursor-pointer"
                        >
                          {selectedItems.has(item.id) ? (
                            <CheckSquare className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Square className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRowExpansion(item.id);
                        }}
                      >
                        {expandedRows.has(item.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(item.type)}
                          <span className="text-sm font-medium capitalize">
                            {getDisplayType(item)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="text-sm text-gray-600 truncate">
                          {truncateContent(item.content)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getRatingIcon(item.rating)}
                          {item.rating && (
                            <span className="text-xs capitalize text-gray-500">
                              {item.rating}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.usage_count > 0 ? 'default' : 'secondary'}>
                          {item.usage_count}x
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Clock className="h-3 w-3" />
                          {formatDate(item.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.processed ? 'default' : 'secondary'}>
                          {item.processed ? 'Processed' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <EditFeedbackDialog item={item}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-pointer">
                              <Edit3 className="h-3 w-3" />
                            </Button>
                          </EditFeedbackDialog>
                          <DeleteFeedbackDialog item={item}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 cursor-pointer">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </DeleteFeedbackDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded content row */}
                    {expandedRows.has(item.id) && (
                      <TableRow>
                        <TableCell colSpan={9}>
                          <div className="py-4 px-4 bg-gray-50 rounded-lg">
                            <h4 className="font-medium mb-2">Full Content:</h4>
                            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                              {(() => {
                                const contentInfo = getTruncatedContent(item.content);
                                const isContentExpanded = expandedContent.has(item.id);
                                
                                if (contentInfo.isTruncated) {
                                  return (
                                    <>
                                      <span>
                                        {isContentExpanded ? contentInfo.fullContent : contentInfo.content + '…'}
                                      </span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleContentExpansion(item.id);
                                        }}
                                        className="ml-2 text-blue-600 hover:text-blue-800 underline text-xs font-medium transition-colors cursor-pointer"
                                      >
                                        {isContentExpanded ? 'Show less' : 'Show more'}
                                      </button>
                                    </>
                                  );
                                } else {
                                  return <span>{contentInfo.fullContent}</span>;
                                }
                              })()}
                            </div>
                            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                              <span>ID: {item.id}</span>
                              <span>Created: {new Date(item.created_at).toLocaleString()}</span>
                              {item.usage_count > 0 && (
                                <span>Used {item.usage_count} time{item.usage_count !== 1 ? 's' : ''}</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {feedbackData && feedbackData.total_count > pageSize && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-gray-500">
                  Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, feedbackData.total_count)} of {feedbackData.total_count} items
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!feedbackData.has_more}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        </CardContent>
      </Card>
    </div>
  );
}