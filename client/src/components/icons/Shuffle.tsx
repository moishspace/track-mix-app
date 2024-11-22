import React from 'react';

const ShuffleIcon = (props: any) => (
  <svg
    height="1em"
    width="1em"
    viewBox="0 0 64 64"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M20 20L44 44M44 20L20 44"
      stroke="white"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default ShuffleIcon;