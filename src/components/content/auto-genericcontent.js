import ShowDebugInfo from "../utils/show-debuginfo"

export function GenericContent(props) {
  const componentName = 'generic content'
  const layout = props.page;
  let context = props.data;
  const widget = props.widget;
  console.log(componentName, context.DisplayName, props, layout, context, widget);

  return (
    // <div className="w3-col m9 w3-right">
    <div className="w3-row-padding w3-margin-bottom">
      <div className="w3-col m12">
        <div className="w3-card w3-round w3-white">
        {ShowDebugInfo(componentName, context, layout, widget)}
          <div className="w3-container w3-padding">
            <h1>{context.DisplayName}</h1>
            <div className="context-info">
              <div dangerouslySetInnerHTML={{ __html: context.Description }}/>
            </div>
          </div>
        </div>
      </div>
    </div>
    // </div>
  );
}

export default GenericContent;
