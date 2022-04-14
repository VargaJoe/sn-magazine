import ShowDebugInfo from "../utils/show-debuginfo"
export function SimpletTextWidget(props) {
  console.groupCollapsed('%csimpleTextWidget', "font-size:16px;color:green");
  console.log('simpletext component');  
  console.log(props);
  const layout = props.page;
  const context = props.data;
  const widget = props.widget;

  return (
    // <div className="w3-col m9 w3-right">
      <div className="w3-row-padding w3-margin-bottom">
        <div className="w3-col m12">
          <div className="w3-card w3-round w3-white">
          {ShowDebugInfo("simple text widget", context, layout, widget)}
            <div className="w3-container w3-padding widget-simpletext">
              <h1>{widget.Title}</h1>
              <div className="context-info">
                <div dangerouslySetInnerHTML={{ __html: widget.ComponentContent }}/>
              </div>
            </div>
          </div>
        </div>
        {console.groupEnd()}
      </div>
    // </div>
  );
}

export default SimpletTextWidget
