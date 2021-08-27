export function ContentViewComponent(props) {
  console.log('contentview component');
  console.log(props.data);
  const currentPage = props.page?props.page.filter(pcnt => pcnt.Type === 'PageContainer')[0]:{};
  let context = props.data;
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
            <div className="w3-container w3-padding">
              <h1>{props.data.DisplayName} - {props.widget.DisplayName}</h1>
              <div className="context-info">
                  <ul>
                    <li>Component: <span>simple text</span></li>
                    <li>Content Name: <span>{context.Name}</span></li>
                    <li>Content Type: <span>{context.Type}</span></li>
                    <li>Content Path: <span>{context.Path}</span></li>
                    <li>Content Lifespan: <span>{context.EnableLifespan?"true":"false"}</span></li>
                    <li>Content ValidFrom: <span>{context.ValidFrom}</span></li>
                    <li>Content ValidTill: <span>{context.ValidTill}</span></li>
                    <li>Page Name: <span>{currentPage?.Name}</span></li>
                    <li>Page Type: <span>{currentPage?.Type}</span></li>
                    <li>Page Path: <span>{currentPage?.Path}</span></li>
                    <li>Widget Name: <span>{props.widget.Name}</span></li>
                    <li>Widget Type: <span>{props.widget.Type}</span></li>
                    <li>Widget Path: <span>{props.widget.Path}</span></li>
                    <li>Widget Context: <span>{props.widget.ContextBinding}</span></li>
                    <li>Widget Custom Root: <span>{props.widget.CustomRoot?.Path}</span></li>
                  </ul>
                </div>
            </div>
          </div>
        </div>
      </div>
    // </div>
  );
}

export default ContentViewComponent
