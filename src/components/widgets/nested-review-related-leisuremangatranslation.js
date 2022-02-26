import { Link } from "react-router-dom";
import Moment from 'moment';
import ShowDebugInfo from "../utils/show-debuginfo"

const DATA = require('../../config.json');

export function ReviewRelatedMangaTranslation(props) {
  console.log('review related mangatranslation component');
  console.log(props);
  const layout = props.page;
  const context = props.data;
  const widget = props.widget;
  const relativePath = context.Path.substr((process.env.REACT_APP_DATA_PATH || DATA.dataPath).length + 1);

  const direction = () => {
    if (context.ReadDirection.join() === "rightleft") {
      return "jobbról balra";
    } else {
      return "balról jobbra";
    }
  }

  const directionIcon = () => {
    if (context.ReadDirection.join() === "rightleft") {
      return "fa-arrow-circle-left";
    } else {
      return "fa-arrow-circle-right";
    }
  }
    
  return (
    // <div className="w3-col m9">
      <div className="w3-row-padding w3-margin-bottom">
        <div className="w3-col m12">
          <div className="w3-card w3-round w3-white">
          {ShowDebugInfo("review related softlink", context, layout, widget)}
            <div className="w3-container w3-padding">
              <a key={`news-item-${context.Id}`} href={context.Url} target="_blank" rel="noreferrer" className="no-score">
                <div className="w3-left w3-padding related-link-meta">
                  <div className="w3-large"><i className="fa fa-download fa-fw related-link-icon"></i>{context.DisplayName}</div>
                  <div>{context.Description}</div>
                  <div className="small">olvasási irány: {direction()}<i className={`fa ${directionIcon()} fa-fw read-direction-icon`}></i></div>
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

export default ReviewRelatedMangaTranslation
