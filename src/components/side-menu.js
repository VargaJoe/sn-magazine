import { useState, useEffect } from "react";
import { useRepository } from "@sensenet/hooks-react";

export const SideMenu = () => {
  const repo = useRepository();
  const [data, setData] = useState();
  
  useEffect(() => {
    async function loadChildrenOfSamplews() {
      const result = await repo.loadCollection({
        path: `/Root/Content/SampleWorkspace`,
        oDataOptions: {
          select: "all", 
        },
      });
      setData(result.d.results);
    }
    loadChildrenOfSamplews();
  }, [repo]);

  return (
    <div className="w3-card w3-round w3-white">
      <div className="w3-container">
      <h4 className="w3-center">Side menu</h4>
      {/* <p className="w3-center"><img src="/w3images/avatar3.png" className="w3-circle w3-circle-side-avatar" alt="Avatar" /></p> */}
      <hr/>
      <div className="side-menu-uppercase">
        {data?.map((child) => (        
          <p>
            {/* <i className="fa fa-pencil fa-fw w3-margin-right w3-text-theme"></i>  */}
            {child.DisplayName}
          </p>
        ))}
      </div>
      {/* <p><i className="fa fa-home fa-fw w3-margin-right w3-text-theme"></i> London, UK</p>
      <p><i className="fa fa-birthday-cake fa-fw w3-margin-right w3-text-theme"></i> April 1, 1988</p> */}
      </div>
    </div>
  );
}
