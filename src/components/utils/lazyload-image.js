import LazyLoad from 'react-lazyload';

// export const LazyImage = (src, alt, className) => {
//   console.log('add lazy image: ', src);
//   return (
//     <LazyLoad>
//       <img src={src} alt={alt} className={className}/>
//     </LazyLoad>
//   );
// };

export function LazyImage (props) {
  console.log('add lazy image: ', props.src);
  return (
    <LazyLoad>
      <img src={props.src} alt={props.alt} className={props.className}/>
    </LazyLoad>
  );
};

export default LazyImage