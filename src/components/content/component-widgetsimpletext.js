import React, { useState } from "react";
import { useLocation } from "react-router-dom";

const DATA = require('../../config.json');

export function SimpletTextComponent(props) {
  const { search } = useLocation();

  console.log('simpletext component');  
  console.log(props);
  const layout = props.page;
  let context = props.data;
  let widget = props.widget;

 // ======================================== START OF DEBUG INFO ========================================
 function useQuery() {
  const { search } = useLocation();

  return React.useMemo(() => new URLSearchParams(search), [search]);
}
let query = useQuery();

const [showDebug, setDebug] = useState(false);
const handleToggle = () => {
  setDebug(!showDebug);
};
// refactor: debugview to separate Component, add variables through parameters
function DebugView (isDebug) { 
  if (!isDebug || isDebug !== 'true')
    return;

  return (
  <div className="context-info debug-info">
    <div className="debug-info-button">
      <button title="show" onClick={handleToggle}>
        show
      </button>
    </div>
    <div
      className={`debug-info-details w3-left  ${showDebug ? "" : "hidden"}`}
    >
          <ul>
            <li>Component: <span>simple text widget</span></li>
            <li><br/></li>
            <li>Content Name: <span>{context.Name}</span></li>
            <li>Content Type: <span>{context.Type}</span></li>
            <li>Content Path: <span>{context.Path}</span></li>
            <li>Content Lifespan: <span>{context.EnableLifespan?"true":"false"}</span></li>
            <li>Content ValidFrom: <span>{context.ValidFrom}</span></li>
            <li>Content ValidTill: <span>{context.ValidTill}</span></li>
            <li><br/></li>
            <li>Page Name: <span>{layout?.Name}</span></li>
            <li>Page Type: <span>{layout?.Type}</span></li>
            <li>Page Path: <span>{layout?.Path}</span></li>
            <li><br/></li>
            <li>Widget Name: <span>{props.widget.Name}</span></li>
            <li>Widget Type: <span>{props.widget.Type}</span></li>
            <li>Widget Path: <span>{props.widget.Path}</span></li>
          </ul>
    </div>
  </div>
)};
// ======================================== END OF DEBUG INFO ========================================


  return (
    // <div className="w3-col m9 w3-right">
      <div className="w3-row-padding w3-margin-bottom">
        <div className="w3-col m12">
          <div className="w3-card w3-round w3-white">
          {DebugView(query.get("debug"))}
            <div className="w3-container w3-padding widget-simpletext">
              <h1>{widget.Title}</h1>
              <div className="context-info">
                <div dangerouslySetInnerHTML={{ __html: widget.ComponentContent }}/>
              </div>
            </div>
          </div>
        </div>
      </div>
    // </div>
  );
}

export default SimpletTextComponent
