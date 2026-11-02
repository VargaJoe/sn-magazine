import ShowDebugInfo from "../utils/show-debuginfo"
import { addComponent } from '../utils/add-component';
import useBindedContext from "../utils/context-binding"
import { useSnStore } from "../store/sn-store";

export function ContentViewWidget(props) {
  console.log('%cContentView', 'font-size:16px;color:green', { props: props });
  // const layout = props.page;
  // let context = props.data; // todo: context binding
  const {context, page, layout} = useSnStore((state) => state);
  const widget = props.widget;
  const bindedContext = useBindedContext(props, true);

  return (
    <div>
        <ShowDebugInfo title="contentview widget" context={context} currentPage={page} widget={widget} />
        {addComponent('content', 'auto', bindedContext.content?.Type.toLowerCase(), `cv-${context.Id}-${bindedContext.content?.Id}`, bindedContext.content, props.page, widget)}
    </div>
  );
}

export default ContentViewWidget
