export function SimpletTextComponent(props) {
  console.log('simpletext component');
  console.log(props.data);
  const currentPage = props.page?props.page.filter(pcnt => pcnt.Type === 'PageContainer')[0]:{};
  return (
    // <div className="w3-col m9 w3-right">
      <div className="w3-row-padding w3-margin-bottom">
        <div className="w3-col m12">
          <div className="w3-card w3-round w3-white">
            <div className="w3-container w3-padding">
              <h1>{props.data.DisplayName}</h1>
              <div className="context-info">
                  <ul>
                    <li>Component: <span>simple text</span></li>
                    <li>Content Name: <span>{props.data.Name}</span></li>
                    <li>Content Type: <span>{props.data.Type}</span></li>
                    <li>Content Path: <span>{props.data.Path}</span></li>
                    <li>Content Lifespan: <span>{props.data.EnableLifespan?"true":"false"}</span></li>
                    <li>Content ValidFrom: <span>{props.data.ValidFrom}</span></li>
                    <li>Content ValidTill: <span>{props.data.ValidTill}</span></li>
                    <li>Page Name: <span>{currentPage?.Name}</span></li>
                    <li>Page Type: <span>{currentPage?.Type}</span></li>
                    <li>Page Path: <span>{currentPage?.Path}</span></li>
                    <li>Widget Name: <span>{props.widget.Name}</span></li>
                    <li>Widget Type: <span>{props.widget.Type}</span></li>
                    <li>Widget Path: <span>{props.widget.Path}</span></li>
                  </ul>
                </div>
            </div>
          </div>
        </div>
      </div>
    // </div>
  );
}

export default SimpletTextComponent
