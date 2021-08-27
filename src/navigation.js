// import Home from './Home';
import { ContentIntro } from './components/content-intro';
// import { CategoryWrapper } from './components/category-wrapper';
// import { ContentWrapper } from './components/content-wrapper';
// import VanillaPageTemplate from "./components/page-templates/page-vanilla";
import { PageWrapper } from './components/page-wrapper';
// import Category from './Category';
// import Translateds from './Translateds';
import { Missing } from './components/missing';

const Data = {
	public: [
		// {
		// 	exact: true,
		// 	path: '/',
		// 	component: ContentIntro
		// },
		// {
		// 	exact: true,
		// 	path: '/*',
		// 	component: CategoryWrapper
		// },
		{
			exact: true,
			path: '/*',
			component: PageWrapper
		},
		{
			component: Missing
		}
	]
};

export default Data;