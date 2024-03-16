import React, { useCallback, useEffect, useState } from "react";
import { useRepository } from "@sensenet/hooks-react";
import { addComponent } from '../utils/add-component';
import ShowDebugInfo from "../utils/show-debuginfo"
import Moment from 'moment';
import { useSnStore } from "../store/sn-store";
  
export function NestedLeisureMangaTranslationItem(props) {
  const repo = useRepository();
  let { context, itemCollection } = props.data;
  const {page, layout} = useSnStore((state) => state);
  const widget = props.widget;
  console.log('%cNestedLeisureMangaTranslationItem',  "font-size:16px;color:green", {props: props});
  
  return (
    <div className="w3-row-padding w3-margin-bottom w3-left w3-block">
      <div className="w3-col">
        <div className="w3-card w3-round w3-white">
        {ShowDebugInfo("leisure manga translation news item", context, page, widget, layout)}
          <div className="w3-container w3-padding">
            <div className="w3-padding-16 w3-clear">
                {/* <Link key={`news-item-${context.Id}`} to={'/' + relativePath} className="no-score"> */}
                <a key={`news-item-${context.Id}`} href={context.Url} target="_blank" rel="noreferrer" className="no-score">
                    <div className="w3-left w3-padding news-meta">
                      <div className="w3-large"><i className="fa fa-download fa-fw related-link-icon"></i>{context.DisplayName}</div>
                      <div className="small" dangerouslySetInnerHTML={{ __html: context.Lead }}></div>
                      <div dangerouslySetInnerHTML={{ __html: context.Description }}/>
                      <div className="small hidden">{context.Author}</div>
                      <div>{Moment(context.PublishDate).format('yyyy.MM.DD')}</div>
                    </div>
                </a>
                {/* </Link> */}
              </div>
                <div className="w3-clear w3-margin-bottom">{(itemCollection?.length>0)?"Kapcsolódó bejegyzések":""}</div>
                {itemCollection?.map((child) => 
                    addComponent('widgets', 'nested','review-list-item', `${context.Id}-${child.Id}`, child, layout, child)
                  )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default NestedLeisureMangaTranslationItem
