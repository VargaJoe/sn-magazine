export function FolderContent(props) {
  console.log('folder component');
  console.log(props.data);
  const layout = props.page;
  return (
    // <div className="w3-col m9">
      <div className="w3-row-padding w3-margin-bottom">
        <div className="w3-col m12">
          <div className="w3-card w3-round w3-white">
            <div className="w3-container w3-padding">
              <h1>{props.data.DisplayName}</h1>
              <div className="context-info">
                  <ul>
                    <li>Component: <span>article</span></li>
                    <li>Content Name: <span>{props.data.Name}</span></li>
                    <li>Content Type: <span>{props.data.Type}</span></li>
                    <li>Content Path: <span>{props.data.Path}</span></li>
                    <li>Content Lifespan: <span>{props.data.EnableLifespan?"true":"false"}</span></li>
                    <li>Content ValidFrom: <span>{props.data.ValidFrom}</span></li>
                    <li>Content ValidTill: <span>{props.data.ValidTill}</span></li>
                    <li>Page Name: <span>{layout?.Name}</span></li>
                    <li>Page Type: <span>{layout?.Type}</span></li>
                    <li>Page Path: <span>{layout?.Path}</span></li>  

                    <li>Body: <span>{props.data.Body}</span></li>

                  </ul>
                </div>
            </div>
          </div>
        </div>
      </div>
    // </div>
  );
}

export default FolderContent
