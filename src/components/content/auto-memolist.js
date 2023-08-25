import React, { useCallback, useEffect, useState } from 'react';
import { useRepository } from '@sensenet/hooks-react';
import { addComponent } from '../utils/add-component';
import ShowDebugInfo from "../utils/show-debuginfo"

const MemoList = (props) => {
  const componentName = 'memolist'
  const repo = useRepository();
  const contextPath = props.data.Path;
  const [articles, setArts] = useState([]);

  const layout = props.page;
  let context = props.data;
  const widget = props.widget;
  console.log(componentName, context.DisplayName, props, layout, context, widget);

  
  const loadContents = useCallback(async () => {
    const result = await repo.loadCollection({
      // path: `${process.env.REACT_APP_DATA_PATH || DATA.dataPath}/${categoryName}`,
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

  useEffect(() => {
    loadContents();
  }, [contextPath, loadContents, repo]);

  let counter = 0;

  return (
    <>
      {/* Middle Column */}
      {/* <div className="w3-col m9"> */}
        <div className="w3-row-padding">
          <div className="w3-col m12">
            <div className="w3-card w3-round w3-white w3-margin-bottom">
              {ShowDebugInfo(componentName, context, layout, widget)}
            </div>

            <div className="w3-card w3-round w3-white">
              <div className="w3-container w3-padding">
                <h1>{props.data.DisplayName}</h1>
                <div className="context-info">
                  {context.Description}
                </div>
                {articles?.map((child) => (
                  <div key={`content-memo-${counter++}-${props.data.Id}-${child.Id}`}>
                    {/* <i className="fa fa-pencil fa-fw w3-margin-right w3-text-theme"></i>  */}
                    {/* {art.DisplayName} */}
                    {/* {loadCompo(art)} */}
                    {addComponent('content', 'auto', child.Type.toLowerCase(), `${counter++}-${props.data.Id}-${child.Id}`, child, props.page)}
                  </div>
                ))}

             
                {/* <React.Suspense fallback='Loading views...'>
                  <div className='container'>{dynacompo}</div>
                </React.Suspense> */}
              </div>
            </div>
          </div>
        </div>
      {/* </div>
      <br /> */}
      {/* End Middle Column */}
    </>
  );
};

export default MemoList;
