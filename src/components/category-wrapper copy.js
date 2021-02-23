import React, { lazy, useState, useEffect } from "react";
import { useRepository } from "@sensenet/hooks-react";
import { useParams } from "react-router-dom";
import { SmartFolderContent } from "./content/content-smartfolder";
import { PlaceholderContent } from "./content/content-placeholder";

const DATA = require("../config.json");
const defaultComponent = "folder";

export const CategoryWrapper = (props) => {
  const repo = useRepository();
  // const [data, setData] = useState();
  const [isDataFetched, setDataFetched] = useState();
  const [componentName, setComponentName] = useState();
  const [dynacompo, setCompo] = useState(<PlaceholderContent/>);
  const [Compi, setCompi] = useState(<PlaceholderContent/>);
  // const [catName, setCategory] = useState();
  const { categoryName } = useParams();
  // const prevProps = useRef(props);

  // console.log("props:");
  // console.log(props);

  async function addComponent(compo) {
    compo = compo.toLowerCase();
    console.log(`Loading ${compo} component in wrapper...`);

    await import(`./content/content-${compo}.js`).then((compo) => {
      console.log(compo.default);
      // setCompo(compo.default);
      setCompi(compo.default);
    });
    // .catch(error => {
    //  console.error(`"${compo}" not yet supported`);
    //   // if (compo !== defaultComponent) {
    //   //   console.log(`fallback to ${defaultComponent} component`);
    //   //   addComponent(defaultComponent)
    //   // }
    // });
  }

  async function getComponent(compo) {
    compo = compo.toLowerCase();
    console.log(`Loading ${compo} component in function...`);

    return await import(`./content/content-${compo}.js`)
  }

  useEffect(() => {
    async function loadContent() {
      console.log(`category wrapper start of useeffect: ${categoryName}`);
      // const result =
      await repo
        .load({
          idOrPath: `${DATA.dataPath}/${categoryName}`,
          oDataOptions: {
            select: "all",
          },
        })
        .then((result) => {
          console.log(`category wrapper useeffect got result:`);
          // console.log(result);
          console.log(result.d.Type);
          setDataFetched(true);
          setComponentName(result.d.Type);
          // if (dynacompo === undefined) {
          //   console.log("before");
          //   console.log(dynacompo);
            addComponent(result.d.Type);
          // }
        })
        .catch((error) => {
          console.log(`category wrapper useeffect result failed`);
          setDataFetched(true);
          setComponentName("missing");
          // addComponent("missing");
        });
      // setData(result.d);
      // setDataFetched(true);

      // console.log("result");
      // console.log(result);

      // addComponent(result.d.Type);
    }

    // async function loadChildren() {
    //   await repo.loadCollection({
    //     path: `${DATA.dataPath}`,
    //     oDataOptions: {
    //       // query: "TypeIs:LeisureArticle AND NOT Type:LeisureArticle AND Hidden:0 .AUTOFILTERS:OFF",
    //       orderby: [["PublishDate", "desc"]],
    //       top: 5,
    //       select: "all",
    //     },
    //   })
    //   .then((result) => {
    //     console.log(result);
    //   })
    //   .catch((error) => {
        
    //   });;
    //   // setsfData(sfresult.d.results);
    // }
    loadContent();
    // loadChildren();
  }, [categoryName, dynacompo, repo]);

  console.log(`category wrapper body`);
  console.log(componentName);
  console.log(dynacompo);
  let compi = PlaceholderContent;
  // let Compi = PlaceholderContent;
  if (!isDataFetched) {
    return null;
  } else if (componentName === undefined){
    return null;
  } else {
    console.log(componentName);
    console.log(dynacompo);
    //  if (dynacompo === undefined) {
            // console.log("before");
            // console.log(dynacompo);
            // addComponent(componentName);
          // } else {
          //   addComponent("missing");
          // }

          // compo = compo.toLowerCase();
          // console.log(`Loading ${compo} component in wrapper...`);
      
  
    console.log("compi");
    getComponent(componentName)
    .then((compo) => {
      console.log("compo");
      console.log(compo);
      console.log(compo.default);
      compi = compo.default;
      // Compi = compo.default;
      // setCompo2(compo.default);
    });
    
    console.log(compi);
    console.log(Compi);
  }
  console.log(compi);
  if (compi === undefined) {
    console.log("Compi undefined");
    return <div>Loading...</div>;
  }

  // console.log(categoryName);

  // if (dynacompo === undefined) {
  //   console.log("dynacompo");
  //   console.log(dynacompo);
  //   addComponent("dynacomp");
  // }

  // if (dynacompo === undefined || dynacompo.length === 0)
  //   return <div>Loading...</div>;


  // console.log("category wrapper lazy load");
  // const Dyn = lazy(() => import(`./content/content-${componentName}.js`));
  // console.log(Dyn);

  return (
    <>
      {/* <i className="fa fa-pencil fa-fw w3-margin-right w3-text-theme"></i>  */}
      {/* {categoryName}
            {console.log(data.Name)}
            {data.DisplayName} */}
      {/* {dynacompo} */}
      {/* <SmartFolderContent/> */}
      {/* <Dyn/> */}
      asd
      {compi}
      qwe
      <Compi/>
      xzc
      {/* <Dynacompo/> */}
    </>
  );
};
