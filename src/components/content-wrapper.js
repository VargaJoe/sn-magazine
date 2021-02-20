import React, { useState, useEffect } from "react";
import { useRepository } from "@sensenet/hooks-react";
import { useParams } from 'react-router-dom';

const defaultComponent = 'folder';
export const ContentWrapper = (props) => {
  const repo = useRepository();
  const [data, setData] = useState();
  const [isDataFetched, setDataFetched] = useState();
  const [dynacompo, setCompo] = useState();
  // const [catName, setCategory] = useState();
  const { categoryName } = useParams();
  // const prevProps = useRef(props);

  // console.log("props:");
  // console.log(props);

  useEffect(() => {   
    async function loadContent() {
      // const result = 
      await repo.load({
        idOrPath: `/Root/Content/mangajanlo/${categoryName}`,
        oDataOptions: {
          select: "all", 
        },
      }).then(result => {
        addComponent(result.d.Type);
      })
      .catch(error => {
        addComponent("missing");
      });
      // setData(result.d);
      setDataFetched(true);

      // console.log("result");
      // console.log(result);

      // addComponent(result.d.Type);
    }    
    loadContent();

    async function addComponent(type) {
      console.log(`Loading ${type} component...`);
      
      import(`./content/content-${type}.js`)
        .then(compo => {
          console.log(compo.default);
          setCompo(compo.default);
          }
        )
        .catch(error => {
          console.error(`"${type}" not yet supported`);
          if (type !== defaultComponent) {
            console.log(`fallback to ${defaultComponent} component`);
            addComponent(defaultComponent)
          }
        });
    };
    
  }, [categoryName, repo]);

  if (!isDataFetched) {
    return null;
  } 

  // console.log(categoryName);

  // if (dynacompo === undefined) {
  //   console.log("dynacompo");
  //   console.log(dynacompo);
  //   addComponent("dynacomp");
  // }

  if (dynacompo === undefined || dynacompo.length === 0) return <div>Loading...</div>;
  
  return (
    <div>
      {/* <i className="fa fa-pencil fa-fw w3-margin-right w3-text-theme"></i>  */}
      {/* {categoryName}
            {console.log(data.Name)}
            {data.DisplayName} */}
      {dynacompo}
    </div>
  );
}
