import {
  useOidcAuthentication,
} from "@sensenet/authentication-oidc-react";
import ShowDebugInfo from "../utils/show-debuginfo"
import { useSnStore } from "../store/sn-store";

export function LoginWidget(props) {
  console.log('%cLogin', "font-size:16px;color:green", { props: props });
  // const layout = props.page;
  // const context = props.data;
  const widget = props.widget;
  const {context, page, layout} = useSnStore((state) => state);

  const { oidcUser, login, logout } = useOidcAuthentication();
  const button = oidcUser ? <button onClick={logout}>Logout</button> : <button onClick={login}>Login</button>;

  return (
    <div className="w3-card w3-round w3-white w3-margin-bottom">
    {ShowDebugInfo("login", context, page, widget, layout)}
    <div className="w3-container">
      <div className="side-menu-uppercase">
        <p>
          {button}
        </p>
      </div>
    </div>
  </div>
  );
}

export default LoginWidget
