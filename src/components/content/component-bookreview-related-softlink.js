import { Link } from "react-router-dom";
import Moment from 'moment';
import ShowDebugInfo from "../utils/show-debuginfo"

const DATA = require('../../config.json');

export function ReviewRelatedSoftLink(props) {
  console.log('folder component');
  console.log(props);
  const currentPage = props.page
  ? props.page.filter((pcnt) => pcnt.Type === "Page" || pcnt.Type === "Layout")[0]
  : {};
  const context = props.data;
  const widget = props.widget;
  const relativePath = context.Path.substr((process.env.REACT_APP_DATA_PATH || DATA.dataPath).length + 1);

  return (
    // <div className="w3-col m9">
      <div className="w3-row-padding w3-margin-bottom">
        <div className="w3-col m12">
          <div className="w3-card w3-round w3-white">
          {ShowDebugInfo("review related softlink", context, currentPage, widget)}
            <div className="w3-container w3-padding">
              <a key={`news-item-${context.Id}`} href={context.Url} target="_blank" rel="noreferrer" className="no-score">
                <div className="w3-left w3-padding related-link-meta">
                  <div className="w3-large"><i className="fa fa-link fa-fw related-link-icon"></i>{context.DisplayName}</div>
                  <div className="small">{context.Description}</div>
                  {/* <div className="small hidden">{context.Author}</div>
                  <div>{Moment(context.PublishDate).format('yyyy.MM.DD')}</div> */}
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    // </div>
  );
}

export default ReviewRelatedSoftLink
