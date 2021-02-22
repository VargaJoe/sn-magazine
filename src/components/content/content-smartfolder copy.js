import { useState, useEffect } from "react";
import { useRepository } from "@sensenet/hooks-react";

const DATA = require('../../config.json');

export function SmartFolderContent() {
  console.log("inside smartfolder");
  const repo = useRepository();
  const [data, setData] = useState();
  // // const [isDataFetched, setDataFetched] = useState();

  useEffect(() => {
    async function loadChildrenOfSmartfolder() {
      const result = await repo.loadCollection({
        path: `${DATA.dataPath}`,
        oDataOptions: {
          // query: "TypeIs:LeisureArticle AND NOT Type:LeisureArticle AND Hidden:0 .AUTOFILTERS:OFF",
          orderby: [['PublishDate', 'desc']],
          top: 5,
          select: "all", 
        },
      });
      setData(result.d.results);
      console.log(result);
    }
    loadChildrenOfSmartfolder();
  }, [repo]);
 

  // // if (data === undefined || data.length === 0) return <div>Loading...</div>;

  // if (!isDataFetched) {
  //   return null;
  // } 

  return (
    <>
      {/* Middle Column */}
      <div className="w3-col m9">
        <div className="w3-row-padding">
          <div className="w3-col m12">
            <div className="w3-card w3-round w3-white">
              <div className="w3-container w3-padding">
                <p>smartfolder</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <br />
      {/* End Middle Column */}
    </>
  );
}

export default SmartFolderContent;
