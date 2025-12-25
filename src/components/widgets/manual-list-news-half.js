import React from 'react';
import { addComponent } from '../utils/add-component';
import useBindedContext from "../utils/context-binding"
import ShowDebugInfo from "../utils/show-debuginfo";
import deepEqual from "../utils/deep-equal";

const HalfSizedNewsListWidget = React.memo((props) => {
  console.log('%cHalfSizedNewsList', "font-size:16px;color:green", { props: props });
  // const layout = props.page;
  // let context = props.data;
  const bindedContext = useBindedContext(props, true);

  if (bindedContext.loading) {
    return (
      <div className="w3-margin-bottom w3-col m6 news-padding">
        <div className="w3-card w3-round w3-white">
          <div className="w3-container w3-padding component-news-half">
            <h3>Loading news...</h3>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    {/* <div className="w3-col m9 w3-right"> */}
        <div className="w3-margin-bottom w3-col m6 news-padding">
          <div className="w3-card w3-round w3-white">
            <div className="w3-container w3-padding component-news-half">
            <h3>{bindedContext?.content?.DisplayName}</h3>
              <div className="news-cards">
                {bindedContext?.children?.map((child) => { 
                  // return addComponent('widgets', 'nested',`list-news-item-${child.Type.toLowerCase()}`, `${widget.Id}-${context.Id}-${child.Id}`, child, props.page, child); 
                  const itemType = `list-news-item`;
                  return addComponent('widgets', 'nested', itemType, `${props.widget.Id}-${child.Id}`, child, props.page, child); 
                })}
              </div>
            </div>
          </div>
        </div>
      <ShowDebugInfo title="HalfSizedNewsList" context={bindedContext.context} currentPage={props.page} widget={props.widget} />
    {/* </div> */}
    </>
  );
}, deepEqual);

export default HalfSizedNewsListWidget;