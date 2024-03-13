import ShowDebugInfo from "../utils/show-debuginfo"
import { useSnStore } from "../store/sn-store";

export function SimpletTextWidget(props) {
  console.log('%cSimpleText', "font-size:16px;color:green", { props: props });
  // const layout = props.page;
  // const context = props.data;
  const widget = props.widget;
  const {context, page, layout} = useSnStore((state) => state);

  return (
    // <div className="w3-col m9 w3-right">
      <div className="w3-row-padding w3-margin-bottom">
        <div className="w3-col m12">
          <div className="w3-card w3-round w3-white">
          {ShowDebugInfo("simple text widget", context, page, widget, layout)}
            <div className="w3-container w3-padding widget-simpletext">
              <h1>{widget.Title}</h1>
              <div className="context-info">
                <div dangerouslySetInnerHTML={{ __html: widget.ComponentContent }}/>
              </div>
            </div>
          </div>
        </div>
        {}
      </div>
    // </div>
  );
}

export default SimpletTextWidget
