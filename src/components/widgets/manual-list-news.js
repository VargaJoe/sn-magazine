import React from 'react';
import { addComponent } from '../utils/add-component';
import LazyLoad from 'react-lazyload';
import ShowDebugInfo from "../utils/show-debuginfo"
import BindedContext from "../utils/context-binding"
import { useSnStore } from "../store/sn-store";

export function NewsListComponent(props) {
  console.log('%cnewsList', "font-size:16px;color:green");
  console.log('props', props);
  // const layout = props.page;
  // let context = props.data;
  const {context, layout} = useSnStore((state) => state);
  let widget = props.widget;
  
  // binded context could be result back with all widget variables contet, children, widget, layout
  // binded context withChildren should be set on widget content, not manual boolean variable
  const bindedContext = BindedContext(props, true);
 
  return (
    // <div className="w3-col m12 w3-right">
        <div className="w3-margin-bottom w3-col m12 news-padding">
          <div className="w3-card w3-round w3-white">
          {ShowDebugInfo("news widget", context, layout, widget)}
            <div className="w3-container w3-padding component-news-half">
            <h3>{bindedContext?.content?.DisplayName}</h3>
              <div className="news-cards">
                {bindedContext.children?.map((child) => {
                  return (
                    <LazyLoad key={`news-list-${child.Id}`} className="lazy-load-news-item">
                      {addComponent('widgets', 'nested', `list-news-item-${child.Type.toLowerCase()}`, `${widget.Id}-${context.Id}-${child.Id}`, child, props.page, child)}
                    </LazyLoad>
                  )
                })}
              </div>
            </div>
          </div>
          {}
        </div>
    // </div>
  );
}

export default NewsListComponent
