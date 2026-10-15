import React, { useState, useMemo, useEffect } from 'react';
import useBindedContext from './context-binding';

// Static field mappings for sorting
const FIELD_MAPPINGS = {
  'PublishDate': 'PublishDate',
  'ArticlePublishDate': 'ArticlePublishDate',
  'BookPublishDate': 'BookPublishDate',
  'Title': 'DisplayName'
};

/**
 * Reusable sorting hook for list widgets
 * @param {Object} widget - The original widget object
 * @param {Object} props - The component props for BindedContext
 * @returns {Object} - Returns sortedBindedContext, sortOptions, sortBy, sortOrder, handleSortChange, toggleSortOrder, and SortingControls JSX
 */
export function useListSorting(widget, props) {
  // Sorting state
  const [sortBy, setSortBy] = useState('PublishDate');
  const [sortOrder, setSortOrder] = useState('desc');

  // Create modified widget with updated ContentQuery for sorting
  const sortedWidget = useMemo(() => {
    if (!widget) return widget;

    // Remove existing sort directives from ContentQuery
    let baseQuery = widget.ContentQuery || '';
    baseQuery = baseQuery.replace(/\.SORT:[^\s]+/g, '').replace(/\.REVERSESORT:[^\s]+/g, '').trim();

    // Add new sort directive
    const fieldName = FIELD_MAPPINGS[sortBy] || 'PublishDate';
    const sortDirective = sortOrder === 'asc' ? `.SORT:${fieldName}` : `.REVERSESORT:${fieldName}`;

    const updatedQuery = baseQuery ? `${baseQuery} ${sortDirective}` : sortDirective;

    return {
      ...widget,
      ContentQuery: updatedQuery
    };
  }, [widget, sortBy, sortOrder]);

  // Create bindedContext with sorted widget
  const bindedContextProps = {
    ...props,
    widget: sortedWidget
  };
  const sortedBindedContext = useBindedContext(bindedContextProps, true);

  // Dynamic sorting options based on available data
  const sortOptions = useMemo(() => {
    // Define all possible sort options with their field mappings and validation logic
    const possibleOptions = [
      {
        value: 'PublishDate',
        label: 'Publication Date',
        defaultOrder: 'desc',
        fieldName: 'PublishDate',
        validate: (value) => value && value !== '' && value !== '0001-01-01T00:00:00Z'
      },
      {
        value: 'ArticlePublishDate',
        label: 'Article Date',
        defaultOrder: 'desc',
        fieldName: 'ArticlePublishDate',
        validate: (value) => value && value !== '' && value !== '0001-01-01T00:00:00Z'
      },
      {
        value: 'BookPublishDate',
        label: 'Book Date',
        defaultOrder: 'desc',
        fieldName: 'BookPublishDate',
        validate: (value) => value && value !== '' && value !== '0001-01-01T00:00:00Z'
      },
      {
        value: 'Title',
        label: 'Title',
        defaultOrder: 'asc',
        fieldName: 'DisplayName',
        validate: (value) => value && value !== ''
      }
    ];

    // Filter options based on whether any items have meaningful values for that field
    return possibleOptions.filter(option => {
      if (!sortedBindedContext?.children) return false;

      return sortedBindedContext.children.some(child => {
        const fieldValue = child[option.fieldName];
        return option.validate(fieldValue);
      });
    });
  }, [sortedBindedContext]);

  // Fallback to PublishDate if current sort option becomes unavailable
  useEffect(() => {
    const currentOptionExists = sortOptions.some(option => option.value === sortBy);
    if (!currentOptionExists && sortOptions.length > 0) {
      const defaultOption = sortOptions.find(opt => opt.value === 'PublishDate') || sortOptions[0];
      setSortBy(defaultOption.value);
      setSortOrder(defaultOption.defaultOrder || 'desc');
    }
  }, [sortOptions, sortBy]);

  const handleSortChange = (newSortBy) => {
    const option = sortOptions.find(opt => opt.value === newSortBy);
    if (option) {
      setSortBy(newSortBy);
      setSortOrder(option.defaultOrder || 'desc');
    }
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  // Sorting UI component
  const SortingControls = () => (
    <div className="w3-right-align">
      <div style={{marginBottom: 0}}>
        <label className="w3-text-grey w3-small">Sort by: </label>
        <select
          value={sortBy}
          onChange={(e) => handleSortChange(e.target.value)}
          className="w3-select w3-border w3-small"
          style={{width: 'auto', display: 'inline-block', marginRight: '8px'}}
        >
          {sortOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          onClick={toggleSortOrder}
          className="w3-button w3-small w3-border"
          title={sortOrder === 'asc' ? 'Switch to Descending' : 'Switch to Ascending'}
        >
          {sortOrder === 'asc' ? '↑' : '↓'}
        </button>
      </div>
    </div>
  );  return {
    sortedBindedContext,
    sortOptions,
    sortBy,
    sortOrder,
    handleSortChange,
    toggleSortOrder,
    SortingControls
  };
}

export default useListSorting;