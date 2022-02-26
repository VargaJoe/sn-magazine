import React, { useCallback, useEffect, useState } from 'react';
import { useRepository } from '@sensenet/hooks-react';
import { addComponent } from '../utils/add-component';
import LazyLoad from 'react-lazyload';
import ShowDebugInfo from "../utils/show-debuginfo"
import LeisureMangaTranslationItem from "./nested-list-news-item-leisuremangatranslation";

const DATA = require('../../config.json');

export function NewsListComponent(props) {
  const repo = useRepository();
  const [itemCollection, setCollection] = useState([]);
  
  console.log('gallery component');
  console.log(props);
  const layout = props.page;
  let context = props.data;
  let widget = props.widget;

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

  if (widget.RelativePath !== null && widget.RelativePath !== undefined) {
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
  }, [contextPath, widget, repo]);

  useEffect(() => {
    loadContents();
  }, [context, loadContents, repo]);

  return (
    // <div className="w3-col m12 w3-right">
        <div className="w3-margin-bottom w3-col m12 news-padding">
          <div className="w3-card w3-round w3-white">
          {ShowDebugInfo("news widget", context, layout, widget)}
            <div className="w3-container w3-padding component-news-half">
            <h3>{context.DisplayName}</h3>
              <div>
                {itemCollection.map((child) => { 
                  return (
                      <LazyLoad className="lazy-load-news-item">
                        {addComponent('widgets', 'nested', `list-news-item-${child.Type.toLowerCase()}`, `${widget.Id}-${context.Id}-${child.Id}`, child, props.page, child)}
                      </LazyLoad>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
    // </div>
  );
}

export default NewsListComponent
