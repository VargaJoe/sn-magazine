import ShowDebugInfo from "../utils/show-debuginfo"
import BindedContext from "../utils/context-binding"
import { useSnStore } from "../store/sn-store";

export function GenericWidget(props) {
  // const layout = props.page;
  // let context = props.data;
  const {context, layout} = useSnStore((state) => state);
  const widget = props.widget;
  const bindedContext = BindedContext(props, true);
  console.log('default widget', context.DisplayName, props, layout, context, widget);

  return (
    // <div className="w3-col m9 w3-right">
    <div className="w3-row-padding w3-margin-bottom">
      <div className="w3-col m12">
        <div className="w3-card w3-round w3-white">
        {ShowDebugInfo("default widget", context, layout, widget)}
          <div className="w3-container w3-padding">
            <h1>{context.DisplayName}</h1>
            <table className="w3-table-all">
              <tbody>
                <tr>
                  <th>Field Name</th>
                  <th>Field Value</th>
                </tr>
                {Object.keys(bindedContext.content).map((key, i) => {
                if (typeof bindedContext.content[key] !== 'object') {
                return ( 
                  <tr key={Math.floor(Math.random() * 100000)}>
                    <td >{key}</td>
                    <td>{bindedContext.content[key]?.toString()}</td>
                  </tr>
                )} else {return (
                  <tr  key={Math.floor(Math.random() * 100000)} className="hidden">
                    <td >{key}</td>
                    <td>{bindedContext.content[key]?.toString()}</td>
                  </tr>
                )}
                }
                )}
                </tbody>
              </table>
          </div>
        </div>
      </div>
    </div>
    // </div>
  );
}

export default GenericWidget;
