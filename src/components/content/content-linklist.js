export const LinkListContent = (props) => {
  console.log("linklist component");
  console.log(props.data);
  return (
    <>
      {/* Middle Column */}
      <div className="w3-col m7">
        <div className="w3-row-padding">
          <div className="w3-col m12">
            <div className="w3-card w3-round w3-white">
              <div className="w3-container w3-padding">
                <h1>{props.data.DisplayName}</h1>
                <div className="context-info">
                  <ul>
                    <li>Component: <span>linklist</span></li>
                    <li>Name: <span>{props.data.Name}</span></li>
                    <li>Type: <span>{props.data.Type}</span></li>
                    <li>Path: <span>{props.data.Path}</span></li>
                    <li>Lifespan: <span>{props.data.EnableLifespan?"true":"false"}</span></li>
                    <li>ValidFrom: <span>{props.data.ValidFrom}</span></li>
                    <li>ValidTill: <span>{props.data.ValidTill}</span></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
        <br/>
      </div>
      {/* End Middle Column */}

      {/* Right Column */}
      <div className="w3-col m2">
        <div class="w3-card w3-round w3-white w3-padding-32 w3-center">
          <p><i class="fa fa-bug w3-xxlarge"></i></p>
        </div>     
      </div>
      {/* End Right Column */}
    </>
  );
};

export default LinkListContent;
