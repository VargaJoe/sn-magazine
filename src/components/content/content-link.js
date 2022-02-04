export function FolderContent(props) {
  console.log('folder component');
  console.log(props.data);
  const currentPage = props.page?props.page.filter(pcnt => pcnt.Type === 'Page')[0]:{};
  return (
    // <div className="w3-col m9">
      <div className="w3-row-padding w3-margin-bottom">
        <div className="w3-col m12">
          <div className="w3-card w3-round w3-white">
            <div className="w3-container w3-padding">
              <h1>{props.data.DisplayName}</h1>
              <div className="context-info">
                  <ul>
                    <li>Component: <span>link</span></li>
                    <li>link: <span>{props.data.Url}</span></li>
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
