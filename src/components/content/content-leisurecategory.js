import React, { useState, useEffect } from "react";
import { useRepository } from "@sensenet/hooks-react";
import { useParams } from 'react-router-dom';

const DATA = require('../../config.json');
const defaultComponent = 'folder';

export function LeisureCategoryContent() {
  // const repo = useRepository();
  // const [data, setData] = useState();
  // const [isDataFetched, setDataFetched] = useState();
  // const [dynacompo, setCompo] = useState();
  // // const [catName, setCategory] = useState();
  // const { categoryName } = useParams();
  //const { articleName } = useParams();
  // // const prevProps = useRef(props);

  // useEffect(() => {
    // console.log("second useeffect");
    // async function loadChildren() {
    //   // const result = 
    //   await repo.loadCollection({
    //     path: `${DATA.dataPath}`,
    //     oDataOptions: {
    //       // query: "TypeIs:LeisureCategory AND Hidden:0 .AUTOFILTERS:OFF",
    //       query: `TypeIs:${DATA.articleType} AND Hidden:0 .AUTOFILTERS:OFF`,
    //       orderby: ['DisplayName'],
		// 		  // orderby: ['PublishDate', 'DisplayName'],
    //       select: "all", 
    //     },
    //   });
    //   // setData(result.d.results);
    //   // console.log(data);
    // }
    // loadChildren();
//  }, [repo]);

  // if (!isDataFetched) {
  //   return null;
  // } 

  // console.log(categoryName);

  // if (dynacompo === undefined) {
  //   console.log("dynacompo");
  //   console.log(dynacompo);
  //   addComponent("dynacomp");
  // }

  // if (dynacompo === undefined || dynacompo.length === 0) return <div>Loading...</div>;
  
  return (
    <>
      {/* Middle Column */}
      <div className="w3-col m7">
        {/* {dynacompo} */}
        <div className="w3-row-padding">
          <div className="w3-col m12">
            <div className="w3-card w3-round w3-white">
              <div className="w3-container w3-padding">
                <p>category view</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <br/>
      {/* End Middle Column */}

      {/* Right Column */}
      <div className="w3-col m2">
        
      </div>
      {/* End Right Column */}
    </>
  );
}

export default LeisureCategoryContent
