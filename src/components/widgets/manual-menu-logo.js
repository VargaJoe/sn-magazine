import React, { useCallback, useEffect, useState } from 'react';
import { useRepository } from '@sensenet/hooks-react';
// import { addComponent } from '../utils/add-component';
import { Link } from "react-router-dom";
import ShowDebugInfo from "../utils/show-debuginfo"

const DATA = require('../../config.json');
const defaultImage = require('../../images/logo.png');

export function MenuWithLogo(props) {
  const repo = useRepository();
  const [itemCollection, setCollection] = useState([]);

  console.log('contentview sidemenu');
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
        query: widget.ContentQuery,
        orderby: ['Index', 'DisplayName'],
        select: 'all',
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

  function iconItem (item) { 
    if (item.Type === "LeisureCategory") {
      return (
        <Link key={`sidemenu-link-${item.Id}`} to={'/' + item.Name} className="side-menu-link" title={'index: '+item.Index}>
          <i className={`fa ${item.IconName} fa-fw w3-margin-right w3-text-theme`}></i>
        </Link>
      )
    } else if (item.Url !== "") {
        return (
          <a key={`sidemenu-icon-${item.Id}`} href={item.Url} target="_blank" rel="noreferrer" className="no-score">
            <i className={`fa ${item.IconName} fa-fw w3-margin-right w3-text-theme`}></i>
          </a>
        )
    }    
  };

  // if (itemCollection?.length === 0) {
  //   return (<div>loading</div>)
  // }

  return (
    <div className="w3-card w3-round w3-white w3-margin-bottom">
      {ShowDebugInfo("side menu with logo", context, layout, widget)}
      <div className="w3-container">
      <h4 className="w3-center hidden">{widget.DisplayName}</h4>
      <Link to={'/'}>
        <img src={logoUrl} alt="site title" className="w3-center logo-image" />
      </Link> 
      {/* <p className="w3-center"><img src="/w3images/avatar3.png" className="w3-circle w3-circle-side-avatar" alt="Avatar" /></p> */}
      <hr className="no-margin"/>
      <div className="side-menu-uppercase">
        {console.log('itemCollection', itemCollection)}
        {itemCollection?.filter(item => item.DisplayZone?.includes("menuitem")).map((child) => {
          console.log(child.Name);
          return (
          <p key={`sidemenu-${child.Id}`}>
            {/* <i className="fa fa-pencil fa-fw w3-margin-right w3-text-theme"></i>  */}
            <Link key={`sidemenu-link-${child.Id}`} to={'/' + child.Name} className="side-menu-link" title={'index: '+child.Index}>
              {child.DisplayName}
            </Link>
          </p>
        )}
        )}
      </div>
      <hr className="no-margin"/>
        <p>
          {itemCollection?.filter(item => item.DisplayZone?.includes("menuicon")).map((child) => {
            return iconItem(child);
          })}
        </p>
      </div>
    </div>
  );
}

export default MenuWithLogo;