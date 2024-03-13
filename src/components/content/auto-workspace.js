import ShowDebugInfo from "../utils/show-debuginfo"
import BindedContext from "../utils/context-binding"
import { useSnStore } from "../store/sn-store";

export function Workspace(props) {
  const componentName = 'content-auto-workspace'
  // const layout = props.page;
  // let context = props.data;
  const {context, page, layout} = useSnStore((state) => state);
  const widget = props.widget;
  const bindedContext = BindedContext(props, true);
  console.log(componentName, context.DisplayName, props, layout, context, widget);
  
  return (
    // <div className="w3-col m9 w3-right">
    <div className="w3-row-padding w3-margin-bottom">
      <div className="w3-col m12">
        <div className="w3-card w3-round w3-white">
        {ShowDebugInfo(componentName, context, page, widget, layout)}
          <div className="w3-container w3-padding">
            <h1>{bindedContext.content.DisplayName}</h1>
            <div className="context-info">
              <div dangerouslySetInnerHTML={{ __html: bindedContext.content.Description }}/>
            </div>
          </div>
        </div>
      </div>
    </div>
    // </div>
  );
}

export default Workspace;
