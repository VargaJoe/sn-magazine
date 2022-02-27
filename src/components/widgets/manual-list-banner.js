import React, { useCallback, useEffect, useState } from 'react';
import { useRepository } from '@sensenet/hooks-react';
// import { addComponent } from '../utils/add-component';
import { Link } from "react-router-dom";
import ShowDebugInfo from "../utils/show-debuginfo"

const DATA = require('../../config.json');
const defaultImage = require('../../images/logo.png');

export function BannerListWidget(props) {
  const repo = useRepository();
  const [itemCollection, setCollection] = useState([]);

  console.log('banner list widget');
  console.log(props);
  const layout = props.page;
  let context = props.data;
  let widget = props.widget;
  
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
    contextPath += widget.RelativePath;
  } 
  console.log('context path:', contextPath);

  let logoPath = process.env.REACT_APP_LOGO_PATH || DATA.siteLogo;
  let apiUrl = process.env.REACT_APP_API_URL || DATA.apiUrl;
  let dataPath = process.env.REACT_APP_DATA_PATH || DATA.dataPath;
  let logoUrl = apiUrl + dataPath + logoPath;
		if (logoPath === undefined || logoUrl === apiUrl) {
			logoUrl = defaultImage;
		}

  const loadContents = useCallback(async () => {
    const result = await repo.loadCollection({
      path: `${contextPath}`,
      oDataOptions: {
        query: widget.ContentQuery + ` +InFolder:'${contextPath}'`,
        select: 'all',
        metadata: 'no' 
      },
    });
    if (result?.d?.results) {
      console.log(result);
      setCollection(result.d.results);
    } else {
    }
  }, [contextPath, widget.ContentQuery, repo]);

  useEffect(() => {
    loadContents();
  }, [context, loadContents, repo]);

  // if (itemCollection?.length === 0) {
  //   return (<div>loading</div>)
  // }

  return (
    <div className="w3-card w3-round w3-white w3-margin-bottom">
      {ShowDebugInfo("side menu with logo", context, layout, widget)}
      <div className="w3-container">
        <div className="side-menu-uppercase">
          {console.log('itemCollection', itemCollection)}
          {itemCollection?.map((child) => {
            console.log(child.Name);
            return (
            <p key={`banner-${child.Id}`}>
              {/* <i className="fa fa-pencil fa-fw w3-margin-right w3-text-theme"></i>  */}
              <a key={`banner-link-${child.Id}`} href={child.Url} target="_blank" className="side-menu-link" title={'index: '+child.Index}>
              <img src={(process.env.REACT_APP_API_URL || DATA.apiUrl) + child.Binary.__mediaresource.media_src} alt={child.DisplayName} className="banner-image"/>
              </a>
            </p>
          )}
          )}
        </div>
      </div>
    </div>
  );
}

export default BannerListWidget;