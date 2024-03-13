import ShowDebugInfo from "../utils/show-debuginfo"
import { useSnStore } from "../store/sn-store";

export function Article(props) {
  const componentName = 'article'
  console.log(`%c${componentName}`, 'font-size:16px;color:green');
  console.log('article', props);
  // const layout = props.page;
  // let context = props.data;
  const {context, page, layout} = useSnStore((state) => state);
  const widget = props.widget;

  return (
    // <div className="w3-col m9 w3-right">
    <div className="w3-row-padding w3-margin-bottom">
      <div className="w3-col m12">
        <div className="w3-card w3-round w3-white">
        {ShowDebugInfo(componentName, context, page, widget, layout)}
          <div className="w3-container w3-padding">
            <h1>{context.DisplayName}</h1>
            <div className="context-info">
              <i><div dangerouslySetInnerHTML={{ __html: context.Lead }}/></i>
              <div dangerouslySetInnerHTML={{ __html: context.Body }}/>
            </div>
          </div>
        </div>
      </div>
      {}
    </div>
    // </div>
  );
}

export default Article;
