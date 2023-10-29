import ShowDebugInfo from "../utils/show-debuginfo"
import { addComponent } from '../utils/add-component';
import BindedContext from "../utils/context-binding"
import { useSnStore } from "../store/sn-store";

export function ContentViewWidgetComponent(props) {
  console.log('%ccontentview', 'font-size:16px;color:green');
  console.log('contentview', props);
  // const layout = props.page;
  // let context = props.data; // todo: context binding
  const {context, layout} = useSnStore((state) => state);
  const widget = props.widget;
  const bindedContext = BindedContext(props, true);

  return (
    <div>
        {ShowDebugInfo("contentview widget", context, layout, widget)}
        {addComponent('content', 'auto', bindedContext.content.Type.toLowerCase(), `cv-${context.Id}-${bindedContext.content.Id}`, bindedContext.content, props.page, widget)}
    </div>
  );
}

export default ContentViewWidgetComponent
