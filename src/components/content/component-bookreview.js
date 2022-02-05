import React, { useCallback, useEffect, useState } from "react";
import { useRepository } from "@sensenet/hooks-react";
import { addComponent } from "../utils/add-component";
import { useLocation } from "react-router-dom";

const DATA = require('../../config.json');

export function ContentCollectionComponent(props) {
  const repo = useRepository();
  const [widgetCollection, setCollection] = useState([]);
  const { search } = useLocation();

  console.log("contentcollection component");
  console.log(props);
  const currentPage = props.page
    ? props.page.filter((pcnt) => pcnt.Type === "Page")[0]
    : {};
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
          <li>
            Component: <span>book review component</span>
          </li>
          <li><br/></li>
          <li>
            Content Name: <span>{context.Name}</span>
          </li>
          <li>
            Content Type: <span>{context.Type}</span>
          </li>
          <li>
            Content Path: <span>{context.Path}</span>
          </li>
          <li>
            Content Lifespan:{" "}
            <span>{context.EnableLifespan ? "true" : "false"}</span>
          </li>
          <li>
            Content ValidFrom: <span>{context.ValidFrom}</span>
          </li>
          <li>
            Content ValidTill: <span>{context.ValidTill}</span>
          </li>
          <li><br/></li>
          <li>
            Page Name: <span>{currentPage?.Name}</span>
          </li>
          <li>
            Page Type: <span>{currentPage?.Type}</span>
          </li>
          <li>
            Page Path: <span>{currentPage?.Path}</span>
          </li>
          <li><br/></li>
          <li>
            Widget Name: <span>{props.widget.Name}</span>
          </li>
          <li>
            Widget Type: <span>{props.widget.Type}</span>
          </li>
          <li>
            Widget Path: <span>{props.widget.Path}</span>
          </li>
          <li>
            Widget Context: <span>{props.widget.ContextBinding}</span>
          </li>
          <li>
            Widget Custom Root: <span>{props.widget.CustomRoot?.Path}</span>
          </li>
        </ul>
      </div>
    </div>
  )};
  // ======================================== END OF DEBUG INFO ========================================

  console.log(props.widget.Name + " - " + props.widget.ContextBinding);
  if (props.widget.ContextBinding[0] === "customroot") {
    if (props.widget.CustomRoot !== undefined) {
      context = props.widget.CustomRoot;
    } else {
      console.log("customroot is not set");
    }
  }

  const loadContents = useCallback(async () => {
    const result = await repo.loadCollection({
      path: `${context.Path}`,
      oDataOptions: {
        orderby: ["Index", "DisplayName"],
        select: "all",
      },
    });
    if (result?.d?.results) {
      console.log(result);
      setCollection(result.d.results);
      // const View = importView(result.d.Type.toLowerCase());
      // setCompo(<View key={result.d.Id} />);
    } else {
      // const View = importView('missing');
      // setCompo(<View key={'1'} />);
    }
  }, [context, repo]);

  useEffect(() => {
    loadContents();
  }, [context, loadContents, repo]);

  let counter = 0;
  return (
    // <div className="w3-col m9 w3-right">
    <div className="w3-row-padding w3-margin-bottom">
      <div className="w3-col m12">
        <div className="w3-card w3-round w3-white">
        {DebugView(query.get("debug"))}
          <div className="w3-container w3-padding article-full">
            <h1>
              {context.DisplayName} 
            </h1>
            <div class="w3-row-padding w3-padding-16">
              <div class="w3-col m6">
                <img src={(process.env.REACT_APP_API_URL || DATA.apiUrl) + context.Image.Url} alt={context.DisplayName} className="article-cover"/>
              </div>
            </div>
            <div className="w3-container w3-padding-large w3-bottombar">
              <div dangerouslySetInnerHTML={{ __html: context.Body }}>
              </div>              
              <div className="small">{context.Author} ({context.Publisher}, <time datetime="1628016300000">{context.PublishDate}</time>)</div>
            </div>
            <div>
              {widgetCollection.map((child) => {
                return addComponent(
                  "content",
                  "content",
                  child.Type.toLowerCase(),
                  `${counter++}-${context.Id}-${child.Id}`,
                  child,
                  props.page,
                  child
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
    // </div>
  );
}

export default ContentCollectionComponent;
