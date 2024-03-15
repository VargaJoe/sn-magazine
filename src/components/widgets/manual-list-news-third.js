import React from 'react';
import { addComponent } from '../utils/add-component';
import ShowDebugInfo from "../utils/show-debuginfo"
import BindedContext from "../utils/context-binding"
import { useSnStore } from "../store/sn-store";


export function ThirdSizedNewsList(props) {
  console.log('%cThirdSizedNewsList', "font-size:16px;color:green", { props: props });
  // const layout = props.page;
  // let context = props.data;
  const {context, page, layout} = useSnStore((state) => state);
  let widget = props.widget;
  const bindedContext = BindedContext(props, true);

  return (
    // <div className="w3-col m9 w3-right">
        <div className="w3-margin-bottom w3-col m4 news-padding">
          <div className="w3-card w3-round w3-white">
            {ShowDebugInfo("half size news widget", context, page, widget, layout)}
            <div className="w3-container w3-padding component-news-half">
            <h3>{bindedContext?.content?.DisplayName}</h3>
              <div>
                {bindedContext?.children?.map((child) => { 
                  return addComponent('widgets', 'nested',`list-news-item-${child.Type.toLowerCase()}`, `${widget.Id}-${context.Id}-${child.Id}`, child, props.page, child); 
                })}
              </div>
            </div>
          </div>
        </div>
    // </div>
  );
}

export default ThirdSizedNewsList
