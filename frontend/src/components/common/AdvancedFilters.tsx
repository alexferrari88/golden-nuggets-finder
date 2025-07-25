import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Search, Filter, X, RotateCcw } from 'lucide-react';

export interface FilterState {
  search: string;
  type: string;
  status: string;
  rating: string;
  dateRange: string;
  customDateFrom?: string;
  customDateTo?: string;
  processed: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface FilterConfig {
  showSearch?: boolean;
  showType?: boolean;
  showStatus?: boolean;
  showRating?: boolean;
  showDateRange?: boolean;
  showProcessed?: boolean;
  showSort?: boolean;
  types?: { value: string; label: string }[];
  statuses?: { value: string; label: string }[];
  sortOptions?: { value: string; label: string }[];
  customFields?: Array<{
    key: string;
    label: string;
    type: 'select' | 'input';
    options?: { value: string; label: string }[];
  }>;
}

interface AdvancedFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  config: FilterConfig;
  className?: string;
  collapsible?: boolean;
}

const defaultFilters: FilterState = {
  search: '',
  type: 'all',
  status: 'all',
  rating: 'all',
  dateRange: 'all',
  processed: 'all',
  sortBy: 'created_at',
  sortOrder: 'desc',
};

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  filters,
  onFiltersChange,
  config,
  className = '',
  collapsible = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleReset = () => {
    const resetFilters = { ...defaultFilters };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (localFilters.search) count++;
    if (localFilters.type !== 'all') count++;
    if (localFilters.status !== 'all') count++;
    if (localFilters.rating !== 'all') count++;
    if (localFilters.dateRange !== 'all') count++;
    if (localFilters.processed !== 'all') count++;
    return count;
  };

  const activeCount = getActiveFiltersCount();

  const FilterContent = () => (
    <div className="space-y-4">
      {/* Search */}
      {config.showSearch && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search content..."
              value={localFilters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Type Filter */}
        {config.showType && config.types && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <Select value={localFilters.type} onValueChange={(value) => handleFilterChange('type', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {config.types.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Status Filter */}
        {config.showStatus && config.statuses && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={localFilters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {config.statuses.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Rating Filter */}
        {config.showRating && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Rating</label>
            <Select value={localFilters.rating} onValueChange={(value) => handleFilterChange('rating', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
                <SelectItem value="unrated">No Rating</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Processed Filter */}
        {config.showProcessed && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Processed</label>
            <Select value={localFilters.processed} onValueChange={(value) => handleFilterChange('processed', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="processed">Processed</SelectItem>
                <SelectItem value="unprocessed">Unprocessed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Date Range */}
        {config.showDateRange && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Date Range</label>
            <Select value={localFilters.dateRange} onValueChange={(value) => handleFilterChange('dateRange', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Sort Options */}
        {config.showSort && config.sortOptions && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sort By</label>
              <Select value={localFilters.sortBy} onValueChange={(value) => handleFilterChange('sortBy', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {config.sortOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Order</label>
              <Select value={localFilters.sortOrder} onValueChange={(value) => handleFilterChange('sortOrder', value as 'asc' | 'desc')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Newest First</SelectItem>
                  <SelectItem value="asc">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Custom Fields */}
        {config.customFields?.map(field => (
          <div key={field.key} className="space-y-2">
            <label className="text-sm font-medium">{field.label}</label>
            {field.type === 'select' && field.options ? (
              <Select 
                value={localFilters[field.key as keyof FilterState] as string || 'all'} 
                onValueChange={(value) => handleFilterChange(field.key as keyof FilterState, value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {field.options.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder={`Enter ${field.label.toLowerCase()}...`}
                value={localFilters[field.key as keyof FilterState] as string || ''}
                onChange={(e) => handleFilterChange(field.key as keyof FilterState, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>

      {/* Custom Date Range Inputs */}
      {config.showDateRange && localFilters.dateRange === 'custom' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">From Date</label>
            <Input
              type="date"
              value={localFilters.customDateFrom || ''}
              onChange={(e) => handleFilterChange('customDateFrom', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">To Date</label>
            <Input
              type="date"
              value={localFilters.customDateTo || ''}
              onChange={(e) => handleFilterChange('customDateTo', e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {activeCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t">
          <span className="text-sm font-medium">Active Filters:</span>
          {localFilters.search && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Search: "{localFilters.search}"
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleFilterChange('search', '')}
              />
            </Badge>
          )}
          {localFilters.type !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Type: {localFilters.type}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleFilterChange('type', 'all')}
              />
            </Badge>
          )}
          {localFilters.status !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Status: {localFilters.status}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleFilterChange('status', 'all')}
              />
            </Badge>
          )}
          {localFilters.rating !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Rating: {localFilters.rating}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleFilterChange('rating', 'all')}
              />
            </Badge>
          )}
          {localFilters.dateRange !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Date: {localFilters.dateRange}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleFilterChange('dateRange', 'all')}
              />
            </Badge>
          )}
          {localFilters.processed !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Processed: {localFilters.processed}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleFilterChange('processed', 'all')}
              />
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-6 px-2"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset All
          </Button>
        </div>
      )}
    </div>
  );

  if (collapsible) {
    return (
      <Card className={className}>
        <CardHeader 
          className="cursor-pointer hover:bg-gray-50"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <CardTitle className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Advanced Filters
              {activeCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeCount}
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="sm">
              {isExpanded ? '−' : '+'}
            </Button>
          </CardTitle>
        </CardHeader>
        {isExpanded && (
          <CardContent>
            <FilterContent />
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Filter className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <Badge variant="secondary">
              {activeCount}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <FilterContent />
      </CardContent>
    </Card>
  );
};

export { defaultFilters };