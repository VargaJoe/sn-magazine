import React, { useState, useEffect } from "react";
import { useRepository } from "@sensenet/hooks-react";
import { useParams } from 'react-router-dom';

const DATA = require('../config.json');
const defaultComponent = 'folder';

export const ContentWrapper = (props) => {
  const repo = useRepository();
  // const [data, setData] = useState();
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
        idOrPath: `${DATA.dataPath}/${categoryName}`,
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

    async function addComponent(compo) {
      compo = compo.toLowerCase();
      console.log(`Loading ${compo} component in wrapper...`);
      
      await import(`./content/content-${compo}.js`)
        .then(compo => {
          console.log(compo.default);
          setCompo(compo.default);
          }
        )
        // .catch(error => {
        //  console.error(`"${compo}" not yet supported`);
        //   // if (compo !== defaultComponent) {
        //   //   console.log(`fallback to ${defaultComponent} component`);
        //   //   addComponent(defaultComponent)
        //   // }
        // });
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
    <>
      {/* <i className="fa fa-pencil fa-fw w3-margin-right w3-text-theme"></i>  */}
      {/* {categoryName}
            {console.log(data.Name)}
            {data.DisplayName} */}
      {dynacompo}
    </>
  );
}
