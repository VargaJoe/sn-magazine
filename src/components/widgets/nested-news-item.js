import { Link } from "react-router-dom";
import Moment from 'moment';
import ShowDebugInfo from "../utils/show-debuginfo"
import LazyImage from "../utils/lazyload-image";
import { useSnStore } from "../store/sn-store";

const DATA = require('../../config.json');

// Todo: this component is flagged for deletion after next release

export function NestedNewsItem(props) {
  console.log('%cNestedNewsItem', "font-size:16px;color:green", { props: props });
  // const layout = props.page;
  const context = props.data;
  const {layout} = useSnStore((state) => state);
  const widget = props.widget;

  // max words split by space, max sentences split by dot+space, choice should come from widget setting
  const MAX_SENTENCES = 1; // should come from widget setting
  const leadSentences = context?.Lead?.split('. ');
  const truncatedLead = leadSentences&&leadSentences.slice(0, MAX_SENTENCES).join('. ').trim() + (leadSentences?.length > MAX_SENTENCES ? '...' : '');

  const relativePath = context.Path.substr((process.env.REACT_APP_DATA_PATH || DATA.dataPath).length + 1);
  
  function newsImage () { 
    if (context.Image.Url === "") {
      return "";
    }

    return (
      <div className="news-image w3-padding">
         {/* {LazyImage((process.env.REACT_APP_API_URL || DATA.apiUrl) + context.Image.Url, context.DisplayName, "w3-hover-opacity")} */}
        <LazyImage src={(process.env.REACT_APP_API_URL || DATA.apiUrl) + context.Image.Url} alt={context.DisplayName} className="w3-hover-opacity"/>
      </div>
    );   
  };
  

  return (
    // <div className="w3-col m9">
      <div className="w3-row-padding w3-margin-bottom w3-left w3-block m1 news-item">
        <div className="w3-col">
          <div className="w3-card w3-round w3-white">
          {ShowDebugInfo("news item", context, layout, widget)}
            <div className="w3-container w3-padding">
              <div className="w3-padding-16">
                <Link key={`news-item-${context.Id}`} to={'/' + relativePath} className="no-score">
                    {newsImage()}
                    <div className="w3-left w3-padding news-meta">
                      <div className="w3-large">{context.DisplayName}</div>                      
                      <div className="small hidden">{context.Author}</div>
                      <div>{Moment(context.PublishDate).format('yyyy.MM.DD')}</div>
                    </div>
                    <div className="small" dangerouslySetInnerHTML={{ __html: truncatedLead }}></div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    // </div>
  );
}

export default NestedNewsItem
