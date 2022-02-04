import React, { useCallback, useEffect, useState } from 'react';
import { useRepository } from '@sensenet/hooks-react';
import { addComponent } from '../utils/add-component';
import { Component } from 'react/cjs/react.production.min';

export function CustomGalleryView(props) {
  const repo = useRepository();
  const [widgetCollection, setCollection] = useState([]);
  const [showDebug, setDebug] = useState(false);

  console.log('gallery component');
  console.log(props);
  const currentPage = props.page?props.page.filter(pcnt => pcnt.Type === 'Page')[0]:{};
  let context = props.data;
  let widget = props.widget;

  const handleToggle = () => {
    setDebug(!showDebug);
  };

  // refactor: debugview to separate Component, add variables through parameters
  const DebugView = (
    <div className="context-info debug-info">
      <div className='debug-info-button'>
        <button title='show' onClick={handleToggle}>show</button>
      </div>
      <div className={`debug-info-details w3-left  ${showDebug ? "" : "hidden"}`}>
        <ul>        
          <li>Content Name: <span>{context.Name}</span></li>
          <li>Content Type: <span>{context.Type}</span></li>
          <li>Content Path: <span>{context.Path}</span></li>
          <li>Content Lifespan: <span>{context.EnableLifespan?"true":"false"}</span></li>
          <li>Content ValidFrom: <span>{context.ValidFrom}</span></li>
          <li>Content ValidTill: <span>{context.ValidTill}</span></li>
          <li><br/></li>
          <li>Page Name: <span>{currentPage?.Name}</span></li>
          <li>Page Type: <span>{currentPage?.Type}</span></li>
          <li>Page Path: <span>{currentPage?.Path}</span></li>
          <li><br/></li>
          <li>Widget Name: <span>{widget.Name}</span></li>
          <li>Widget Type: <span>{widget.Type}</span></li>
          <li>Widget Path: <span>{widget.Path}</span></li>
          <li>Widget Context: <span>{widget.ContextBinding}</span></li>
          <li>Widget Custom Root: <span>{widget.CustomRoot?.Path}</span></li>
        </ul>
      </div>
    </div>
  )  


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
      <div className="w3-row-padding w3-margin-bottom">
        <div className="w3-col m12">
          <div className="w3-card w3-round w3-white">
          {DebugView}
            <div className="w3-container w3-padding">
            <h1>{props.data.DisplayName}</h1>
              <div>
                {widgetCollection.map((child) => { 
                  return addComponent('content', 'component','gallery-item', `${widget.Id}-${context.Id}-${child.Id}`, child, props.page, child); 
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    // </div>
  );
}

export default CustomGalleryView
