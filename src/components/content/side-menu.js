import React, { useCallback, useEffect, useState } from 'react';
import { useRepository } from '@sensenet/hooks-react';
import { addComponent } from '../utils/add-component';
import { Link } from "react-router-dom";

export function MenuSide(props) {
  const repo = useRepository();
  const [widgetCollection, setCollection] = useState([]);

  console.log('contentview side');
  console.log(props.data);
  const currentPage = props.page?props.page.filter(pcnt => pcnt.Type === 'PageContainer')[0]:{};
  let context = props.data;
  console.log(props.widget.ContextBinding);
  if (props.widget.ContextBinding[0] === 'customroot' ) {
    if (props.widget.CustomRoot !== undefined) {
      context = props.widget.CustomRoot
    } else {
      console.log('customroot is not set');
    }
  }

  const loadContents = useCallback(async () => {
    const result = await repo.loadCollection({
      path: `${context.Path}`,
      oDataOptions: {
        orderby: ['Index', 'DisplayName'],
        select: 'all',
      },
    });
    if (result?.d?.results) {
      console.log(result);
      setCollection(result.d.results);
    } else {
    }
  }, [context, repo]);

  useEffect(() => {
    loadContents();
  }, [context, loadContents, repo]);

  return (
    <div className="w3-card w3-round w3-white w3-margin-bottom">
      <div className="w3-container">
      <h4 className="w3-center">Side menu</h4>
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