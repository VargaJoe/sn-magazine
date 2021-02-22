export const LinkListContent = () => {
  console.log("inside smartfolder");

  return (
    <>
      {/* Middle Column */}
      <div className="w3-col m7">
        <div className="w3-row-padding">
          <div className="w3-col m12">
            <div className="w3-card w3-round w3-white">
              <div className="w3-container w3-padding">
                <p>linklist</p>
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
