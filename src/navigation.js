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
			path: '/*',
			component: CategoryWrapper
		},
		{
			exact: true,
			path: '/:categoryName',
			component: CategoryWrapper
		},
		{
			exact: true,
			path: '/:categoryName/:articleName',
			component: ContentWrapper
		},
		// {
		// 	exact: true,
		// 	path: '/Fordítások',
		// 	component: Translateds
		// },
		// {
		// 	exact: true,
		// 	path: '/:categoryName',
		// 	component: Category
		// },
		{
			exact: true,
			path: '/',
			component: ContentIntro
		},
		{
			component: Missing
		}
	]
};

export default Data;