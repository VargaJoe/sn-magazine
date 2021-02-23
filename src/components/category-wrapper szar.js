import React, { useRef, useState, useEffect } from "react";
import { useRepository } from "@sensenet/hooks-react";
import { useParams } from "react-router-dom";
import { SmartFolderContent } from "./content/content-smartfolder";
import { PlaceholderContent } from "./content/content-placeholder";

const DATA = require("../config.json");
const defaultComponent = "folder";


export const CategoryWrapper = (props) => {
  // const Compi = PlaceholderContent;

  const repo = useRepository();
  const [isDataFetched, setDataFetched] = useState();
  const [componentName, setComponentName] = useState();
  const [Compi, setCompi] = useState(PlaceholderContent);
  const { categoryName } = useParams();
  // const Compi = React.lazy(() => {
  //   componentName === undefined
  //     ? import("./content/content-placeholder")
  //     : import(`./content/content-${componentName.toLowerCase()}.js`)
  // });



  useEffect(() => {
    function addComponent(compo) {
      compo = compo.toLowerCase();
      console.log(`Loading ${compo} component in wrapper...`);
  
      import(`./content/content-${compo}.js`).then((compo) => {
        console.log(compo.default);
        // setCompo(compo.default);
        setCompi(compo.default);
        console.log("$$$$$")
        console.log(Compi);
        // Compi = compo.default;
        console.log(Compi);
        console.log("$$$$$")
      });
      // .catch(error => {
      //  console.error(`"${compo}" not yet supported`);
      //   // if (compo !== defaultComponent) {
      //   //   console.log(`fallback to ${defaultComponent} component`);
      //   //   addComponent(defaultComponent)
      //   // }
      // });
    }

    async function loadContent() {
      console.log(`category wrapper start of useeffect: ${categoryName}`);
      await repo
        .load({
          idOrPath: `${DATA.dataPath}/${categoryName}`,
          oDataOptions: {
            select: "all",
          },
        })
        .then((result) => {
          console.log(`category wrapper useeffect got result:`);
          console.log(result.d.Type);
          setDataFetched(true);
          setComponentName(result.d.Type.toLowerCase());
          addComponent(result.d.Type);
        })
        .catch((error) => {
          console.log(`category wrapper useeffect result failed`);
          setDataFetched(true);
          setComponentName("missing");
          // addComponent("missing");
        });
    }

    loadContent();
  }, [categoryName, repo]);


  
  // console.log(`category wrapper body`);
  // console.log(componentName);
  // console.log(Compi);
  if (!isDataFetched) {
    return null;
  } 
  else if (componentName === undefined){
    return null;
  } 
  // else {
  //   console.log(componentName);
    console.log(Compi);
  // }

  if (Compi === undefined) {
    console.log("Compi undefined");
    return <div>Loading...</div>;
  }

  // if (Compi.default === PlaceholderContent.default && componentName !== undefined){
  //   console.log("placeholder!!!");
  //   addComponent(componentName);
  // }

  return (
    <>
      {/* <i className="fa fa-pencil fa-fw w3-margin-right w3-text-theme"></i>  */}
      {/* {categoryName}
            {console.log(data.Name)}
            {data.DisplayName} */}
      {/* {dynacompo} */}
      {/* <SmartFolderContent/> */}
      qwe
      {/* {Compi} */}
      <Compi/> 
      
    </>
  );
};
