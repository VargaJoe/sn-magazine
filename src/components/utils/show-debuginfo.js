import React, { useState } from "react";
import { useLocation } from "react-router-dom";

const ShowDebugInfo = (title, context, currentPage, widget, layout) => {
  const [showDebug, setDebug] = useState(false);
  const handleToggle = () => {
    setDebug(!showDebug);
  };

  function useQuery() {
    const { search } = useLocation();

    return React.useMemo(() => new URLSearchParams(search), [search]);
  }
  const query = useQuery();
  const isDebug = query.get("debug");

  if (!isDebug || isDebug !== "true") return;

  function showContextInfo(context) {
    if (context !== undefined) {
      return (
        <ul>
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
          <li>
            <hr />
          </li>
        </ul>
      )
    }
  }

  function showWorkspaceInfo(context) {
    if (context !== undefined) {
      return (
        <ul>
          <li>
            Current Workspace Name:{" "}
            <span>
              {context.Type === "Workspace"
                ? context.Name
                : context.Workspace.Name}
            </span>
          </li>
          <li>
            Current Workspace Path:{" "}
            <span>
              {context.Type === "Workspace"
                ? context.Path
                : context.Workspace.Path}
            </span>
          </li>
          <li>
            <hr />
          </li>
        </ul>
      )
    }
  }

  function showPageInfo(currentPage, layout) {
    if (currentPage !== undefined) {
      return (
        <ul>
          <li>
            Page Name: <span>{currentPage?.Name}</span>
          </li>
          <li>
            Page Type: <span>{currentPage?.Type}</span>
          </li>
          <li>
            Page Path: <span>{currentPage?.Path}</span>
          </li>
          <li>
            Layout: <span>{layout}</span>
          </li>
          <li>
            <hr />
          </li>
        </ul>
      )
    }
  }

  function showWidgetInfo(widget) {
    if (widget !== undefined) {
      return (
        <ul>
          <li>
            Widget Name: <span>{widget?.Name}</span>
          </li>
          <li>
            Widget Type: <span>{widget?.Type}</span>
          </li>
          <li>
            Widget Path: <span>{widget?.Path}</span>
          </li>
          <li>
            Widget Component: <span>{widget?.ClientComponent}</span>
          </li>
          <li>
            Widget Query: <span>{widget?.ContentQuery}</span>
          </li>
          <li>
            Widget Context: <span>{widget?.ContextBinding}</span>
          </li>
          <li>
            Widget Custom Root: <span>{widget?.CustomRoot?.Path}</span>
          </li>
          <li>
            Widget Relative Path: <span>{widget?.RelativePath}</span>
          </li>
        </ul>
      )
    }
  }

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
            Component: <span>{title}</span>
          </li>
        </ul>
        <hr/>
        {showContextInfo(context)}
        {showWorkspaceInfo(context)}
        {showPageInfo(currentPage, layout)}
        {showWidgetInfo(widget)}
      </div>
    </div>
  );
};

export default ShowDebugInfo;
