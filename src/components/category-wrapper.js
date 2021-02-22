import React, { useEffect, useState } from 'react';
import { useRepository } from '@sensenet/hooks-react';
import { useParams } from 'react-router-dom';

const DATA = require('../config.json');

const defaultComponent = 'folder';

export const CategoryWrapper = () => {
  const repo = useRepository();
  // const [data, setData] = useState();
  const [isDataFetched, setDataFetched] = useState();
  const [dynacompo, setCompo] = useState();
  const { categoryName } = useParams();
  // const prevProps = useRef(props);

  useEffect(() => {
    const addComponent = async (compo) => {
      const compoLower = compo.toLowerCase();
      console.log(`Loading ${compo} component...`);

      import(`./content/content-${compoLower}.js`)
        .then((data) => {
          console.log(data.default);
          setCompo(data.default);
        })
        .catch(() => {
          console.error(`"${compo}" not yet supported`);
          if (compo !== defaultComponent) {
            console.log(`fallback to ${defaultComponent} component`);
            // addComponent(defaultComponent);
          }
        });
    };
    const loadContent = async () => {
      const result = await repo.load({
        idOrPath: `${DATA.dataPath}/${categoryName}`,
        oDataOptions: {
          select: 'all',
        },
      });
      if (result?.d?.Type) {
        addComponent(result.d.Type);
        setDataFetched(true);
      } else {
        addComponent('missing');
      }
      // setData(result.d);
    };

    loadContent();
  }, [categoryName, repo]);

  if (!isDataFetched) {
    return null;
  }

  if (dynacompo === undefined || dynacompo.length === 0) return <div>Loading...</div>;

  return <div>{dynacompo}</div>;
};
