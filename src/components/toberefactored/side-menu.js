import React, { useCallback, useEffect, useState } from 'react';
import { useRepository } from '@sensenet/hooks-react';
import { Link } from "react-router-dom";

export function MenuSide(props) {
  const repo = useRepository();
  const [widgetCollection, setCollection] = useState([]);

  console.log('contentview sidemenu');
  console.log(props);
  let context = props.data;
  let widget = props.widget;
  console.log(widget.ContextBinding);
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
        orderby: ['Index', 'DisplayName'],
        select: 'all',
      },
    });
    if (result?.d?.results) {
      console.log(result);
      setCollection(result.d.results);
    } else {
    }
  }, [context, widget, repo]);

  useEffect(() => {
    loadContents();
  }, [context, loadContents, repo]);

  return (
    <div className="w3-card w3-round w3-white w3-margin-bottom">
      <div className="w3-container">
      <h4 className="w3-center">{widget.DisplayName}</h4>
      {/* <p className="w3-center"><img src="/w3images/avatar3.png" className="w3-circle w3-circle-side-avatar" alt="Avatar" /></p> */}
      <hr/>
      <div className="side-menu-uppercase">
        {widgetCollection?.map((child) => {
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
      {/* <p><i className="fa fa-home fa-fw w3-margin-right w3-text-theme"></i> London, UK</p>
      <p><i className="fa fa-birthday-cake fa-fw w3-margin-right w3-text-theme"></i> April 1, 1988</p> */}
      </div>
    </div>
  );
}

export default MenuSide;