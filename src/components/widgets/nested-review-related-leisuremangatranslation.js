import ShowDebugInfo from "../utils/show-debuginfo"
import { useSnStore } from "../store/sn-store";

export function NestedReviewRelatedMangaTranslation(props) {
  // console.log('%cNestedReviewRelatedMangaTranslation', 'font-size:16px;color:green', { props: props });
  const context = props.data;
  const {page} = useSnStore((state) => state);
  const widget = props.widget;

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
      <div className="w3-row-padding w3-margin-bottom">
        <div className="w3-col m12">
          <div className="w3-card w3-round w3-white">
          <ShowDebugInfo title="review related softlink" context={context} currentPage={page} widget={widget} />
            <div className="w3-container w3-padding">
              <a key={`news-item-${context.Id}`} href={context.Url} target="_blank" rel="noreferrer" className="no-score">
                <div className="w3-left w3-padding related-link-meta">
                  <div className="w3-large"><i className="fa fa-download fa-fw related-link-icon"></i>{context.DisplayName}</div>
                  <div dangerouslySetInnerHTML={{ __html: context.Description }}/>
                  <div className="small">olvasási irány: {direction()}<i className={`fa ${directionIcon()} fa-fw read-direction-icon`}></i></div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
  );
}

export default NestedReviewRelatedMangaTranslation
