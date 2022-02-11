import ShowDebugInfo from "../utils/show-debuginfo"

export function ContentViewWidgetComponent(props) {
  console.log('contentview component');
  console.log(props.data);
  const layout = props.page;
  let context = props.data; // todo: context binding
  const widget = props.widget;

  console.log(props.widget.ContextBinding);
  if (props.widget.ContextBinding[0] === 'customroot' ) {
    if (props.widget.CustomRoot !== undefined) {
      context = props.widget.CustomRoot
    } else {
      console.log('customroot is not set');
    }
  }


  return (
    // <div className="w3-col m9 w3-right">
      <div className="w3-row-padding w3-margin-bottom">
        <div className="w3-col m12">
          <div className="w3-card w3-round w3-white">
          {ShowDebugInfo("content view widget", context, layout, widget)}
            <div className="w3-container w3-padding">
              <h1>{widget.Title}</h1>
              <div className="context-info">
                <div dangerouslySetInnerHTML={{ __html: widget.ComponentContent }}/>
              </div>
            </div>
          </div>
        </div>
      </div>
    // </div>
  );
}

export default ContentViewWidgetComponent
