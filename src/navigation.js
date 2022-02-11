import { PageWrapper } from './components/page-wrapper';
import { Missing } from './components/missing';

const Data = {
	public: [
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