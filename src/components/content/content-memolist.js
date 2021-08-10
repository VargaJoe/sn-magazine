import React, { lazy, useCallback, useEffect, useState } from 'react';
import { useRepository } from '@sensenet/hooks-react';
import { useParams } from 'react-router-dom';
import { Link } from "react-router-dom";

const DATA = require('../../config.json');

const defaultComponent = 'folder';

const importView = component =>
  lazy(() =>
    import(`./content-${component}`).catch(() =>
      import(`./content-${defaultComponent}`)
    )
  );

const MemoListContent = (props) => {
  console.log('memolist component');
  console.log(props.data);
  const repo = useRepository();
  const [dynacompo, setCompo] = useState([]);
  // const { categoryName } = useParams();
  const contextPath = props.data.Path;
  const [articles, setArts] = useState([]);

  const currentPage = props.page?props.page.filter(pcnt => pcnt.Type === 'PageContainer')[0]:{};
  
  const loadContents = useCallback(async () => {
    const result = await repo.loadCollection({
      // path: `${DATA.dataPath}/${categoryName}`,
      path: `${contextPath}`,
      oDataOptions: {
        select: 'all',
      },
    });
    if (result?.d?.results) {
      console.log(result);
      setArts(result.d.results);
      // const View = importView(result.d.Type.toLowerCase());
      // setCompo(<View key={result.d.Id} />);
    } else {
      // const View = importView('missing');
      // setCompo(<View key={'1'} />);
    }
  }, [contextPath, repo]);

const loadCompo = (data) => {
   const View = importView(data.Type.toLowerCase());
   //setCompo(<View key={result.d.Id} />);
   return (<View key={data.Id} data={data}/>);
}

  useEffect(() => {
    loadContents();
  }, [contextPath, loadContents, repo]);
  return (
    <>
      {/* Middle Column */}
      <div className="w3-col m9">
        <div className="w3-row-padding">
          <div className="w3-col m12">
            <div className="w3-card w3-round w3-white w3-margin-bottom">
            <div className="w3-container w3-padding">
              <div className='w3-left'>
              Submenu
              </div>
              <div>
                {articles?.map((art) => {
                  const relativePath = art.Path.substr(DATA.dataPath.length + 1);
                  return (
                    <span key={`memo-${art.Id}`} className='w3-padding'>
                      {/* <i className="fa fa-pencil fa-fw w3-margin-right w3-text-theme"></i>  */}
                      {/* {art.DisplayName} */}
                      <Link key={`sidemenu-link-${art.Id}`} to={'/' + relativePath} className="side-menu-link">
                        {art.DisplayName}
                      </Link>
                    </span>
                  )})}
                  </div>
              </div>
            </div>

            <div className="w3-card w3-round w3-white">
              <div className="w3-container w3-padding">
                <h1>{props.data.DisplayName}</h1>
                <div className="context-info">
                  <ul>
                    <li>React Component:<span>memolist</span></li>
                    <li>Content Name: <span>{props.data.Name}</span></li>
                    <li>Content Type: <span>{props.data.Type}</span></li>
                    <li>Content Path: <span>{props.data.Path}</span></li>
                    <li>Content Lifespan: <span>{props.data.EnableLifespan?"true":"false"}</span></li>
                    <li>Content ValidFrom: <span>{props.data.ValidFrom}</span></li>
                    <li>Content ValidTill: <span>{props.data.ValidTill}</span></li>
                    <li>Page Name: <span>{currentPage?.Name}</span></li>
                    <li>Page Type: <span>{currentPage?.Type}</span></li>
                    <li>Page Path: <span>{currentPage?.Path}</span></li>                   
                  </ul>
                </div>
                {articles?.map((art) => (
                  <div key={`memo-${art.Id}`}>
                    {/* <i className="fa fa-pencil fa-fw w3-margin-right w3-text-theme"></i>  */}
                    {/* {art.DisplayName} */}
                    {loadCompo(art)}
                  </div>
                ))}

             
                <React.Suspense fallback='Loading views...'>
                  <div className='container'>{dynacompo}</div>
                </React.Suspense>
              </div>
            </div>
          </div>
        </div>
      </div>
      <br />
      {/* End Middle Column */}
    </>
  );
};

export default MemoListContent;
