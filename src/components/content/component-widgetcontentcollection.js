import React, { useCallback, useEffect, useState } from 'react';
import { useRepository } from '@sensenet/hooks-react';
import { addComponent } from '../utils/add-component';

export function ContentCollectionComponent(props) {
  const repo = useRepository();
  const [widgetCollection, setCollection] = useState([]);

  console.log('contentcollection component');
  console.log(props);
  const layout = props.page;
  let context = props.data;
  let widget = props.widget;
  console.log(props.widget.Name + ' - ' + props.widget.ContextBinding);
  if (props.widget.ContextBinding[0] === 'customroot' ) {
    if (props.widget.CustomRoot !== undefined) {
      context = props.widget.CustomRoot
    } else {
      console.log('customroot is not set');
    }
  }

  const loadContents = useCallback(async () => {
    const result = await repo.loadCollection({
      path: `${context.Path}`,
      oDataOptions: {
        query: widget.ContentQuery,
        orderby: ['Index', 'DisplayName'],
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
  }, [context, repo]);

  useEffect(() => {
    loadContents();
  }, [context, loadContents, repo]);

  let counter = 0;
  return (
    // <div className="w3-col m9 w3-right">
      <div className="w3-row-padding w3-margin-bottom">
        <div className="w3-col m12">
          <div className="w3-card w3-round w3-white">
            <div className="w3-container w3-padding">
            <h1>{props.data.DisplayName} - {props.widget.DisplayName}</h1>
              <div className="context-info">
                  <ul>
                  <li>Component: <span>content collection widget</span></li>
                    <li>Content Name: <span>{context.Name}</span></li>
                    <li>Content Type: <span>{context.Type}</span></li>
                    <li>Content Path: <span>{context.Path}</span></li>
                    <li>Content Lifespan: <span>{context.EnableLifespan?"true":"false"}</span></li>
                    <li>Content ValidFrom: <span>{context.ValidFrom}</span></li>
                    <li>Content ValidTill: <span>{context.ValidTill}</span></li>
                    <li>Page Name: <span>{layout?.Name}</span></li>
                    <li>Page Type: <span>{layout?.Type}</span></li>
                    <li>Page Path: <span>{layout?.Path}</span></li>
                    <li>Widget Name: <span>{props.widget.Name}</span></li>
                    <li>Widget Type: <span>{props.widget.Type}</span></li>
                    <li>Widget Path: <span>{props.widget.Path}</span></li>
                    <li>Widget Context: <span>{props.widget.ContextBinding}</span></li>
                    <li>Widget Custom Root: <span>{props.widget.CustomRoot?.Path}</span></li>
                  </ul>
                  <div>
                    {widgetCollection.map((child) => { 
                      return addComponent('content', 'content', child.Type.toLowerCase(), `${counter++}-${context.Id}-${child.Id}`, child, props.page, child); 
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

export default ContentCollectionComponent
