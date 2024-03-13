import React from 'react';
import { addComponent } from '../utils/add-component';
import ShowDebugInfo from "../utils/show-debuginfo"
import BindedContext from "../utils/context-binding"
import { useSnStore } from "../store/sn-store";

export function ContentCollectionWidget(props) {
  console.log('%cContentCollection', 'font-size:16px;color:green', { props: props });
  // const layout = props.page;
  // let context = props.data;
  const {context, layout} = useSnStore((state) => state);
  const widget = props.widget;
  const bindedContext = BindedContext(props, true);
  console.log('widget', widget)
  const widgetTitle = (bindedContext.widget !== null && bindedContext.widget?.Title !== undefined && bindedContext.widget?.Title !== '') ? bindedContext.widget?.Title : bindedContext.content.DisplayName
  
  let counter = 0;
  return (
    // <div className="w3-col m9 w3-right">
      <div className="w3-row-padding w3-margin-bottom">
        <div className="w3-col m12">
          <div className="w3-card w3-round w3-white">
            {ShowDebugInfo("content collection widget", context, layout, widget)}
            <div className="w3-container w3-padding">
            <h2>{widgetTitle}</h2>
              <div className="context-info">
                {bindedContext.content.Description}  
                <div>
                  {bindedContext.children?.map((child) => { 
                    return addComponent('content', 'auto', child.Type.toLowerCase(), `${counter++}-${context.Id}-${child.Id}`, child, props.page, child); 
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
        {}
      </div>
    // </div>
  );
}

export default ContentCollectionWidget
