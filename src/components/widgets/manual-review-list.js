import React, { useRef, useEffect } from 'react';
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
  const bindedContext = BindedContext(props, true);

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
  
  return (
    // <div className="w3-col m9 w3-right">
      <div className="w3-row-padding w3-margin-bottom">
        <div className="w3-col m12">
          <div className="w3-card w3-round w3-white">
            {ShowDebugInfo("gallery widget", context, page, widget, layout)}
            <div className="w3-container w3-padding">
            <h1>{context.DisplayName}</h1>
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
