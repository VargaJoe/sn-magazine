import React from 'react';
import { addComponent } from '../utils/add-component';
import ShowDebugInfo from "../utils/show-debuginfo"
import BindedContext from "../utils/context-binding"
import { useSnStore } from "../store/sn-store";

// Todo: this component is flagged for deletion after next release

export function HalfSizedNewsWidget(props) {
  console.log('%cHalfSizedNews', 'font-size:16px;color:green', { props: props });
  // const layout = props.page;
  // const context = props.data;
  const {context, page, layout} = useSnStore((state) => state);
  const widget = props.widget;
  const bindedContext = BindedContext(props, true);

  return (
    // <div className="w3-col m9 w3-right">
        <div className="w3-margin-bottom w3-col m6 news-padding">
          <div className="w3-card w3-round w3-white">
            {ShowDebugInfo("half size news widget", context, page, widget, layout)}
            <div className="w3-container w3-padding component-news-half">
            <h3>{bindedContext.content.DisplayName}</h3>
              <div className="news-cards">
                {bindedContext.children?.map((child) => { 
                  return addComponent('widgets', 'nested','news-item', `${widget.Id}-${context.Id}-${child.Id}`, child, props.page, child); 
                })}
              </div>
            </div>
          </div>
        </div>
    // </div>
  );
}

export default HalfSizedNewsWidget;
