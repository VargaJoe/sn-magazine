import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { addComponent } from '../utils/add-component';
import { useRepository } from "@sensenet/hooks-react";
import LazyLoad from 'react-lazyload';
import ShowDebugInfo from "../utils/show-debuginfo"
import BindedContext from "../utils/context-binding"
import { useSnStore } from "../store/sn-store";
import Moment from 'moment';
import LazyImage from "../utils/lazyload-image";

export function ThirdSizedTranslationList(props) {
  console.log('%cThirdSizedTranslationList', "font-size:16px;color:green", { props: props });
  const repo = useRepository()
  const [itemCollection, setCollection] = useState([]);
  const {context, page, layout} = useSnStore((state) => state);
  let widget = props.widget;
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
      console.log('translation review collection', result.d.results);
      setCollection(result.d.results);
    }
  }, [bindedContext.children, repo]);

  function newsImage (item) { 
    console.log('newsImage', item);
    if (!item?.Image || item.Image?.Url === "") {
      return "";
    }

    return (
      <div className="news-image w3-left w3-padding">
        <LazyImage src={process.env.REACT_APP_API_URL + item.Image.Url} alt={item.DisplayName} className="w3-hover-opacity"/>
      </div>
    );   
  };

  useEffect(() => {
    if (bindedContext.children?.length > 0) {
      loadContents();
    }
  }, [bindedContext.children.count, bindedContext.children?.length, context, loadContents, repo]);

  return (
    // <div className="w3-col m9 w3-right">
        <div className="w3-margin-bottom w3-col m4 news-padding">
          <div className="w3-card w3-round w3-white">
            <ShowDebugInfo title="half size news widget" context={context} currentPage={page} widget={widget} />
            <div className="w3-container w3-padding component-news-half">
            <h3>{bindedContext?.content?.DisplayName}</h3>
              <div>
                {bindedContext?.children?.map((child) => {
                  const relatedContent = itemCollection[0]
                  const relatedPath = relatedContent?.Path.substr((process.env.REACT_APP_DATA_PATH).length + 1);
                  return (
                    <div key={`translation-item-${child.Id}`} className="w3-row-padding w3-margin-bottom w3-left w3-block m1 news-item">
                      <div className="w3-col">
                        <div className="w3-card w3-round w3-white">
                          <div className="w3-container w3-padding">
                            <div className="w3-padding-16">
                              <Link key={`news-item-${child.Id}`} to={'/' + relatedPath} className="no-score">
                                  {newsImage(relatedContent)}
                                  <div className="w3-left w3-padding news-meta">
                                    <div className="title w3-large">{child.DisplayName}</div>
                                    <div className="small" dangerouslySetInnerHTML={{ __html: child.Lead?child.Lead:child.Description }}></div>
                                    <div className="small hidden">{child.Author}</div>
                                    <div>{Moment(child.PublishDate).format('yyyy.MM.DD')}</div>
                                  </div>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}                
              </div>
            </div>
          </div>
        </div>
    // </div>
  );
}

export default ThirdSizedTranslationList
