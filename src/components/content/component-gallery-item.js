import { Link } from "react-router-dom";
import Moment from 'moment';

const DATA = require('../../config.json');

export function CustomGalleryItem(props) {
  console.log('gallery item');
  console.log(props);
  const currentPage = props.page?props.page.filter(pcnt => pcnt.Type === 'Page')[0]:{};
  let context = props.data;
  const relativePath = context.Path.substr((process.env.REACT_APP_DATA_PATH || DATA.dataPath).length + 1);
  return (
    // <div className="w3-col m9">
      <div className="w3-row-padding w3-margin-bottom w3-left gallery-item">
        <div className="w3-col">
          <div className="w3-card w3-round w3-white">
            <div className="w3-container w3-padding">
              {/* <h1>{props.data.DisplayName}</h1> */}
              <div className="context-info">
                  <Link key={`gallery-item-${context.Id}`} to={'/' + relativePath} className="side-menu-link">
                  {/* <svg width="200px" height="200px" > */}
                    {/* <img src={DATA.apiUrl + context.Path + '/cover.jpg'} alt={context.DisplayName} class="w3-hover-opacity w3-col"/> */}
                    {/* <img src={DATA.apiUrl + DATA.dataPath + '/(structure)/Site/sample.png'} alt={context.DisplayName} class="w3-hover-opacity w3-col"/> */}
                    <img src={(process.env.REACT_APP_API_URL || DATA.apiUrl) + context.Image.Url} alt={context.DisplayName} class="w3-hover-opacity w3-col"/>
                  {/* </svg> */}
                    <div class="w3-container w3-white list-box-title">
                        <p>
                          {/* <b>{(context.DisplayName.indexOf('-') > 0)?context.DisplayName.substr(0, context.DisplayName.indexOf('-')):context.DisplayName}</b> */}
                          <b>{context.DisplayName}</b>
                          {/* <span class="hide-icon"><i class="fa fa-download"></i></span> */}
                        </p>
                        <p class="hidden"></p>
                        <div class="small hidden">{context.Author}</div>
                        <div class="small hidden">{Moment(context.PublishDate).format('yyyy.MM.DD')}</div>
                    </div>
                  </Link>
                </div>
            </div>
          </div>
        </div>
      </div>
    // </div>
  );
}

export default CustomGalleryItem
