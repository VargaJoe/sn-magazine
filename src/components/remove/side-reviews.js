import { useState, useEffect } from "react";
import { useRepository } from "@sensenet/hooks-react";

const DATA = require('../../config.json');

export const SideReviews = () => {
  const repo = useRepository();
  const [data, setData] = useState();
  
  useEffect(() => {
    async function loadChildrenOfSamplews() {
      const result = await repo.loadCollection({
        path: `${process.env.REACT_APP_DATA_PATH || DATA.dataPath}`,
        oDataOptions: {
          // query: "TypeIs:LeisureArticle AND NOT Type:LeisureArticle AND Hidden:0 .AUTOFILTERS:OFF",
				  orderby: [['PublishDate', 'desc']],
          top: 5,
          select: "all", 
        },
      });
      setData(result.d.results);
    }
    loadChildrenOfSamplews();
  }, [repo]);

  return (
    <>
    <div className="w3-card w3-round w3-white w3-center">
        <div className="w3-container">
          <p>Latest reviews:</p>
          {data?.map((child) => (        
          <div key={`sidereview-${child.Id}`}>
          <p><strong>{child.DisplayName}</strong></p>
          {/* <p>Friday 15:00</p> */}
          {/* <hr/> */}
          </div>
        ))}
        </div>
      </div>
      <br/>
      </>
  );
}
