import { SideMenu } from "../side-menu";
import { addComponent } from '../utils/add-component';


export const EmptyPageTemplate = (props) => {
  console.log('pagetemplate: empty');
  console.log(props.data);

  const components = props.page.filter(pcnt => pcnt.Type !== 'PageContainer').map((child) => { 
    const compoType = child.ClientComponent === undefined || child.ClientComponent === null || child.ClientComponent === '' ? child.Type : child.ClientComponent;
    console.log('addcompo: '+compoType.toLowerCase())
    return addComponent('content', 'component', compoType.toLowerCase(), `${props.data.Id}-${child.Id}`, props.data, props.page, child); 
  })
  console.log(components);

  return null;
}

export default EmptyPageTemplate;
