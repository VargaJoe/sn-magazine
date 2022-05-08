import ShowDebugInfo from "../utils/show-debuginfo"
import { addComponent } from '../utils/add-component';
import BindedContext from "../utils/context-binding"

export function ContentViewWidgetComponent(props) {
  console.groupCollapsed('%ccontentview', 'font-size:16px;color:green');
  console.log('contentview', props);
  const layout = props.page;
  let context = props.data; // todo: context binding
  const widget = props.widget;
  const bindedContext = BindedContext(props, true);

  return (
    <div>
    
                {addComponent('content', 'auto', bindedContext.content.Type.toLowerCase(), `cv-${context.Id}-${bindedContext.content.Id}`, bindedContext.content, props.page, widget)}
    
        {console.groupEnd()}
    
    </div>
  );
}

export default ContentViewWidgetComponent
