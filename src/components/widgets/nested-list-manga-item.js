import { Link } from "react-router-dom";
import Moment from 'moment';
import ShowDebugInfo from "../utils/show-debuginfo"
import LazyImage from "../utils/lazyload-image";
import { useSnStore } from "../store/sn-store";
import React, { useRef, useEffect } from 'react';

export function NestedMangaItem(props) {
  console.log('%cNestedMangaItem', "font-size:16px;color:green", { props: props });
  const context = props.data;
  const {page, layout} = useSnStore((state) => state);
  const widget = props.widget;

  const relativePath = context.Path.substr((process.env.REACT_APP_DATA_PATH).length + 1);

  const translationIcon = () => {
    if (context.Translation.length > 0) {
      return <i className="fa fa-language fa-fw translation-"></i>;
    } 
  }

  // Deep comparison debug
  const prevRef = useRef({ props: null, page: null, layout: null });
  useEffect(() => {
    const prev = prevRef.current;
    const deepChanged =
      JSON.stringify(prev.props) !== JSON.stringify(props) ||
      JSON.stringify(prev.page) !== JSON.stringify(page) ||
      JSON.stringify(prev.layout) !== JSON.stringify(layout);
    if (deepChanged) {
      console.log('%c[NestedMangaItem] Deep change detected', 'color:teal;font-weight:bold', {
        prevProps: prev.props, currProps: props,
        prevPage: prev.page, currPage: page,
        prevLayout: prev.layout, currLayout: layout
      });
    } else {
      console.log('%c[NestedMangaItem] No deep change', 'color:teal', {
        prevProps: prev.props, currProps: props,
        prevPage: prev.page, currPage: page,
        prevLayout: prev.layout, currLayout: layout
      });
    }
    prevRef.current = { props, page, layout };
  }, [props, page, layout]);

  return (
    // <div className="w3-col m9">
      <div className="w3-row-padding w3-margin-bottom w3-left gallery-item">
        <div className="w3-col">
          <div className="w3-card w3-round w3-white">
            <ShowDebugInfo title="gallery item" context={context} currentPage={page} widget={widget} />
            <div className="w3-container w3-padding">
              <div className="context-info">
                  <Link key={`gallery-item-${context.Id}`} to={'/' + relativePath} className="side-menu-link">
                      <LazyImage src={process.env.REACT_APP_API_URL + context.Image.Url} alt={context.DisplayName} className="w3-hover-opacity w3-col"/>
                    <div className="w3-white list-box-title">
                        <p>
                          <b>{translationIcon()}{context.DisplayName}</b>
                        </p>
                        <p className="hidden"></p>
                        <div className="small hidden">{context.Author}</div>
                        <div className="small hidden">{Moment(context.PublishDate).format('yyyy.MM.DD')}</div>
                    </div>
                  </Link>
                </div>
            </div>
          </div>
        </div>
      </div>
    // </div>
  );
}

export default NestedMangaItem
