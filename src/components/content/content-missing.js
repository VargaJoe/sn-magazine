export function MissingContent() {
  return (
    <>
      {/* Middle Column */}
      <div className="w3-col m7">
        <div className="w3-row-padding">
          <div className="w3-col m12">
            <div className="w3-card w3-round w3-white">
              <div className="w3-container w3-padding">
                <p>component not exists</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <br/>
      {/* End Middle Column */}

      {/* Right Column */}
      <div className="w3-col m2">
        
      </div>
      {/* End Right Column */}
    </>
  );
}

export default MissingContent;