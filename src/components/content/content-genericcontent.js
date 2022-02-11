import ShowDebugInfo from "../utils/show-debuginfo"

const DATA = require('../../config.json');

export function FolderContent(props) {
  const layout = props.page;
  let context = props.data;
  const widget = props.widget;

// ======================================== START OF CONTEXT BINDING ========================================
if (widget !== undefined && widget !== null) {
  console.log(widget.ContextBinding);
  let contextPath = context.Path;
  switch(widget.ContextBinding[0]) {
    case "customroot":
      if (widget.CustomRoot !== undefined) {
        context = widget.CustomRoot
        contextPath = context.Path;
      } else {
        console.log('customroot is not set');
      }
      break;
    case "currentsite":
      context = context.Workspace;
      // contextPath = process.env.REACT_APP_DATA_PATH || DATA.dataPath;
      break;
    default:
      // code block
  }  
}

// if (widget.RelativePath !== "") {
//   contextPath += widget.RelativePath
// }
// ======================================== START OF CONTEXT BINDING ========================================


  console.log('generic content', props, layout, context, widget);

  return (
    // <div className="w3-col m9 w3-right">
    <div className="w3-row-padding w3-margin-bottom">
      <div className="w3-col m12">
        <div className="w3-card w3-round w3-white">
        {ShowDebugInfo("generic content", context, layout, widget)}
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

export default FolderContent
