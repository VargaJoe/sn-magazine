import ShowDebugInfo from "../utils/show-debuginfo"
import { useSnStore } from "../store/sn-store";

export function ReviewRelatedSoftLink(props) {
  console.log('folder component');
  console.log(props);
  // const layout = props.page;
  const context = props.data;
  const {layout} = useSnStore((state) => state);
  const widget = props.widget;

  return (
    // <div className="w3-col m9">
      <div className="w3-row-padding w3-margin-bottom">
        <div className="w3-col m12">
          <div className="w3-card w3-round w3-white">
          {ShowDebugInfo("review related softlink", context, layout, widget)}
            <div className="w3-container w3-padding">
              <a key={`news-item-${context.Id}`} href={context.Url} target="_blank" rel="noreferrer" className="no-score">
                <div className="w3-left w3-padding related-link-meta">
                  <div className="w3-large"><i className="fa fa-link fa-fw related-link-icon"></i>{context.DisplayName}</div>
                  <div className="small" dangerouslySetInnerHTML={{ __html: context.Description }}/>
                  {/* <div className="small hidden">{context.Author}</div>
                  <div>{Moment(context.PublishDate).format('yyyy.MM.DD')}</div> */}
                </div>
              </a>
              <div className="small w3-clear w3-center" dangerouslySetInnerHTML={{ __html: context.Embed }}/>
            </div>
          </div>
        </div>
      </div>
    // </div>
  );
}

export default ReviewRelatedSoftLink
