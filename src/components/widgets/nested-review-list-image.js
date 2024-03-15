import { Link } from "react-router-dom";
import ShowDebugInfo from "../utils/show-debuginfo"
import LazyImage from "../utils/lazyload-image";

const DATA = require('../../config.json');

export function ReviewListImage(props) {
  console.log('gallery item');
  console.log(props);
  const layout = props.page;
  const context = props.data;
  const widget = props.widget;

  const relativePath = context.Path.substr((process.env.REACT_APP_DATA_PATH || DATA.dataPath).length + 1);
  return (
    // <div className="w3-col m9">
      <div className="w3-row-padding w3-margin-bottom w3-left gallery-item">
        <div className="w3-col">
          <div className="w3-card w3-round w3-white">
          {ShowDebugInfo("gallery item", context, layout, widget)}
            <div className="w3-container w3-padding">
              {/* <h1>{props.data.DisplayName}</h1> */}
              <div className="context-info">
                  <Link key={`gallery-item-${context.Id}`} to={'/' + relativePath} className="side-menu-link">
                      <LazyImage src={(process.env.REACT_APP_API_URL || DATA.apiUrl) + context.Image.Url} alt={context.DisplayName} className="w3-hover-opacity w3-col"/>
                  </Link>
                </div>
            </div>
          </div>
        </div>
      </div>
    // </div>
  );
}

export default ReviewListImage
