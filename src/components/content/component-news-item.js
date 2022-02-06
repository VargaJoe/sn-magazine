import { Link } from "react-router-dom";
import Moment from 'moment';

const DATA = require('../../config.json');

export function CustomNewsItem(props) {
  console.log('gallery item');
  console.log(props);
  const currentPage = props.page?props.page.filter(pcnt => pcnt.Type === 'Page')[0]:{};
  let context = props.data;
  const relativePath = context.Path.substr((process.env.REACT_APP_DATA_PATH || DATA.dataPath).length + 1);
  
  function newsImage () { 
    if (context.Image.Url === "") {
      return "";
    }

    return (
      <div className="w3-left w3-padding">
        <img src={(process.env.REACT_APP_API_URL || DATA.apiUrl) + context.Image.Url} alt={context.DisplayName} class="w3-hover-opacity"/>
      </div>
    );   
  };
  

  return (
    // <div className="w3-col m9">
      <div className="w3-row-padding w3-margin-bottom w3-left w3-block m1 news-item">
        <div className="w3-col">
          <div className="w3-card w3-round w3-white">
            <div className="w3-container w3-padding">
              <div class="w3-padding-16">
                <Link key={`news-item-${context.Id}`} to={'/' + relativePath} className="no-score">
                    {newsImage()}
                    <div className="w3-left w3-padding news-meta">
                      <div class="w3-large">{context.DisplayName}</div>
                      <div class="small">{context.Lead}</div>
                      <div class="small hidden">{context.Author}</div>
                      <div>{Moment(context.PublishDate).format('yyyy.MM.DD')}</div>
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

export default CustomNewsItem
