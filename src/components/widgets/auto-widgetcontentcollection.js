import React, { useCallback, useEffect, useState } from 'react';
import { useRepository } from '@sensenet/hooks-react';
import { addComponent } from '../utils/add-component';
import ShowDebugInfo from "../utils/show-debuginfo"
import BindedContext from "../utils/context-binding"

export function ContentCollectionWidgetComponent(props) {
  const repo = useRepository();
  const [itemCollection, setCollection] = useState([]);

  const layout = props.page;
  let context = props.data;
  const widget = props.widget;
  const bindedContext = BindedContext(props, true);
  console.log('contentcollection component', props, layout, context, widget);

  // if (props.widget.ContextBinding[0] === 'customroot' ) {
  //   if (props.widget.CustomRoot !== undefined) {
  //     context = props.widget.CustomRoot
  //   } else {
  //     console.log('customroot is not set');
  //   }
  // }

  // const loadContents = useCallback(async () => {
  //   const result = await repo.loadCollection({
  //     path: `${context.Path}`,
  //     oDataOptions: {
  //       query: widget.ContentQuery,
  //       orderby: ['Index', 'DisplayName'],
  //       select: 'all',
  //     },
  //   });
  //   if (result?.d?.results) {
  //     console.log(result);
  //     setCollection(result.d.results);
  //     // const View = importView(result.d.Type.toLowerCase());
  //     // setCompo(<View key={result.d.Id} />);
  //   } else {
  //     // const View = importView('missing');
  //     // setCompo(<View key={'1'} />);
  //   }
  // }, [context.Path, repo, widget.ContentQuery]);

  // useEffect(() => {
  //   loadContents();
  // }, [context, loadContents, repo]);

  let counter = 0;
  return (
    // <div className="w3-col m9 w3-right">
      <div className="w3-row-padding w3-margin-bottom">
        <div className="w3-col m12">
          <div className="w3-card w3-round w3-white">
            {ShowDebugInfo("content collection widget", context, layout, widget)}
            <div className="w3-container w3-padding">
            <h2>{bindedContext.content.DisplayName} - {bindedContext.widget?.DisplayName}</h2>
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
      </div>
    // </div>
  );
}

export default ContentCollectionWidgetComponent
