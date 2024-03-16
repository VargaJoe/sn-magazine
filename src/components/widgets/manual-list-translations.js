import React, { useCallback, useEffect, useState } from "react";
import { addComponent } from '../utils/add-component';
import { useRepository } from "@sensenet/hooks-react";
import LazyLoad from 'react-lazyload';
import ShowDebugInfo from "../utils/show-debuginfo"
import BindedContext from "../utils/context-binding"
import { useSnStore } from "../store/sn-store";

export function TranslationListWidget(props) {
  //console.log('props', props);
  const repo = useRepository();
  const [itemCollection, setCollection] = useState([]);
  const {context, page, layout} = useSnStore((state) => state);
  const widget = props.widget;
  
  // binded context could be result back with all widget variables contet, children, widget, layout
  // binded context withChildren should be set on widget content, not manual boolean variable
  const bindedContext = BindedContext(props, true);
 
 const loadContents = useCallback(async () => {
    const ids = bindedContext.children.map(child => child.Id).join(' ');
    const result = await repo.loadCollection({
      path: `/Root/Content/mangajanlo/manga`,
      oDataOptions: {
        query: `Translation:(${ids})`,
        select: 'all',
        expand: 'Translation',
      },
    });
    if (result?.d?.results) {
      setCollection(result.d.results);
    }
  }, [bindedContext.children, repo]);

  useEffect(() => {
    if (bindedContext.children?.length > 0) {
      loadContents();
    }
  }, [bindedContext.children.count, bindedContext.children?.length, context, loadContents, repo]);


  return (
    <div className="w3-margin-bottom w3-col m12 news-padding">
      <div className="w3-card w3-round w3-white">
      {ShowDebugInfo("translations widget", context, page, widget, layout)}
        <div className="w3-container w3-padding component-news-half">
        <h3>{bindedContext?.content?.DisplayName}</h3>
          <div className="news-cards">
            {bindedContext.children?.map((child) => {
              let filteredItems = itemCollection.filter(item => 
                item.Translation.some(subItem => child.Id === subItem.Id)
              );
              return (
                <LazyLoad key={`news-list-${child?.Id}`} className="lazy-load-news-item">
                  {addComponent('widgets', 'nested', `list-translations-item`, `${widget?.Id}-${context?.Id}-${child?.Id}`, {context: child, itemCollection: filteredItems }, props?.page, child)}
                </LazyLoad>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TranslationListWidget
