// import Home from './Home';
import { ContentIntro } from './components/content-intro';
import { PageWrapper } from './components/page-wrapper';
import { Missing } from './components/missing';

const Data = {
	public: [
		// {
		// 	exact: true,
		// 	path: '/',
		// 	component: ContentIntro
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