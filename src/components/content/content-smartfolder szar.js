import { useState, useEffect } from "react";
import { useRepository } from "@sensenet/hooks-react";

export function SmartFolderContent() {
  console.log("inside smartfolder");
  const repo = useRepository();
  const [data, setData] = useState();
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
