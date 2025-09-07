import React, { useRef, useEffect, useState, useMemo } from 'react';
import { addComponent } from '../utils/add-component';
import ShowDebugInfo from "../utils/show-debuginfo"
import BindedContext from "../utils/context-binding"
import { useSnStore } from "../store/sn-store";

// Todo: rename manual-list-review to be consistent
export function ReviewListWidget(props) {
  console.log('%cReviewList', 'font-size:16px;color:green', { props: props });
  // const layout = props.page;
  // let context = props.data;
  const {context, page, layout} = useSnStore((state) => state);
  const widget = props.widget;
  
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
    let sortDirective = '';
    switch(sortBy) {
      case 'PublishDate':
        sortDirective = sortOrder === 'asc' ? '.SORT:PublishDate' : '.REVERSESORT:PublishDate';
        break;
      case 'ArticlePublishDate':
        sortDirective = sortOrder === 'asc' ? '.SORT:ArticlePublishDate' : '.REVERSESORT:ArticlePublishDate';
        break;
      case 'BookPublishDate':
        sortDirective = sortOrder === 'asc' ? '.SORT:BookPublishDate' : '.REVERSESORT:BookPublishDate';
        break;
      case 'Title':
        sortDirective = sortOrder === 'asc' ? '.SORT:DisplayName' : '.REVERSESORT:DisplayName';
        break;
      default:
        sortDirective = '.REVERSESORT:PublishDate'; // Default fallback
    }
    
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
  const bindedContext = BindedContext(bindedContextProps, true);

  // Deep comparison debug
  const prevRef = useRef({ props: null, context: null, page: null, layout: null });
  useEffect(() => {
    const prev = prevRef.current;
    const deepChanged =
      JSON.stringify(prev.props) !== JSON.stringify(props) ||
      JSON.stringify(prev.context) !== JSON.stringify(context) ||
      JSON.stringify(prev.page) !== JSON.stringify(page) ||
      JSON.stringify(prev.layout) !== JSON.stringify(layout);
    if (deepChanged) {
      console.log('%c[ReviewListWidget] Deep change detected', 'color:blue;font-weight:bold', {
        prevProps: prev.props, currProps: props,
        prevContext: prev.context, currContext: context,
        prevPage: prev.page, currPage: page,
        prevLayout: prev.layout, currLayout: layout
      });
    } else {
      console.log('%c[ReviewListWidget] No deep change', 'color:blue', {
        prevProps: prev.props, currProps: props,
        prevContext: prev.context, currContext: context,
        prevPage: prev.page, currPage: page,
        prevLayout: prev.layout, currLayout: layout
      });
    }
    prevRef.current = { props, context, page, layout };
  });
  
  // Sorting options
  const sortOptions = [
    { value: 'PublishDate', label: 'Publication Date', defaultOrder: 'desc' },
    { value: 'ArticlePublishDate', label: 'Article Date', defaultOrder: 'desc' },
    { value: 'BookPublishDate', label: 'Book Date', defaultOrder: 'desc' },
    { value: 'Title', label: 'Title', defaultOrder: 'asc' }
  ];
  
  const handleSortChange = (newSortBy) => {
    const option = sortOptions.find(opt => opt.value === newSortBy);
    setSortBy(newSortBy);
    setSortOrder(option?.defaultOrder || 'desc');
  };
  
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };
  
  return (
    // <div className="w3-col m9 w3-right">
      <div className="w3-row-padding w3-margin-bottom">
        <div className="w3-col m12">
          <div className="w3-card w3-round w3-white">
            {ShowDebugInfo("gallery widget", context, page, widget, layout)}
            <div className="w3-container w3-padding">
              <div className="w3-row w3-margin-bottom">
                <div className="w3-col m8">
                  <h1>{context.DisplayName}</h1>
                </div>
                <div className="w3-col m4 w3-right-align">
                  <div className="w3-margin-top">
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
              </div>
              <div className="review-cards">
                {bindedContext.children?.map((child) => { 
                  return addComponent('widgets', 'nested','review-list-item', `${widget.Id}-${context.Id}-${child.Id}`, child, layout, child); 
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    // </div>
  );
}

export default ReviewListWidget;
