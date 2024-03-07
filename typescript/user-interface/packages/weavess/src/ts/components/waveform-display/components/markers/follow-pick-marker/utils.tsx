import React from 'react';

export const useMousePosition = () => {
  const [mousePosition, setMousePosition] = React.useState({ x: null, y: null });
  React.useEffect(() => {
    const updateMousePosition = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };
    window.addEventListener('mousemove', updateMousePosition);
    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
    };
  }, []);
  return mousePosition;
};
