import React, { useCallback, useEffect, useState } from "react";
import { useRepository } from "@sensenet/hooks-react";
import { addComponent } from "../utils/add-component";
import Moment from 'moment';
import ShowDebugInfo from "../utils/show-debuginfo"
import BindedContext from "../utils/context-binding"
import { useSnStore } from "../store/sn-store";

// Todo: use bindedcontext but enhance it to load expanded content only, not children

const DATA = require('../../config.json');

export function SimpleReviewWidget(props) {
  console.log('%cSimpleReview', "font-size:16px;color:green", { props: props });
  const repo = useRepository();
  const [expContext, setExpContext] = useState([]);
  
  // const layout = props.page;
  // let context = props.data;
  const {context, page, layout} = useSnStore((state) => state);
  const widget = props.widget;
  const bindedContext = BindedContext(props, true);

  // console.log(widget.Name + " - " + widget.ContextBinding);
  // if (widget.ContextBinding[0] === "customroot") {
  //   if (widget.CustomRoot !== undefined) {
  //     context = widget.CustomRoot;
  //   } else {
  //     console.log("customroot is not set");
  //   }
  // }

  // todo: maybe should load only related content, context already in?
  const loadContent = useCallback(async () => {
    const contextPathWorkaround = bindedContext.content.Path.replace("(", "%28").replace(")", "%29");
    await repo.load({
      idOrPath: `${contextPathWorkaround}`,
      oDataOptions: {
        select: 'all',
        expand: 'RelatedContent'
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
  }, [bindedContext, repo]);

  useEffect(() => {
    loadContent();
  }, [bindedContext, loadContent, repo]);

  function newsImage () { 
    if (bindedContext.content.Image?.Url === "") {
      return "";
    }

    console.log("!!!!!newsImage", bindedContext.content);
    return (
      <div className="w3-left w3-padding article-cover-outer">
        <div className="w3-col article-cover-inner">
          <img src={(process.env.REACT_APP_API_URL || DATA.apiUrl) + bindedContext.content.Image?.Url} alt={bindedContext.content.DisplayName} className="w3-hover-opacity"/>
        </div>
      </div>
    );   
  };

  function relatedContents (cont) { 
    if (cont?.RelatedContent === undefined 
      ) {
      return "";
    }

    const renderLinks = expContext.RelatedContent.map((child) => {
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

    if (expContext?.RelatedContent?.length > 0) {      
      return (
        <div className="related-contents">
          <div className="w3-padding">
          <h4>Kapcsolódó linkek</h4>
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
        {ShowDebugInfo("book review widget", bindedContext, page, widget, layout)}
          <div className="w3-container w3-padding article-full">
            <h1>
              {bindedContext.content.DisplayName} 
            </h1>
            <h2>
              {bindedContext.Subtitle} 
            </h2>
            {newsImage()}
            <div className="w3-container w3-padding-large w3-bottombar">
              <div className="w3-margin-top italic" dangerouslySetInnerHTML={{ __html: bindedContext.content.Description }}/>
              <div className="italic" dangerouslySetInnerHTML={{ __html: bindedContext.content.Lead }}/>
              <div dangerouslySetInnerHTML={{ __html: bindedContext.content.Body }}/>
              <div className="small">{bindedContext.content.Author} ({bindedContext.content.Publisher}, {Moment(bindedContext.content.PublishDate).format('yyyy.MM.DD')})</div>
            </div>
            {relatedContents(expContext)}
          </div>
        </div>
      </div>
    </div>
    // </div>
  );
}

export default SimpleReviewWidget;
