import React, { useCallback, useEffect, useState } from "react";
import { useRepository } from "@sensenet/hooks-react";
import { addComponent } from "../utils/add-component";
import { useLocation } from "react-router-dom";
import Moment from 'moment';
import ShowDebugInfo from "../utils/show-debuginfo"

const DATA = require('../../config.json');

export function CustomBookReviewView(props) {
  const repo = useRepository();
  const [widgetCollection, setCollection] = useState([]);
  const { search } = useLocation();

  console.log("contentcollection component");
  console.log(props);
  const currentPage = props.page
    ? props.page.filter((pcnt) => pcnt.Type === "Page" || pcnt.Type === "Layout")[0]
    : {};
  let context = props.data;
  let widget = props.widget;
 
  console.log(widget.Name + " - " + widget.ContextBinding);
  if (widget.ContextBinding[0] === "customroot") {
    if (widget.CustomRoot !== undefined) {
      context = widget.CustomRoot;
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

  function newsImage () { 
    if (context.Image.Url === "") {
      return "";
    }

    return (
      <div className="w3-left w3-padding article-cover-outer">
        <div className="w3-col article-cover-inner">
          <img src={(process.env.REACT_APP_API_URL || DATA.apiUrl) + context.Image.Url} alt={context.DisplayName} className="w3-hover-opacity"/>
        </div>
      </div>
    );   
  };

  return (
    // <div className="w3-col m9 w3-right">
    <div className="w3-row-padding w3-margin-bottom">
      <div className="w3-col m12">
        <div className="w3-card w3-round w3-white">
        {ShowDebugInfo("book review widget", context, currentPage, widget)}
          <div className="w3-container w3-padding article-full">
            <h1>
              {context.DisplayName} 
            </h1>
            {newsImage()}
            <div className="w3-container w3-padding-large w3-bottombar">
              <div dangerouslySetInnerHTML={{ __html: context.Body }}/>
              <div className="small">{context.Author} ({context.Publisher}, {Moment(context.PublishDate).format('yyyy.MM.DD')})</div>
            </div>
            <div>
              {widgetCollection.map((child) => {
                return addComponent(
                  "content",
                  "content",
                  child.Type.toLowerCase(),
                  `${widget.Id}-${context.Id}-${child.Id}`,
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

export default CustomBookReviewView;
