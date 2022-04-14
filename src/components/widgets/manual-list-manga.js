import React from 'react';
import { addComponent } from '../utils/add-component';
import ShowDebugInfo from "../utils/show-debuginfo"
import BindedContext from "../utils/context-binding"

export function MangaList(props) {
  console.log('gallery component');
  console.log(props);
  const layout = props.page;
  let context = props.data;
  const widget = props.widget;
  const bindedContext = BindedContext(props, true);

  return (
    // <div className="w3-col m9 w3-right">
      <div className="w3-row-padding w3-margin-bottom">
        <div className="w3-col m12">
          <div className="w3-card w3-round w3-white">
            {ShowDebugInfo("gallery widget", context, layout, widget)}
            <div className="w3-container w3-padding">
            <h1>{bindedContext.content.DisplayName}</h1>
              <div>
                {bindedContext.children?.map((child) => { 
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

export default MangaList
