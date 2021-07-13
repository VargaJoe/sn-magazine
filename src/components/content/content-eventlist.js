export const EventListContent = (props) => {
  console.log('eventlist component');
  console.log(props.data);
  return (
    <>
      {/* Middle Column */}
      <div className="w3-col m9">
        <div className="w3-row-padding">
          <div className="w3-col m12">
            <div className="w3-card w3-round w3-white">
              <div className="w3-container w3-padding">
                <h1>{props.data.DisplayName}</h1>
                <p>eventlist</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <br />
      {/* End Middle Column */}
    </>
  );
};

export default EventListContent;
