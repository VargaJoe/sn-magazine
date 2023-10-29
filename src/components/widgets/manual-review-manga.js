import React, { useCallback, useEffect, useState } from "react";
import { useRepository } from "@sensenet/hooks-react";
import { addComponent } from "../utils/add-component";
import Moment from 'moment';
import ShowDebugInfo from "../utils/show-debuginfo"
// Todo: use bindedcontext but enhance it to load expanded content only, not children

const DATA = require('../../config.json');

// Todo: rename manual-list-manga to be consistent
export function CustomBookReviewView(props) {
  const repo = useRepository();
  const [expContext, setExpContext] = useState([]);
  
  console.log("contentcollection component");
  console.log(props);
  const layout = props.page;
  let context = props.data;
  const widget = props.widget;
 
  console.log(widget.Name + " - " + widget.ContextBinding);
  if (widget.ContextBinding[0] === "customroot") {
    if (widget.CustomRoot !== undefined) {
      context = widget.CustomRoot;
    } else {
      console.log("customroot is not set");
    }
  }

  // todo: maybe should load only related content, context already in?
  const loadContent = useCallback(async () => {
    const contextPathWorkaround = context.Path.replace("(", "%28").replace(")", "%29");
    await repo.load({
      idOrPath: `${contextPathWorkaround}`,
      oDataOptions: {
        select: 'all',
        expand: 'RelatedContent, Translation'
      },
    }).then(result => {
      if (result?.d?.Type) {
        console.log('review extended context:');
        console.log(result.d);
        setExpContext(result.d);
      };
    })
    .catch(error => {
      //
    });
  }, [context, repo]);

  useEffect(() => {
    loadContent();
  }, [context, loadContent, repo]);

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

  function relatedContents (collection, title) { 
    if (collection === undefined 
      ) {
      return "";
    }
    console.log('related components: ', collection, title);
    if (collection.length > 0) {      
      const renderLinks = collection.map((child) => {
        console.log('related components item: ', child);
        return addComponent(
          "widgets",
          "nested",
          `review-related-${child.Type.toLowerCase()}`,
          `${widget.Id}-${context.Id}-${child.Id}`,
          child,
          props.page,
          widget
        );
      })

      return (
        <div>
          <div className="w3-padding">
          <h4>{title}</h4>
          </div>
          {renderLinks}
        </div>
      )
    }
  };
    

  return (
    // <div className="w3-col m9 w3-right">
    <div className="w3-row-padding w3-margin-bottom">
      <div className="w3-col m12">
        <div className="w3-card w3-round w3-white">
        {ShowDebugInfo("book review widget", context, layout, widget)}
          <div className="w3-container w3-padding article-full">
            <h1>
              {context.DisplayName} 
            </h1>
            <h2>
              {context.Subtitle} 
            </h2>
            {newsImage()}
            <div className="w3-container w3-padding-large w3-bottombar">
              <div className="w3-margin-top italic" dangerouslySetInnerHTML={{ __html: context.Description }}/>
              <div className="italic" dangerouslySetInnerHTML={{ __html: context.Lead }}/>
              <div dangerouslySetInnerHTML={{ __html: context.Body }}/>
              <div className="small">{context.Author} ({context.Publisher}, {Moment(context.PublishDate).format('yyyy.MM.DD')})</div>
            </div>
            <div>
              {relatedContents(expContext?.Translation, "Fordítások")}
            </div>
            <div>
              {relatedContents(expContext?.RelatedContent, "Kapcsolódó linkek")}
            </div>
          </div>
        </div>
      </div>
    </div>
    // </div>
  );
}

export default CustomBookReviewView;
