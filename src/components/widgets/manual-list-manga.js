import React from 'react';
import { addComponent } from '../utils/add-component';
import ShowDebugInfo from "../utils/show-debuginfo"
import BindedContext from "../utils/context-binding"
import { useSnStore } from "../store/sn-store";
import { useListSorting } from '../utils/use-list-sorting';

export function MangaListWidget(props) {
  // Deep comparison debug
  const {context, page, layout} = useSnStore((state) => state);
  const widget = props.widget;
  
  // Use the reusable sorting hook
  const { sortedBindedContext, SortingControls } = useListSorting(widget, props, BindedContext);

  return (
    // <div className="w3-col m9 w3-right">
      <div className="w3-row-padding w3-margin-bottom">
        <div className="w3-col m12">
          <div className="w3-card w3-round w3-white">
            <ShowDebugInfo title="gallery widget" context={context} currentPage={page} widget={widget} />
            <div className="w3-container w3-padding">
              <div className="w3-row w3-margin-bottom" style={{position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <h1 style={{margin: 0}}>{sortedBindedContext.content?.DisplayName}</h1>
                <div style={{position: 'absolute', right: 0}}>
                  <SortingControls />
                </div>
              </div>
              <div className="review-cards">
                {sortedBindedContext.children?.map((child) => { 
                  return addComponent('widgets', 'nested','list-manga-item', `${widget.Id}-${context.Id}-${child.Id}`, child, layout, child); 
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    // </div>
  );
}

export default MangaListWidget;
