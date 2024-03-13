import { BreadcrumbListWidget } from "../widgets/manual-list-breadcrumb";
import { MenuListWidget } from "../widgets/manual-list-menu";
import { ShowComponentsByZone } from '../utils/add-component';
import { Link } from 'react-router-dom';
import { useSnStore } from "../store/sn-store";

export const ExploreLayout = (props) => {
  const {context, layout, widgets} = useSnStore((state) => state);
  console.log('%cexplore layout', "font-size:16px;color:green", { props: props }, { context: context}, { layout: layout}, { widgets: widgets });

  const sideboxes = <ShowComponentsByZone type="widgets" zone="side" widgets={widgets} />
  const components = <ShowComponentsByZone type="widgets" zone="content" widgets={widgets} />

  console.log('explore layout sideboxes', sideboxes);
  console.log('explore layout components', components);

  return (
    <div className="App w3-theme-l5">
      <div className="w3-top">
        <div className="w3-bar w3-theme-d2 w3-left-align w3-large">
          <a
            href="/"
            className="w3-bar-item w3-button w3-hide-medium w3-hide-large w3-right w3-padding-large w3-hover-white w3-large w3-theme-d2"
          >
            <i className="fa fa-bars"></i>
          </a>
          <Link to={'/'}
            className="w3-bar-item w3-button w3-padding-large w3-theme-d4"
          >
            <i className="fa fa-home w3-margin-right"></i>Logo
          </Link>
          <a
            href="/"
            className="w3-bar-item w3-button w3-hide-small w3-padding-large w3-hover-white"
            title="News"
          >
            <i className="fa fa-globe"></i>
          </a>
          <a
           href="mailto:info@sensenet.com"
           className="w3-bar-item w3-button w3-hide-small w3-padding-large w3-hover-white"
           title="Messages"
         >
           <i className="fa fa-envelope"></i>
         </a>
        </div>
      </div>

      <div
        id="navDemo"
        className="w3-bar-block w3-theme-d2 w3-hide w3-hide-large w3-hide-medium w3-large"
      >
      </div>
      
      {/* Page Container */}
      <div className="w3-container w3-content w3-content-custom pagetemplate-explore">
        {/* The Grid */}
        <div className="w3-row">
          {/* Left Column */}
          <div className="w3-col m3">
            <MenuListWidget data={null} page={null} widget={{
              ContextBinding: [ "currentcontext" ],
              ContentQuery: ".SORT:Name",
              ChildrenLevel: [ "child" ]
            }}/>
            <br/> 
            {sideboxes}
          </div>
          
          {/* End Left Column */}

          {/* Middle Column */}
          <div className="w3-col m7">
            <div className="w3-row-padding w3-margin-bottom pagetemplate-sign">
              <div className="w3-col m12">
                <div className="w3-card w3-round w3-white">
                  <div className="w3-container w3-padding">
                    <b>EXPLORE</b>
                  </div>
                </div>
              </div>
            </div>
            <BreadcrumbListWidget data={props.data} page={props.page} widget={{
              ContextBinding: [ "currentcontext" ],
              ChildrenLevel: [ "child" ]
            }}/>
            {components}
          </div>
          {/* End Middle Column */}

        </div>
        {/* End Grid */}
      </div>
      
      {/* End Page Container */}

      {/* Footer */}
      <footer className="w3-container w3-theme-d3 w3-padding-16">
        <h5>Footer</h5>
      </footer>

      <footer className="w3-container w3-theme-d5">
        <p>
          Powered by{" "}
          <a href="https://www.w3schools.com/w3css/default.asp" target="_blank" rel="noreferrer">
            w3.css
          </a>
        </p>
      </footer>
      {/* End Footer */}
    </div>
  );
}

export default ExploreLayout;
