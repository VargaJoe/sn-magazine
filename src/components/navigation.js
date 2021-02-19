// import Home from './Home';
import { ContentIntro } from './content-intro';
import { ContentWrapper } from './content-wrapper';
// import Category from './Category';
// import Translateds from './Translateds';
import { Missing } from './missing';

const Data = {
	public: [
		{
			exact: true,
			path: '/asd',
			component: ContentWrapper
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