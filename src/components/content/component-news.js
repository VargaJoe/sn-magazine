import React, { useCallback, useEffect, useState } from 'react';
import { useRepository } from '@sensenet/hooks-react';
import { addComponent } from '../utils/add-component';
import { Component } from 'react/cjs/react.production.min';
import { useLocation } from "react-router-dom";

const DATA = require('../../config.json');

export function CustomNewsView(props) {
  const repo = useRepository();
  const [widgetCollection, setCollection] = useState([]);
  const [showDebug, setDebug] = useState(false); 
  const { search } = useLocation();
  
  console.log('gallery component');
  console.log(props);
  const currentPage = props.page?props.page.filter(pcnt => pcnt.Type === 'Page' || pcnt.Type === 'Layout')[0]:{};
  let context = props.data;
  let widget = props.widget;

  const handleToggle = () => {
    setDebug(!showDebug);
  };

  function useQuery() {
    const { search } = useLocation();
  
    return React.useMemo(() => new URLSearchParams(search), [search]);
  }
  let query = useQuery();

  // refactor: debugview to separate Component, add variables through parameters
  function DebugView (isDebug) { 
    if (!isDebug || isDebug !== 'true')
      return;

    return (
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
  )  }

  // ======================================== START OF CONTEXT BINDING ========================================
  console.log(widget.ContextBinding);
  let contextPath = context.Path;
  switch(widget.ContextBinding[0]) {
    case "customroot":
      if (widget.CustomRoot !== undefined) {
        context = widget.CustomRoot
        contextPath = context.Path;
      } else {
        console.log('customroot is not set');
      }
      break;
    case "currentsite":
      contextPath = process.env.REACT_APP_DATA_PATH || DATA.dataPath;
      break;
    default:
      // code block
  }  

  if (widget.RelativePath !== "") {
    contextPath += widget.RelativePath
  }
  // ======================================== START OF CONTEXT BINDING ========================================


  const loadContents = useCallback(async () => {
    const result = await repo.loadCollection({
      path: `${contextPath}`,
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
    // <div className="w3-col m12 w3-right">
        <div className="w3-margin-bottom w3-col m12 news-padding">
          <div className="w3-card w3-round w3-white">
          {DebugView(query.get("debug"))}
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

export default CustomNewsView
