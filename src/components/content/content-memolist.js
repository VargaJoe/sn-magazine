import { useEffect, useState } from 'react';
import { useRepository } from '@sensenet/hooks-react';

const DATA = require('../../config.json');

export const MemoListContent = () => {
  console.log('inside smartfolder');
  // const repo = useRepository();
  const [data, setData] = useState();

  // ide jonne useeffect-ben ay elemek betoltese

  return (
    <>
      {/* Middle Column */}
      <div className="w3-col m9">
        <div className="w3-row-padding">
          <div className="w3-col m12">
            <div className="w3-card w3-round w3-white">
              <div className="w3-container w3-padding">
                <p>memolist</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <br />
      {/* End Middle Column */}
    </>
  );
};

export default MemoListContent;
