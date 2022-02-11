import React, { useCallback, useEffect, useState } from 'react';
import { useRepository } from '@sensenet/hooks-react';
import { addComponent } from '../utils/add-component';
import ShowDebugInfo from "../utils/show-debuginfo"

export function CustomHalfSizeNewsView(props) {
  const repo = useRepository();
  const [widgetCollection, setCollection] = useState([]);
    
  console.log('gallery component');
  console.log(props);
  const layout = props.page;
  let context = props.data;
  let widget = props.widget;
 
  console.log(widget.Name + ' - ' + widget.ContextBinding);
  if (widget.ContextBinding[0] === 'customroot' ) {
    if (widget.CustomRoot !== undefined) {
      context = widget.CustomRoot
    } else {
      console.log('customroot is not set');
    }
  }

  const loadContents = useCallback(async () => {
    const result = await repo.loadCollection({
      path: `${context.Path}`,
      oDataOptions: {
        query: widget.ContentQuery,
        orderby: [['PublishDate', 'desc'], 'Index', 'DisplayName'],
        select: 'all',
      },
    });
    if (result?.d?.results) {
      console.log(result);
      setCollection(result.d.results);
      // const View = importView(result.d.Type.toLowerCase());
      // setCompo(<View key={result.d.Id} />);
    } else {
      // const View = importView('missing');
      // setCompo(<View key={'1'} />);
    }
  }, [context, widget, repo]);

  useEffect(() => {
    loadContents();
  }, [context, loadContents, repo]);

  return (
    // <div className="w3-col m9 w3-right">
        <div className="w3-margin-bottom w3-col m6 news-padding">
          <div className="w3-card w3-round w3-white">
            {ShowDebugInfo("half size news widget", context, layout, widget)}
            <div className="w3-container w3-padding component-news-half">
            <h3>{context.DisplayName}</h3>
              <div>
                {widgetCollection.map((child) => { 
                  return addComponent('content', 'component','news-item', `${widget.Id}-${context.Id}-${child.Id}`, child, props.page, child); 
                })}
              </div>
            </div>
          </div>
        </div>
    // </div>
  );
}

export default CustomHalfSizeNewsView
