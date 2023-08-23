import React, { useCallback, useEffect, useState } from "react";
import { useRepository } from "@sensenet/hooks-react";
import { addComponent } from '../utils/add-component';
import ShowDebugInfo from "../utils/show-debuginfo"

export function LeisureMangaTranslationContent(props) {
  const repo = useRepository();
  const [itemCollection, setCollection] = useState([]);
  const layout = props.page;
  let context = props.data;
  const widget = props.widget;

  console.log('leisure manga translation content', props, context);

  const loadContents = useCallback(async () => {
    const result = await repo.loadCollection({
      path: `/Root/Content/mangajanlo/manga`,
      oDataOptions: {
        query: `Translation:('${context.Id}')`,
        expand: 'Translation',
        select: 'all'
      },
    });
    if (result?.d?.results) {
      console.log('manga with translation: ', result);
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

  return (
    // <div className="w3-col m9 w3-right">
    <div className="w3-row-padding w3-margin-bottom">
      <div className="w3-col m12">
        <div className="w3-card w3-round w3-white">
        {ShowDebugInfo("leisure manga translation content", context, layout, widget)}
          <div className="w3-container w3-padding">
            <h1>{context.Id} {context.DisplayName}</h1>
            <div className="context-info">
              <div dangerouslySetInnerHTML={{ __html: context.Description }}/>
            </div>
            {itemCollection.map((child) => { 
                  return addComponent('widgets', 'nested','review-list-item', `${context.Id}-${child.Id}`, child, layout, child); 
                })}
          </div>
        </div>
      </div>
    </div>
    // </div>
  );
}

export default LeisureMangaTranslationContent
