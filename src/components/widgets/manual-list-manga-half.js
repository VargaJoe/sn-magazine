import React from 'react';
import { addComponent } from '../utils/add-component';
import ShowDebugInfo from "../utils/show-debuginfo"
import BindedContext from "../utils/context-binding"
import { useSnStore } from "../store/sn-store";

export function HalfSizedMangaList(props) {
  console.log('%chalfSizedMangaList', "font-size:16px;color:green");
    
  console.log('gallery component');
  // console.log(props);
  // const layout = props.page;
  // let context = props.data;
  const {context, layout} = useSnStore((state) => state);
  let widget = props.widget;
  const bindedContext = BindedContext(props, true);

  return (
    // <div className="w3-col m9 w3-right">
        <div className="w3-margin-bottom w3-col m6 news-padding">
          <div className="w3-card w3-round w3-white">
            {ShowDebugInfo("half size news widget", context, layout, widget)}
            <div className="w3-container w3-padding component-news-half">
            <h3>{bindedContext?.content?.DisplayName}</h3>
              <div className="news-cards">
                {bindedContext.children?.map((child) => { 
                  return addComponent('widgets', 'nested',`list-news-item-${child.Type.toLowerCase()}`, `${widget.Id}-${context.Id}-${child.Id}`, child, props.page, child); 
                })}
              </div>
            </div>
          </div>
        </div>
    // </div>
  );
}

export default HalfSizedMangaList
