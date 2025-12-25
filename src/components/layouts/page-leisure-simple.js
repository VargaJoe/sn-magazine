import React, { useRef, useEffect } from 'react';
import { addComponentsByZone } from '../utils/add-component';
import { useSnStore } from "../store/sn-store";
import { shallow } from 'zustand/shallow';

export const LeisureSimpleLayout = React.memo((props) => {
  const {context, layout, widgets} = useSnStore((state) => ({ context: state.context, layout: state.layout, widgets: state.widgets }), shallow);

  // Deep comparison debug
  const prevRef = useRef({ props: null, context: null, layout: null, widgets: null });
  useEffect(() => {
    const prev = prevRef.current;
    const deepChanged =
      JSON.stringify(prev.props) !== JSON.stringify(props) ||
      JSON.stringify(prev.context) !== JSON.stringify(context) ||
      JSON.stringify(prev.layout) !== JSON.stringify(layout) ||
      JSON.stringify(prev.widgets) !== JSON.stringify(widgets);
    if (deepChanged) {
      console.log('%c[LeisureSimpleLayout] Deep change detected', 'color:purple;font-weight:bold', {
        prevProps: prev.props, currProps: props,
        prevContext: prev.context, currContext: context,
        prevLayout: prev.layout, currLayout: layout,
        prevWidgets: prev.widgets, currWidgets: widgets
      });
    } else {
      console.log('%c[LeisureSimpleLayout] No deep change', 'color:purple', {
        prevProps: prev.props, currProps: props,
        prevContext: prev.context, currContext: context,
        prevLayout: prev.layout, currLayout: layout,
        prevWidgets: prev.widgets, currWidgets: widgets
      });
    }
    prevRef.current = { props, context, layout, widgets };
  });

  console.log('%cleisure-simple layout render', "font-size:16px;color:green", { contextId: context?.Id, widgetsCount: widgets?.length });
  
  const sideboxes = addComponentsByZone('widgets', 'side', null, null, widgets);
  const components = addComponentsByZone('widgets', 'content', null, null, widgets);

  return (
    <div className="App w3-theme-l5">
      {/* Page Container */}
      <div className="w3-container w3-content w3-content-custom pagetemplate-custom">
        {/* The Grid */}
        <div className="w3-row layout-container">
          {/* Left Column */}
          <div className="w3-col m2 layout-left">
            {sideboxes}
          </div>
          {/* End Left Column */}

          {/* Middle Column */}
          <div className="w3-col m9 layout-middle">
            <div className="w3-row-padding w3-margin-bottom pagetemplate-sign">
              <div className="w3-col m12">
                <div className="w3-card w3-round w3-white">
                  <div className="w3-container w3-padding">
                    <b>Leisure Simple Layout</b>
                  </div>
                </div>
              </div>
            </div>
            {components}
          </div>
          {/* End Middle Column */}

          {/* Right Column */}
          {/* <div className="w3-col m2">
          </div> */}
          {/* End Right Column */}
        </div>
        {/* End Grid */}
      </div>
      
      {/* End Page Container */}

      {/* Footer */}
      <footer className="w3-container w3-theme-d5">
        <p>
          Powered by <a href="https://sensenet.com" target="_blank" rel="noreferrer">sensenet</a>, <a href="https://reactjs.org/" target="_blank" rel="noreferrer">react</a> and <a href="https://www.w3schools.com/w3css/default.asp" target="_blank" rel="noreferrer">w3.css</a>
        </p>
      </footer>
      {/* End Footer */}
    </div>
  );
});

export default LeisureSimpleLayout;
