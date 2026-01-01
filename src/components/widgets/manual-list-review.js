import React from 'react';
import { addComponent } from '../utils/add-component';
import ShowDebugInfo from "../utils/show-debuginfo"
import { useSnStore } from "../store/sn-store";
import { useListSorting } from '../utils/use-list-sorting';
import deepEqual from '../utils/deep-equal';

// Todo: rename manual-list-review to be consistent
const ReviewListWidget = React.memo((props) => {
  console.log('%cReviewList', 'font-size:16px;color:green', { props: props });
  // const layout = props.page;
  // let context = props.data;
  const {context, page, layout} = useSnStore((state) => state);
  const widget = props.widget;
  
  // Use the reusable sorting hook
  const { sortedBindedContext, SortingControls } = useListSorting(widget, props);

  if (sortedBindedContext.loading) {
    return null; // Don't render until data is loaded
  }

  return (
    // <div className="w3-col m9 w3-right">
      <div className="w3-row-padding w3-margin-bottom">
        <div className="w3-col m12">
          <div className="w3-card w3-round w3-white">
            <ShowDebugInfo title="gallery widget" context={context} currentPage={page} widget={widget} />
            <div className="w3-container w3-padding">
              <div className="w3-row w3-margin-bottom" style={{position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <h1 style={{margin: 0}}>{context.DisplayName}</h1>
                <div style={{position: 'absolute', right: 0}}>
                  <SortingControls />
                </div>
              </div>
              <div className="review-cards">
                {sortedBindedContext.children?.map((child) => { 
                  return addComponent('widgets', 'nested','review-list-item', `${widget.Id}-${context.Id}-${child.Id}`, child, layout, child); 
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    // </div>
  );
}, deepEqual);

export default ReviewListWidget;
