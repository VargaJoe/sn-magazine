// import Home from './Home';
import { ContentIntro } from './components/content-intro';
import { CategoryWrapper } from './components/category-wrapper';
import { ContentWrapper } from './components/content-wrapper';
// import Category from './Category';
// import Translateds from './Translateds';
import { Missing } from './components/missing';

const Data = {
	public: [
		{
			exact: true,
			path: '/',
			component: ContentIntro
		},
		{
			exact: true,
			path: '/*',
			component: CategoryWrapper
		},
		{
			component: Missing
		}
	]
};

export default Data;