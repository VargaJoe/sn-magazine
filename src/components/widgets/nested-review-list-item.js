import { Link } from "react-router-dom";
import Moment from 'moment';
// import ShowDebugInfo from "../utils/show-debuginfo";
import LazyImage from "../utils/lazyload-image";
import { useSnStore } from "../store/sn-store";
import React from 'react';

const DATA = require('../../config.json');

const NestedReviewListItemComponent = React.memo((props) => {
  // console.log('%cNestedReviewListItemComponent', "font-size:16px;color:green", { props: props });
  const context = props.data;  
  // const {page, layout} = useSnStore((state) => state);
  // const widget = props.widget;

  const relativePath = context.Path.substr((process.env.REACT_APP_DATA_PATH || DATA.dataPath).length + 1);

  // Deep comparison debug
  // const prevRef = useRef({ props: null, page: null, layout: null });
  // useEffect(() => {
  //   const prev = prevRef.current;
  //   const deepChanged =
  //     JSON.stringify(prev.props) !== JSON.stringify(props) ||
  //     JSON.stringify(prev.page) !== JSON.stringify(page) ||
  //     JSON.stringify(prev.layout) !== JSON.stringify(layout);
  //   if (deepChanged) {
  //     // console.log('%c[NestedReviewListItemComponent] Deep change detected', 'color:orange;font-weight:bold', {
  //     //   prevProps: prev.props, currProps: props,
  //     //   prevPage: prev.page, currPage: page,
  //     //   prevLayout: prev.layout, currLayout: layout
  //     // });
  //   } else {
  //     // console.log('%c[NestedReviewListItemComponent] No deep change', 'color:orange', {
  //     //   prevProps: prev.props, currProps: props,
  //     //   prevPage: prev.page, currPage: page,
  //     //   prevLayout: prev.layout, currLayout: layout
  //     // });
  //   }
  //   prevRef.current = { props, page, layout };
  // }, [props, page, layout]);

  if ( context === undefined || context === null) {
    return (<div>loading</div>)
  }

  return (
    // <div className="w3-col m9">
      <div className="w3-row-padding w3-margin-bottom w3-left gallery-item">
        <div className="w3-col">
          <div className="w3-card w3-round w3-white">
          {/* {ShowDebugInfo("gallery item", context, page, widget, layout)} */}
            <div className="w3-container w3-padding">
              {/* <h1>{props.data.DisplayName}</h1> */}
              <div className="context-info">
                  <Link key={`gallery-item-${context.Id}`} to={'/' + relativePath} className="side-menu-link">
                  {/* <svg width="200px" height="200px" > */}
                    {/* <img src={DATA.apiUrl + context.Path + '/cover.jpg'} alt={context.DisplayName} className="w3-hover-opacity w3-col"/> */}
                    {/* <img src={DATA.apiUrl + DATA.dataPath + '/(structure)/Site/sample.png'} alt={context.DisplayName} className="w3-hover-opacity w3-col"/> */}
                      <LazyImage src={(process.env.REACT_APP_API_URL || DATA.apiUrl) + context.Image?.Url} alt={context.DisplayName} className="w3-hover-opacity w3-col"/>
                  {/* </svg> */}
                    <div className="w3-white list-box-title">
                        <p>
                          {/* <b>{(context.DisplayName.indexOf('-') > 0)?context.DisplayName.substr(0, context.DisplayName.indexOf('-')):context.DisplayName}</b> */}
                          <b>{context.DisplayName}</b>
                          {/* <span className="hide-icon"><i className="fa fa-download"></i></span> */}
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
  );
});

export default NestedReviewListItemComponent;
