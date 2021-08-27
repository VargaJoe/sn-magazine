import { SideMenu } from "../side-menu";
import { addComponent } from '../utils/add-component';

export const addComponentsByZone = (type, prefix, zone, context, page) => {

  if (page === undefined) {
    if (zone === null || zone === 'content') {
      return addComponent('content', 'content', context.Type.toLowerCase(), `err-${context.Id}`, context)
    } else {
      return null;
    }
  }

  return (
    page.filter(pcnt => pcnt.Type !== 'PageContainer' && pcnt.PortletZone === zone).map((child) => { 
      const compoType = child.ClientComponent === undefined || child.ClientComponent === null || child.ClientComponent === '' ? child.Type : child.ClientComponent;
      console.log('addcompo: '+compoType.toLowerCase())
      return addComponent(type, prefix, compoType.toLowerCase(), `${context.Id}-${child.Id}`, context, page, child);
    })
  );
};

export const VanillaPageTemplate = (props) => {
  console.log('pagetemplate: vanilla');
  console.log(props.data);

  const sideboxes = addComponentsByZone('content', 'side', 'side', props.data, props.page);
  const components = addComponentsByZone('content', 'component', null, props.data, props.page);

  console.log(components);

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
          <a
            href="/"
            className="w3-bar-item w3-button w3-padding-large w3-theme-d4"
          >
            <i className="fa fa-home w3-margin-right"></i>Logo
          </a>
          <a
            href="/"
            className="w3-bar-item w3-button w3-hide-small w3-padding-large w3-hover-white"
            title="News"
          >
            <i className="fa fa-globe"></i>
          </a>
          <a
            href="/"
            className="w3-bar-item w3-button w3-hide-small w3-padding-large w3-hover-white"
            title="Account Settings"
          >
            <i className="fa fa-user"></i>
          </a>
          <a
            href="/"
            className="w3-bar-item w3-button w3-hide-small w3-padding-large w3-hover-white"
            title="Messages"
          >
            <i className="fa fa-envelope"></i>
          </a>
          <div className="w3-dropdown-hover w3-hide-small">
            <button
              className="w3-button w3-padding-large"
              title="Notifications"
            >
              <i className="fa fa-bell"></i>
              <span className="w3-badge w3-right w3-small w3-green">3</span>
            </button>
            <div className="w3-dropdown-content w3-card-4 w3-bar-block w3-dropdown-content-custom">
              <a href="/" className="w3-bar-item w3-button">
                One new friend request
              </a>
              <a href="/" className="w3-bar-item w3-button">
                John Doe posted on your wall
              </a>
              <a href="/" className="w3-bar-item w3-button">
                Jane likes your post
              </a>
            </div>
          </div>
          <a
            href="/"
            className="w3-bar-item w3-button w3-hide-small w3-right w3-padding-large w3-hover-white"
            title="My Account"
          >
            <img
              src="/w3images/avatar2.png"
              className="w3-circle w2-circle-custom"
              alt="Avatar"
            />
          </a>
        </div>
      </div>

      <div
        id="navDemo"
        className="w3-bar-block w3-theme-d2 w3-hide w3-hide-large w3-hide-medium w3-large"
      >
        {/* <a href="#" className="w3-bar-item w3-button w3-padding-large">Link 1</a>
  <a href="#" className="w3-bar-item w3-button w3-padding-large">Link 2</a>
  <a href="#" className="w3-bar-item w3-button w3-padding-large">Link 3</a>
  <a href="#" className="w3-bar-item w3-button w3-padding-large">My Profile</a> */}
      </div>
      
      {/* Page Container */}
      <div className="w3-container w3-content w3-content-custom">        
        {/* The Grid */}
        <div className="w3-row">
          {/* Left Column */}
          <div className="w3-col m3">
            <SideMenu />
            <br/>
            {sideboxes}
          </div>
          
          {/* End Left Column */}

          {/* Middle Column */}
          {/* <div className="w3-col m7"> */}
             {components}
          {/* </div> */}
          {/* End Middle Column */}

          {/* Right Column */}
          {/* <div className="w3-col m2">
            <SideReviews />
            <SideTranslations />
          </div> */}
          {/* End Right Column */}
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

export default VanillaPageTemplate;
